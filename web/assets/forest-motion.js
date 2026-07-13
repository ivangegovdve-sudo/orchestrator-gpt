/* ═══════════════════════════════════════════════════════════════
   FOREST MOTION — shared motion runtime for sdforest.site
   ---------------------------------------------------------------
   Dependency-free. Provides:
     · uMouse   — intelligent pointer (dot + halo, pointer state
                  exported so page particle systems can bend/attract)
     · uClick   — click pulse ripple
     · Iris     — reel-aperture page transition (out on portal exit,
                  in on arrival)
     · Reveal   — IntersectionObserver-driven [data-fm-reveal] system
     · Presets  — 13 per-portal canvas motion systems, used both as
                  full-screen "portal opening" intros and as looping
                  ambient vignettes  (canvas[data-fm-ambient="name"])
   Auto-init via its own <script> tag:
     <script src="/web/assets/forest-motion.js"
             data-theme="life-in-time"   → sets [data-forest-theme]
             data-preset="rings"         → page's motion preset
             data-portal-open            → play intro overlay on load
             data-cursor                 → mount uMouse/uClick
             data-iris></script>         → iris-wipe internal links
   Honors prefers-reduced-motion (everything soft-disabled) and
   coarse pointers (no custom cursor). No content is ever touched.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var doc = document, win = window;
  var TAU = Math.PI * 2;
  var reduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = win.matchMedia('(pointer: coarse)').matches;
  /* ?fmstill — QA hook: every canvas system renders one frame and halts */
  var still = /[?&]fmstill\b/.test(win.location.search);

  /* ── tiny math kit ── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  /* deterministic per-index pseudo-random — presets look stable across frames */
  function prand(i, salt) {
    var x = Math.sin(i * 127.1 + (salt || 0) * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ── theme access ── */
  function themeColors() {
    var cs = getComputedStyle(doc.documentElement);
    return {
      a: (cs.getPropertyValue('--fm-a') || '#fbbf24').trim(),
      b: (cs.getPropertyValue('--fm-b') || '#8b5cf6').trim()
    };
  }

  /* ── shared pointer state (uMouse intelligence export) ── */
  var pointer = { x: win.innerWidth / 2, y: win.innerHeight / 2, sx: 0, sy: 0, active: false, down: false };
  pointer.sx = pointer.x; pointer.sy = pointer.y;

  /* ══════════════════════════════════════════════════════════════
     uMouse — cursor dot + lagging halo ring
     ══════════════════════════════════════════════════════════════ */
  function mountCursor() {
    if (reduced || coarse) return;
    var dot = doc.createElement('div'); dot.id = 'fm-cursor-dot';
    var ring = doc.createElement('div'); ring.id = 'fm-cursor-ring';
    doc.body.appendChild(dot); doc.body.appendChild(ring);
    doc.documentElement.classList.add('fm-cursor-on');

    var rx = pointer.x, ry = pointer.y, visible = false;
    win.addEventListener('mousemove', function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
      if (!visible) { visible = true; doc.documentElement.classList.remove('fm-cursor-hidden'); }
      var t = e.target;
      var hot = t && t.closest && !!t.closest('a,button,[role="button"],input,select,textarea,label,summary');
      ring.classList.toggle('fm-hot', hot);
    }, { passive: true });
    doc.documentElement.addEventListener('mouseleave', function () {
      pointer.active = false;
      doc.documentElement.classList.add('fm-cursor-hidden');
    });
    win.addEventListener('mousedown', function () { pointer.down = true; dot.style.transform += ' scale(1.8)'; });
    win.addEventListener('mouseup', function () { pointer.down = false; });

    var prev = 0;
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = prev && now ? Math.min((now - prev) / 1000, 0.25) : 1 / 60;
      prev = now || 0;
      var k = 1 - Math.pow(1 - 0.16, dt * 60);   /* frame-rate independent follow */
      rx = lerp(rx, pointer.x, k);
      ry = lerp(ry, pointer.y, k);
      pointer.sx = rx; pointer.sy = ry;
      dot.style.transform = 'translate(' + pointer.x + 'px,' + pointer.y + 'px)' + (pointer.down ? ' scale(1.8)' : '');
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
    })(0);
  }

  /* ══════════════════════════════════════════════════════════════
     uClick — expanding ripple pulse at the click point
     ══════════════════════════════════════════════════════════════ */
  function mountRipple() {
    if (reduced) return;
    win.addEventListener('pointerdown', function (e) {
      var r = doc.createElement('div');
      r.className = 'fm-ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      doc.body.appendChild(r);
      setTimeout(function () { r.remove(); }, 650);
    }, { passive: true });
  }

  /* ══════════════════════════════════════════════════════════════
     Iris — reel-aperture transition between pages
     ══════════════════════════════════════════════════════════════ */
  var irisEl = null;
  function ensureIris() {
    if (!irisEl) {
      irisEl = doc.createElement('div');
      irisEl.id = 'fm-iris';
      irisEl.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(irisEl);
    }
    return irisEl;
  }
  /* Close the aperture from (x,y), then run cb (navigation). */
  function irisOut(x, y, cb) {
    if (reduced) { cb(); return; }
    var el = ensureIris();
    el.style.setProperty('--fm-ix', x + 'px');
    el.style.setProperty('--fm-iy', y + 'px');
    el.classList.remove('fm-iris-open');
    el.classList.add('fm-iris-close');
    try { sessionStorage.setItem('fm-iris-in', '1'); } catch (err) {}
    setTimeout(cb, 500);
  }
  /* On arrival: if the previous page closed the aperture, open it. */
  function irisIn() {
    var flag = null;
    try { flag = sessionStorage.getItem('fm-iris-in'); sessionStorage.removeItem('fm-iris-in'); } catch (err) {}
    if (!flag || reduced) return;
    var el = ensureIris();
    el.classList.add('fm-iris-open');
    setTimeout(function () { el.classList.remove('fm-iris-open'); }, 950);
  }
  /* Wire same-tab internal links to the iris-out wipe. */
  function mountIrisLinks() {
    doc.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-fm-no-iris')) return;
      var href = a.getAttribute('href');
      if (!href || href[0] === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      e.preventDefault();
      irisOut(e.clientX || win.innerWidth / 2, e.clientY || win.innerHeight / 2, function () {
        win.location.href = a.href;
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     Reveal — [data-fm-reveal] enters the viewport → .fm-in
     ══════════════════════════════════════════════════════════════ */
  function mountReveals(root) {
    var els = (root || doc).querySelectorAll('[data-fm-reveal]:not(.fm-in)');
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in win)) {
      els.forEach(function (el) { el.classList.add('fm-in'); });
      return;
    }
    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      fired = true;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var d = parseInt(el.getAttribute('data-fm-delay') || '0', 10);
        el.style.setProperty('--fm-delay', (d / 1000) + 's');
        el.classList.add('fm-in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
    /* safety net: some embedders starve IO callbacks — content must
       never stay hidden behind a reveal that cannot fire */
    setTimeout(function () {
      if (fired) return;
      io.disconnect();
      els.forEach(function (el) { el.classList.add('fm-in'); });
    }, 1600);
  }

  /* ══════════════════════════════════════════════════════════════
     PRESETS — per-portal motion systems.
     Each: draw(ctx, w, h, t, c)   t = seconds since start (ambient)
     or normalized [0..1] intro progress when opts.intro = true.
     All draw on a transparent canvas; the host supplies the veil.
     ══════════════════════════════════════════════════════════════ */
  var presets = {};

  /* Life in Time — time rings assemble & heartbeat pulse */
  presets.rings = function (ctx, w, h, t, c, intro) {
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.32;
    var beat = 1 + 0.035 * Math.max(0, Math.sin(t * 2.2 * TAU) - 0.72) * 4;
    for (var i = 0; i < 5; i++) {
      var p = intro ? clamp01(t * 1.6 - i * 0.12) : 1;
      if (p <= 0) continue;
      var r = R * (0.35 + i * 0.16) * beat;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * easeOut(p));
      ctx.strokeStyle = hexA(i % 2 ? c.b : c.a, 0.5 - i * 0.06);
      ctx.lineWidth = i === 0 ? 2.5 : 1.2;
      ctx.stroke();
    }
    /* season tick marks on the outer ring */
    var rr = R * (0.35 + 4 * 0.16) * beat;
    for (var k = 0; k < 12; k++) {
      var a = -Math.PI / 2 + (k / 12) * TAU;
      var vis = intro ? clamp01(t * 1.6 - 0.6) : 1;
      if (vis <= 0) break;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (rr - 6), cy + Math.sin(a) * (rr - 6));
      ctx.lineTo(cx + Math.cos(a) * (rr + 6), cy + Math.sin(a) * (rr + 6));
      ctx.strokeStyle = hexA(c.a, 0.35 * vis);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    /* heartbeat dot sweeping the inner ring */
    var ha = -Math.PI / 2 + (t * 0.25 % 1) * TAU;
    var hr = R * 0.35 * beat;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ha) * hr, cy + Math.sin(ha) * hr, 3.2, 0, TAU);
    ctx.fillStyle = c.a;
    ctx.shadowColor = c.a; ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  /* Kids Corner — blocks bloom & spores bounce into place */
  presets.blocks = function (ctx, w, h, t, c, intro) {
    var cx = w / 2, cy = h / 2, N = 24;
    for (var i = 0; i < N; i++) {
      var seed = prand(i, 7), seed2 = prand(i, 13);
      var ang = seed * TAU, dist = (0.12 + seed2 * 0.3) * Math.min(w, h);
      var p = intro ? clamp01(t * 1.8 - seed * 0.7) : 1;
      if (p <= 0) continue;
      var e = easeOut(p);
      var wob = Math.sin(t * (1.5 + seed) * TAU * 0.2 + i) * 4;
      var x = cx + Math.cos(ang) * dist * e;
      var y = cy + Math.sin(ang) * dist * e + wob;
      var s = (6 + seed2 * 14) * e;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(seed * 1.2 + Math.sin(t * 0.4 + i) * 0.15);
      ctx.fillStyle = hexA(i % 3 ? c.a : c.b, 0.24 + seed * 0.3);
      ctx.strokeStyle = hexA(i % 3 ? c.a : c.b, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (i % 4 === 0) { ctx.arc(0, 0, s / 2, 0, TAU); }
      else { ctx.rect(-s / 2, -s / 2, s, s); }
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    /* spores */
    for (var j = 0; j < 16; j++) {
      var sp = prand(j, 31);
      var sy2 = (sp * h + t * 30 * (0.3 + sp)) % h;
      var sx2 = prand(j, 37) * w + Math.sin(t * 0.6 + j) * 20;
      ctx.beginPath();
      ctx.arc(sx2, sy2, 1.4 + sp * 1.6, 0, TAU);
      ctx.fillStyle = hexA(c.b, 0.35);
      ctx.fill();
    }
  };

  /* Women's Health OS — cycle ring rotates with evidence particles */
  presets.cycle = function (ctx, w, h, t, c, intro) {
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3;
    var sweep = intro ? easeOut(clamp01(t * 1.4)) : 1;
    var rot = t * 0.15 * TAU;
    /* 4-phase arc ring */
    for (var ph = 0; ph < 4; ph++) {
      var a0 = rot + (ph / 4) * TAU, a1 = a0 + (TAU / 4) * 0.92 * sweep;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.strokeStyle = hexA(ph % 2 ? c.b : c.a, 0.55);
      ctx.lineWidth = ph === 0 ? 5 : 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    /* evidence particles orbiting in */
    for (var i = 0; i < 26; i++) {
      var s = prand(i, 5);
      var a = rot * (0.6 + s * 0.8) + s * TAU;
      var rr = R * (0.45 + 0.75 * prand(i, 9)) * sweep;
      var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.94;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + s * 2, 0, TAU);
      ctx.fillStyle = hexA(s > 0.5 ? c.a : c.b, 0.28 + s * 0.4);
      ctx.fill();
    }
  };

  /* Councils — dialogue ribbons weave between nodes */
  presets.ribbons = function (ctx, w, h, t, c, intro) {
    var nodes = [];
    var n = 6;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU + t * 0.08 * TAU;
      nodes.push({
        x: w / 2 + Math.cos(a) * w * 0.26,
        y: h / 2 + Math.sin(a) * h * 0.26
      });
    }
    var vis = intro ? easeOut(clamp01(t * 1.5)) : 1;
    /* weaving ribbons */
    for (var i2 = 0; i2 < n; i2++) {
      var A = nodes[i2], B = nodes[(i2 + 2) % n];
      var mx = (A.x + B.x) / 2 + Math.sin(t * 0.9 + i2) * 40;
      var my = (A.y + B.y) / 2 + Math.cos(t * 0.7 + i2 * 2) * 40;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.quadraticCurveTo(mx, my, lerp(A.x, B.x, vis), lerp(A.y, B.y, vis));
      ctx.strokeStyle = hexA(i2 % 2 ? c.a : c.b, 0.3);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      /* streaming token dot along the ribbon */
      var tt = (t * 0.4 + i2 / n) % 1;
      var q0x = lerp(A.x, mx, tt), q0y = lerp(A.y, my, tt);
      var q1x = lerp(mx, B.x, tt), q1y = lerp(my, B.y, tt);
      ctx.beginPath();
      ctx.arc(lerp(q0x, q1x, tt), lerp(q0y, q1y, tt), 2.2, 0, TAU);
      ctx.fillStyle = hexA(c.a, 0.85 * vis);
      ctx.fill();
    }
    nodes.forEach(function (p, idx) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 * vis, 0, TAU);
      ctx.fillStyle = hexA(idx % 2 ? c.b : c.a, 0.8);
      ctx.shadowColor = idx % 2 ? c.b : c.a; ctx.shadowBlur = 12;
      ctx.fill(); ctx.shadowBlur = 0;
    });
  };

  /* Library & Platforms — knowledge lattice expands and indexes */
  presets.lattice = function (ctx, w, h, t, c, intro) {
    var cols = 9, rows = 6;
    var gw = w * 0.7, gh = h * 0.6, x0 = (w - gw) / 2, y0 = (h - gh) / 2;
    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var idx = j * cols + i;
        var p = intro ? clamp01(t * 2 - (i + j) * 0.05) : 1;
        if (p <= 0) continue;
        var x = x0 + (i / (cols - 1)) * gw, y = y0 + (j / (rows - 1)) * gh;
        var pulse = 0.5 + 0.5 * Math.sin(t * TAU * 0.22 + idx * 0.9);
        /* connections right + down */
        ctx.strokeStyle = hexA(c.b, 0.14 * p);
        ctx.lineWidth = 1;
        if (i < cols - 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + gw / (cols - 1) * easeOut(p), y); ctx.stroke(); }
        if (j < rows - 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + gh / (rows - 1) * easeOut(p)); ctx.stroke(); }
        ctx.beginPath();
        ctx.arc(x, y, (1.2 + 1.6 * pulse) * p, 0, TAU);
        ctx.fillStyle = hexA(pulse > 0.75 ? c.a : c.b, (0.25 + 0.55 * pulse) * p);
        ctx.fill();
      }
    }
  };

  /* Calendar Generator — day grid sweeps in with events */
  presets.grid = function (ctx, w, h, t, c, intro) {
    var cols = 7, rows = 5, cell = Math.min(w, h) * 0.085;
    var gw = cols * cell, gh = rows * cell;
    var x0 = (w - gw) / 2, y0 = (h - gh) / 2;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var k = j * cols + i;
        var p = intro ? clamp01(t * 2.2 - k * 0.02) : 1;
        if (p <= 0) continue;
        var e = easeOut(p);
        var x = x0 + i * cell, y = y0 + j * cell;
        ctx.save();
        ctx.translate(x + cell / 2, y + cell / 2);
        ctx.scale(e, e);
        ctx.strokeStyle = hexA(c.a, 0.28);
        ctx.lineWidth = 1;
        ctx.strokeRect(-cell / 2 + 2, -cell / 2 + 2, cell - 4, cell - 4);
        /* event dots blink through the month */
        var ev = prand(k, 3);
        if (ev > 0.6) {
          var on = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * TAU * 0.3 + k));
          ctx.beginPath();
          ctx.arc(0, cell * 0.18, 2, 0, TAU);
          ctx.fillStyle = hexA(ev > 0.82 ? c.b : c.a, on);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  };

  /* Hyper Trophy OS — muscle fibers contract and glow */
  presets.fibers = function (ctx, w, h, t, c, intro) {
    var n = 14, cy = h / 2;
    var vis = intro ? easeOut(clamp01(t * 1.5)) : 1;
    for (var i = 0; i < n; i++) {
      var off = (i - (n - 1) / 2) * (h * 0.045);
      var contract = 0.75 + 0.25 * Math.sin(t * TAU * 0.35 + i * 0.25);
      var span = w * 0.34 * contract * vis;
      var sag = Math.sin(i * 1.1) * 8;
      var glow = Math.max(0, Math.sin(t * TAU * 0.35 + i * 0.25));
      ctx.beginPath();
      ctx.moveTo(w / 2 - span, cy + off + sag);
      ctx.bezierCurveTo(
        w / 2 - span * 0.4, cy + off - 10 - glow * 6,
        w / 2 + span * 0.4, cy + off - 10 - glow * 6,
        w / 2 + span, cy + off + sag
      );
      ctx.strokeStyle = hexA(i % 3 === 0 ? c.b : c.a, 0.2 + glow * 0.5);
      ctx.lineWidth = 1.6 + glow * 1.6;
      ctx.stroke();
    }
  };

  /* Manifesto — ink feather writes and unfolds */
  presets.ink = function (ctx, w, h, t, c, intro) {
    var cx = w / 2, cy = h / 2;
    var p = intro ? clamp01(t * 1.2) : (0.5 + 0.5 * Math.sin(t * 0.15 * TAU));
    /* quill stroke — a long S-curve being written */
    var steps = 90;
    ctx.beginPath();
    for (var i = 0; i <= steps * easeInOut(intro ? p : 1); i++) {
      var u = i / steps;
      var x = cx - w * 0.28 + u * w * 0.56;
      var y = cy + Math.sin(u * Math.PI * 2.2) * h * 0.09 * (1 - u * 0.4);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hexA(c.a, 0.6);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    /* feather barbs drifting off the stroke */
    for (var j = 0; j < 22; j++) {
      var s = prand(j, 17);
      var u2 = (s + t * 0.05) % 1;
      var bx = cx - w * 0.28 + u2 * w * 0.56;
      var by = cy + Math.sin(u2 * Math.PI * 2.2) * h * 0.09 * (1 - u2 * 0.4);
      var drift = (t * 12 * (0.4 + s)) % 46;
      ctx.beginPath();
      ctx.ellipse(bx + drift * 0.4, by - drift, 1.1 + s, 2.6 + s * 2, s * 3, 0, TAU);
      ctx.fillStyle = hexA(s > 0.5 ? c.a : c.b, Math.max(0, 0.4 - drift / 120));
      ctx.fill();
    }
  };

  /* M.Popova — floral glyphs blossom and breathe */
  presets.floral = function (ctx, w, h, t, c, intro) {
    var blooms = 5;
    for (var b = 0; b < blooms; b++) {
      var sx = prand(b, 21), sy = prand(b, 23);
      var x = w * (0.2 + sx * 0.6), y = h * (0.25 + sy * 0.5);
      var petals = 5 + Math.floor(prand(b, 25) * 3);
      var grow = intro ? easeOut(clamp01(t * 1.3 - b * 0.15)) : 1;
      if (grow <= 0) continue;
      var breathe = 1 + 0.06 * Math.sin(t * TAU * 0.12 + b * 2);
      var R = (14 + prand(b, 27) * 22) * grow * breathe;
      for (var p2 = 0; p2 < petals; p2++) {
        var a = (p2 / petals) * TAU + t * 0.03 * TAU * (b % 2 ? 1 : -1);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(R * 0.55, 0, R * 0.5, R * 0.2, 0, 0, TAU);
        ctx.strokeStyle = hexA(b % 2 ? c.a : c.b, 0.4 * grow);
        ctx.fillStyle = hexA(b % 2 ? c.a : c.b, 0.08 * grow);
        ctx.lineWidth = 1;
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(x, y, 2.4 * grow, 0, TAU);
      ctx.fillStyle = hexA(c.a, 0.8 * grow);
      ctx.fill();
    }
  };

  /* Power Law Odyssey — heavy-tail curve draws with outliers */
  presets.powerlaw = function (ctx, w, h, t, c, intro) {
    var x0 = w * 0.18, y0 = h * 0.75, gw = w * 0.64, gh = h * 0.5;
    var p = intro ? easeInOut(clamp01(t * 1.2)) : 1;
    /* axes */
    ctx.strokeStyle = hexA(c.a, 0.25);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0 - gh * p); ctx.lineTo(x0, y0); ctx.lineTo(x0 + gw * p, y0); ctx.stroke();
    /* heavy-tail curve y = x^-1.6 */
    ctx.beginPath();
    var steps = 120;
    for (var i = 1; i <= steps * p; i++) {
      var u = i / steps;
      var xv = 0.04 + u * 0.96;
      var yv = Math.pow(xv, -0.62) / Math.pow(0.04, -0.62);
      var x = x0 + u * gw, y = y0 - yv * gh;
      if (i === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = c.a;
    ctx.lineWidth = 2;
    ctx.shadowColor = c.a; ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    /* outlier events sparking up the tail */
    for (var j = 0; j < 9; j++) {
      var s = prand(j, 41);
      var u2 = 0.06 + s * 0.9;
      var flash = Math.max(0, Math.sin(t * TAU * 0.24 + j * 2.2));
      var yv2 = Math.pow(0.04 + u2 * 0.96, -0.62) / Math.pow(0.04, -0.62);
      ctx.beginPath();
      ctx.arc(x0 + u2 * gw, y0 - yv2 * gh - 6 - flash * 10, 1.6 + flash * 2.4, 0, TAU);
      ctx.fillStyle = hexA(s > 0.7 ? c.a : c.b, 0.3 + flash * 0.6);
      ctx.fill();
    }
  };

  /* Morning News / Voice — waveform packets stream in real time */
  presets.waveform = function (ctx, w, h, t, c, intro) {
    var cy = h / 2;
    var vis = intro ? easeOut(clamp01(t * 1.6)) : 1;
    for (var band = 0; band < 3; band++) {
      ctx.beginPath();
      var amp = (h * 0.06) * (1 - band * 0.25) * vis;
      for (var x = 0; x <= w; x += 4) {
        var u = x / w;
        var env = Math.pow(Math.sin(u * Math.PI), 1.5);
        var y = cy + (band - 1) * h * 0.14 +
          Math.sin(u * 26 + t * (3 + band) * 1.6) * amp * env *
          (0.55 + 0.45 * Math.sin(u * 4 - t * 1.2));
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hexA(band === 1 ? c.a : c.b, 0.5 - band * 0.12);
      ctx.lineWidth = band === 1 ? 1.8 : 1.1;
      ctx.stroke();
    }
    /* packets travelling the center line */
    for (var i = 0; i < 6; i++) {
      var u2 = ((t * 0.16) * (0.6 + prand(i, 3) * 0.8) + prand(i, 11)) % 1;
      ctx.beginPath();
      ctx.arc(u2 * w, cy + Math.sin(u2 * 26 + t * 4.6) * h * 0.05, 2.4, 0, TAU);
      ctx.fillStyle = hexA(c.a, 0.85 * vis);
      ctx.fill();
    }
  };

  /* Replicator Void — organism field grows and mutates */
  presets.organism = function (ctx, w, h, t, c, intro) {
    var cx = w / 2, cy = h / 2;
    var vis = intro ? easeOut(clamp01(t * 1.3)) : 1;
    var cells = 42;
    for (var i = 0; i < cells; i++) {
      var s1 = prand(i, 51), s2 = prand(i, 53), s3 = prand(i, 57);
      var a = s1 * TAU + t * 0.05 * (s2 > 0.5 ? 1 : -1) * TAU;
      var r = (0.08 + s2 * 0.34) * Math.min(w, h) * vis;
      /* mutate: radius wobbles on its own clock */
      var mut = 1 + 0.25 * Math.sin(t * (0.4 + s3) * TAU * 0.3 + i);
      var x = cx + Math.cos(a) * r * mut;
      var y = cy + Math.sin(a) * r * mut * 0.85;
      var sz = (1.5 + s3 * 3.5) * vis;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, TAU);
      ctx.fillStyle = hexA(s2 > 0.5 ? c.a : c.b, 0.18 + s3 * 0.3);
      ctx.fill();
      /* division filaments to a sibling */
      if (i % 3 === 0) {
        var j = (i * 7 + 5) % cells;
        var a2 = prand(j, 51) * TAU + t * 0.05 * (prand(j, 53) > 0.5 ? 1 : -1) * TAU;
        var r2 = (0.08 + prand(j, 53) * 0.34) * Math.min(w, h) * vis;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2 * 0.85);
        ctx.strokeStyle = hexA(c.b, 0.08);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  };

  /* External / VFX — reel aperture: camera iris blades breathe open */
  presets.aperture = function (ctx, w, h, t, c, intro) {
    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) * 0.3;
    var open = intro ? easeInOut(clamp01(t * 1.4)) : (0.65 + 0.35 * Math.sin(t * TAU * 0.1));
    var blades = 8;
    for (var i = 0; i < blades; i++) {
      var a = (i / blades) * TAU + open * 0.8;
      var inner = R * (0.25 + 0.45 * open);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a + 0.35) * R, cy + Math.sin(a + 0.35) * R);
      ctx.lineTo(cx + Math.cos(a + 0.78) * R, cy + Math.sin(a + 0.78) * R);
      ctx.strokeStyle = hexA(i % 2 ? c.a : c.b, 0.5);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.strokeStyle = hexA(c.a, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    /* film sprocket ticks */
    for (var k = 0; k < 24; k++) {
      var ka = (k / 24) * TAU + t * 0.06 * TAU;
      ctx.fillStyle = hexA(c.b, 0.4);
      ctx.fillRect(cx + Math.cos(ka) * (R + 12) - 1.5, cy + Math.sin(ka) * (R + 12) - 3, 3, 6);
    }
  };

  /* TinyLM — a sprouting node ring (small council of tiny minds) */
  presets.sprout = function (ctx, w, h, t, c, intro) {
    presets.ribbons(ctx, w, h, t, c, intro);
    /* seedling stem in the middle */
    var cx = w / 2, cy = h / 2;
    var g = intro ? easeOut(clamp01(t * 1.4 - 0.2)) : 1;
    if (g <= 0) return;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 22 * g);
    ctx.quadraticCurveTo(cx - 4, cy, cx, cy - 20 * g);
    ctx.strokeStyle = hexA(c.a, 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
    var sway = Math.sin(t * TAU * 0.12) * 3;
    ctx.beginPath();
    ctx.ellipse(cx - 7 + sway, cy - 20 * g, 8 * g, 4 * g, -0.5, 0, TAU);
    ctx.ellipse(cx + 7 + sway, cy - 24 * g, 8 * g, 4 * g, 0.5, 0, TAU);
    ctx.fillStyle = hexA(c.a, 0.35);
    ctx.fill();
  };

  /* ══════════════════════════════════════════════════════════════
     Portal-open intro overlay — plays the page's preset once over
     a dark veil, then dissolves. Once per session per page.
     ══════════════════════════════════════════════════════════════ */
  function playPortalOpen(name, force) {
    if (reduced || !presets[name]) return;
    var key = 'fm-open:' + location.pathname;
    try {
      if (!force && sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (err) {}

    var cv = doc.createElement('canvas');
    cv.id = 'fm-portal-open';
    cv.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var DPR = Math.min(win.devicePixelRatio || 1, 2);
    var w = win.innerWidth, h = win.innerHeight;
    cv.width = w * DPR; cv.height = h * DPR;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var colors = themeColors();
    var DUR = 1500, FADE = 380;
    var t0 = performance.now();
    (function frame(now) {
      var el = now - t0;
      var t = el / DUR;
      if (el >= DUR + FADE) { cv.remove(); return; }
      requestAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);
      /* dark veil that lifts as the preset finishes */
      var veil = el < DUR ? 0.82 * (1 - easeInOut(clamp01(t))) + 0.06 : 0;
      if (veil > 0.005) {
        ctx.fillStyle = 'rgba(7,7,11,' + veil + ')';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = el < DUR ? 1 : 1 - (el - DUR) / FADE;
      presets[name](ctx, w, h, clamp01(t), colors, true);
      ctx.globalAlpha = 1;
    })(t0);
  }

  /* ══════════════════════════════════════════════════════════════
     Ambient — run a preset as a looping vignette inside a canvas.
     Pauses offscreen and on hidden tabs. Returns a stop().
     ══════════════════════════════════════════════════════════════ */
  function ambient(canvas, name, opts) {
    if (!presets[name] || reduced) return function () {};
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var running = true, visible = true, raf = 0;
    var DPR = Math.min(win.devicePixelRatio || 1, 2);
    var t0 = performance.now() - (opts.seed || 0) * 1000;

    function size() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (canvas.width !== w * DPR || canvas.height !== h * DPR) {
        canvas.width = w * DPR; canvas.height = h * DPR;
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      return { w: w, h: h };
    }
    var io = null;
    if ('IntersectionObserver' in win) {
      io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; });
      io.observe(canvas);
    }
    var colors = opts.colors || null;
    (function frame(now) {
      if (!running) return;
      if (!still) raf = requestAnimationFrame(frame);
      if (!visible || doc.hidden) return;
      var d = size();
      ctx.clearRect(0, 0, d.w, d.h);
      presets[name](ctx, d.w, d.h, still ? 2.4 : (now - t0) / 1000, colors || themeColors(), false);
    })(t0);
    return function stop() {
      running = false;
      cancelAnimationFrame(raf);
      if (io) io.disconnect();
    };
  }
  function mountAmbients(root) {
    (root || doc).querySelectorAll('canvas[data-fm-ambient]').forEach(function (cv) {
      if (cv.__fmAmbient) return;
      cv.__fmAmbient = ambient(cv, cv.getAttribute('data-fm-ambient'), {
        seed: parseFloat(cv.getAttribute('data-fm-seed') || '0')
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     Init + public API
     ══════════════════════════════════════════════════════════════ */
  function init(opts) {
    opts = opts || {};
    if (opts.theme) doc.documentElement.setAttribute('data-forest-theme', opts.theme);
    if (opts.cursor !== false) { mountCursor(); mountRipple(); }
    if (opts.iris) { mountIrisLinks(); }
    irisIn();
    mountReveals();
    mountAmbients();
    if (opts.portalOpen && opts.preset) playPortalOpen(opts.preset, opts.forceOpen);
  }

  win.ForestMotion = {
    init: init,
    presets: presets,
    pointer: pointer,           /* live pointer state for page particle systems */
    reduced: reduced,
    coarse: coarse,
    still: still,               /* ?fmstill QA mode — render one frame, halt */
    ambient: ambient,
    mountReveals: mountReveals,
    mountAmbients: mountAmbients,
    playPortalOpen: playPortalOpen,
    irisOut: irisOut,
    themeColors: themeColors
  };

  /* auto-init from the script tag's data-attributes */
  var me = doc.currentScript;
  if (me && me.dataset) {
    var auto = {
      theme: me.dataset.theme || null,
      preset: me.dataset.preset || null,
      portalOpen: 'portalOpen' in me.dataset,
      cursor: !('noCursor' in me.dataset),
      iris: 'iris' in me.dataset
    };
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', function () { init(auto); });
    } else {
      init(auto);
    }
  }
})();
