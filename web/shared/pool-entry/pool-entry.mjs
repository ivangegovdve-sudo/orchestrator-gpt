/*
 * Pool entry runtime: the one shared system behind every pool's exterior entry.
 *
 * A pool page opens with <section data-pool-entry> holding a pinned stage and a
 * <canvas data-entry-canvas>. Each pool supplies a scene module; this file owns
 * everything that must be identical across pools: the clock, canvas sizing,
 * pause when hidden or off screen, the portrait/landscape split, scroll
 * progress, pointer drift, the reduced-motion still, and the scroll engine
 * mount. A scene only draws.
 *
 *   scene = { id, duration, still, draw(s), setup?(s) }
 *   s     = { g, w, h, dpr, t, p, px, py, portrait, reduced }
 *
 *   t   seconds since the entry became visible. 0..duration is the arrival;
 *       after that the scene holds a resolved frame and may breathe.
 *   p   0..1 scroll progress through the pinned stage: the departure.
 *   px/py  smoothed pointer 0..1 (0.5 when there is no fine pointer).
 *
 * Debug: ?entry-t=3.2 freezes the clock at 3.2 s, ?entry-p=0.5 freezes scroll
 * progress. Both only affect the canvas, never the page.
 */
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
export const easeOutQuint = (x) => 1 - (1 - clamp(x)) ** 5;
export const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const easeOutBack = (x) => { x = clamp(x); const c = 1.5; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

/** Deterministic random so every capture of a scene is the same picture. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hex = (c, a = 1) => {
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function mount(scene, { root = document } = {}) {
  const entry = root.querySelector('[data-pool-entry]');
  const canvas = entry?.querySelector('[data-entry-canvas]');
  if (!entry || !canvas) return null;
  const stage = entry.querySelector('[data-sc-stage]') || entry;
  const g = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const freezeT = params.has('entry-t') ? parseFloat(params.get('entry-t')) : null;
  const freezeP = params.has('entry-p') ? parseFloat(params.get('entry-p')) : null;

  // Reduced motion gets a composed still, not a pinned scroll with nothing in it.
  if (reduced) { entry.dataset.scAct = 'flow'; entry.removeAttribute('data-sc-span'); }
  entry.dataset.entryMotion = reduced ? 'still' : 'live';

  const s = { g, w: 0, h: 0, dpr: 1, t: 0, p: 0, px: 0.5, py: 0.5, portrait: false, reduced };
  let tx = 0.5, ty = 0.5;

  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height || innerHeight));
    s.dpr = Math.min(devicePixelRatio || 1, 2);
    s.w = w; s.h = h;
    s.portrait = w < 700 || w / h < 0.9;
    canvas.width = Math.round(w * s.dpr);
    canvas.height = Math.round(h * s.dpr);
    entry.dataset.entryLayout = s.portrait ? 'portrait' : 'landscape';
    g.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    scene.setup?.(s);
  }

  function progress() {
    if (freezeP !== null) return clamp(freezeP);
    if (reduced) return 0;
    const r = entry.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight));
  }

  function paint() {
    g.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    g.clearRect(0, 0, s.w, s.h);
    scene.draw(s);
    // The scroll harness reads this to tell a living stage from a dead one.
    stage.setAttribute('data-sc-verify-state',
      reduced ? 'still' : `${Math.round(s.t * 8)}|${Math.round(s.p * 60)}`);
    if (reduced) stage.setAttribute('data-sc-verify-hold', 'true');
  }

  resize();
  new ResizeObserver(resize).observe(stage);
  addEventListener('resize', () => { resize(); if (reduced) { s.t = scene.still; paint(); } });

  if (reduced) {
    s.t = freezeT ?? scene.still;
    paint();
  } else {
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        tx = clamp((e.clientX - r.left) / r.width);
        ty = clamp((e.clientY - r.top) / r.height);
      }, { passive: true });
    }
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);
    let t0 = performance.now();
    let last = t0;
    let hiddenFor = 0;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) hiddenFor += performance.now() - last;
    });
    const frame = (now) => {
      requestAnimationFrame(frame);
      last = now;
      if (document.hidden || !visible) return;
      s.t = freezeT ?? Math.max(0, (now - t0 - hiddenFor) / 1000);
      s.p = progress();
      s.px += (tx - s.px) * 0.06;
      s.py += (ty - s.py) * 0.06;
      entry.dataset.entryPhase = s.t < scene.duration ? 'arrive' : 'rest';
      paint();
    };
    requestAnimationFrame(frame);
  }

  document.documentElement.classList.add('entry-ready');
  // The scroll engine pins the stage and fades the copy; the scene never touches scroll.
  window.ScrollCraft?.mount(document.body);
  return s;
}
