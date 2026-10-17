/*
 * Artificial Self: a neuron and its computational analogue approach, meet in
 * the middle and become something hybrid. Signals cross both ways through the
 * junction. Scroll descends into the seam until the page ground grows out of it.
 *
 * The scene is drawn in an "abstract frame": x runs along the axis from the
 * biological side (negative x) to the computational side (positive x), origin
 * on the seam. Landscape draws that axis horizontally; portrait rotates it to
 * run top to bottom, so the neuron sits above and the circuit below.
 */
import { clamp, lerp, seg, smooth, easeOut, easeInOut, rng } from '/web/shared/pool-entry/pool-entry.mjs';

const GROUND = '#0a0712';
const GROUND_RGB = '10,7,18';
const BIO = '127,216,224';
const BIO_DK = '27,85,104';
const COP = '232,161,90';
const HYB = '205,181,245';
const TAU = Math.PI * 2;
const MONO = '500 11px "IBM Plex Mono", ui-monospace, Menlo, monospace';

/* ---------- small helpers ---------- */
let _x = 0, _y = 0;
function pointAt(P, s) {
  const c = P.cum, n = c.length;
  if (s <= 0) { _x = P.x[0]; _y = P.y[0]; return; }
  if (s >= c[n - 1]) { _x = P.x[n - 1]; _y = P.y[n - 1]; return; }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const f = (s - c[lo]) / ((c[hi] - c[lo]) || 1);
  _x = P.x[lo] + (P.x[hi] - P.x[lo]) * f;
  _y = P.y[lo] + (P.y[hi] - P.y[lo]) * f;
}
const mixRGB = (a, b, t) => `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;

/* signal colour LUT: cool on the biological side, lilac in the seam, copper beyond */
const LUT = [];
const LUT_HI = [];
(function buildLut() {
  const bio = [127, 216, 224], hyb = [214, 192, 255], cop = [240, 179, 106];
  const bioHi = [200, 244, 247], hybHi = [236, 224, 255], copHi = [255, 226, 186];
  for (let i = 0; i <= 64; i++) {
    const z = i / 64 * 2 - 1;
    let a = bio, b = bio, ah = bioHi, bh = bioHi, t = 0;
    if (z >= -0.55 && z < -0.08) { b = hyb; bh = hybHi; t = (z + 0.55) / 0.47; }
    else if (z >= -0.08 && z <= 0.08) { a = b = hyb; ah = bh = hybHi; }
    else if (z > 0.08 && z < 0.55) { a = hyb; ah = hybHi; b = cop; bh = copHi; t = (z - 0.08) / 0.47; }
    else if (z >= 0.55) { a = b = cop; ah = bh = copHi; }
    LUT.push(mixRGB(a, b, t)); LUT_HI.push(mixRGB(ah, bh, t));
  }
})();

/* ---------- tree generation (setup only) ---------- */
function finishBranch(b) {
  const n = b.xs.length;
  b.n = n - 1;
  b.cum = new Float32Array(n);
  for (let i = 1; i < n; i++) b.cum[i] = b.cum[i - 1] + Math.hypot(b.xs[i] - b.xs[i - 1], b.ys[i] - b.ys[i - 1]);
  return b;
}

/* Organic: smooth wandering dendrites, a tree that taper-branches. */
function organicTree(r, sign, reach, yMin, yMax, unit, tStart) {
  const out = [];
  const grow = (x, y, phi, len, depth, parent, pIdx) => {
    const n = Math.max(7, Math.round(len / (unit * 0.85)));
    const xs = new Float32Array(n + 1), ys = new Float32Array(n + 1);
    xs[0] = x; ys[0] = y;
    let stop = n;
    for (let i = 1; i <= n; i++) {
      phi += (r() - 0.5) * 0.46;
      if (y > yMax * 0.82) phi -= 0.14;
      if (y < yMin * 0.82) phi += 0.14;
      phi = clamp(phi, -1.25, 1.25);
      x += sign * Math.cos(phi) * unit * 0.85;
      y += Math.sin(phi) * unit * 0.85;
      xs[i] = x; ys[i] = y;
      if (Math.abs(x) > reach) { stop = i; break; }
    }
    const b = finishBranch({
      xs: xs.slice(0, stop + 1), ys: ys.slice(0, stop + 1), depth, parent, pIdx,
      t0: tStart + depth * 0.62 + r() * 0.3, dur: 0.95 + r() * 0.4, leaf: true, ph: r() * TAU,
    });
    const idx = out.length;
    out.push(b);
    if (depth < 3 && stop > 5) {
      const mid = Math.floor(stop * (0.45 + r() * 0.15));
      const s1 = r() < 0.5 ? 1 : -1;
      b.leaf = false;
      grow(xs[mid], ys[mid], phi * 0.5 + s1 * (0.5 + r() * 0.4), len * 0.62, depth + 1, idx, mid);
      grow(xs[stop], ys[stop], phi - s1 * (0.35 + r() * 0.35), len * 0.68, depth + 1, idx, stop);
      if (depth < 2 && r() < 0.5) grow(xs[Math.floor(stop * 0.75)], ys[Math.floor(stop * 0.75)], phi + s1 * (0.7 + r() * 0.3), len * 0.5, depth + 1, idx, Math.floor(stop * 0.75));
    }
    return b;
  };
  const base = [-0.95, -0.5, -0.05, 0.42, 0.9];
  for (const ph of base) grow(0, 0, ph + (r() - 0.5) * 0.25, reach * (0.34 + r() * 0.06), 0, -1, 0);
  return out;
}

/* Orthogonal: 45 degree traces with corners, ending in vias. */
function circuitTree(r, sign, reach, yMin, yMax, unit, tStart, R) {
  const out = [];
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]].map(([a, b]) => { const l = Math.hypot(a, b); return [a / l, b / l]; });
  const dvec = (k) => { const d = dirs[((k % 8) + 8) % 8]; return [sign * d[0], d[1]]; };
  const grow = (pts, k, len, depth, parent, pIdx) => {
    let [x, y] = pts[pts.length - 1];
    const segs = depth === 0 ? 3 : 2 + (r() < 0.5 ? 1 : 0);
    for (let s = 0; s < segs; s++) {
      const l = (len / segs) * (0.7 + r() * 0.6);
      const [dx, dy] = dvec(k);
      x += dx * l; y += dy * l;
      if (Math.abs(x) > reach) { x = Math.sign(x) * reach; }
      y = clamp(y, yMin * 0.9, yMax * 0.9);
      pts.push([x, y]);
      let turn = r() < 0.5 ? 1 : -1;
      if (y > yMax * 0.7) turn = -1; else if (y < yMin * 0.7) turn = 1;
      // keep heading within 90 degrees of outward
      k = clamp(k + turn, -2, 2);
      if (k === 0 && s < segs - 1 && r() < 0.35) k = turn;
      if (Math.abs(x) >= reach) break;
    }
    const b = finishBranch({
      xs: Float32Array.from(pts, (p) => p[0]), ys: Float32Array.from(pts, (p) => p[1]), depth, parent, pIdx,
      t0: tStart + depth * 0.55 + r() * 0.25, dur: 0.8 + r() * 0.3, leaf: true, ph: r() * TAU,
    });
    const idx = out.length;
    out.push(b);
    if (depth < 2 && pts.length > 2) {
      b.leaf = false;
      const at = pts.length - 2;
      const sgn = r() < 0.5 ? 1 : -1;
      grow([[pts[at][0], pts[at][1]]], clamp(k + sgn, -2, 2), len * 0.62, depth + 1, idx, at);
      grow([[pts[pts.length - 1][0], pts[pts.length - 1][1]]], clamp(k - sgn, -2, 2), len * 0.66, depth + 1, idx, pts.length - 1);
    }
  };
  const ys0 = [-0.62, -0.3, 0.02, 0.34, 0.64];
  for (const yy of ys0) {
    const yp = yy * R;
    const c = R * 0.3;
    // inside the die: a short run, then a 45 degree jog onto the pin row
    const pts = [[0, 0], [sign * c, 0], [sign * (c + Math.abs(yp)), yp], [sign * (R * 1.02 + Math.abs(yp) * 0.2), yp]];
    grow(pts, 0, reach * (0.34 + r() * 0.06), 0, -1, 0);
  }
  return out;
}

function leavesSorted(tree) {
  const L = [];
  tree.forEach((b, i) => { if (b.leaf && b.depth >= 2) L.push(i); });
  L.sort((a, b) => tree[a].ys[tree[a].n] - tree[b].ys[tree[b].n]);
  return L;
}
function chainOf(tree, leafIdx) {
  const list = [];
  for (let i = leafIdx; i >= 0; i = tree[i].parent) list.push(i);
  list.reverse();
  const xs = [], ys = [];
  for (let k = 0; k < list.length; k++) {
    const b = tree[list[k]];
    const upto = k < list.length - 1 ? tree[list[k + 1]].pIdx : b.n;
    for (let i = (k === 0 ? 0 : 1); i <= upto; i++) { xs.push(b.xs[i]); ys.push(b.ys[i]); }
    if (k < list.length - 1) {
      // child starts at its parent's point; skip duplicate by construction
    }
  }
  return { xs, ys };
}

/* ---------- scene state ---------- */
const W = {};

function paintSprites(s) {
  const { R, dpr } = W;
  const k = Math.min(dpr * 1.5, 3);
  const S = Math.ceil(2.7 * R);
  const mk = (size) => { const c = document.createElement('canvas'); c.width = Math.ceil(size * k); c.height = Math.ceil(size * k); const x = c.getContext('2d'); x.scale(k, k); return [c, x]; };

  /* soma */
  {
    const [c, x] = mk(S); x.translate(S / 2, S / 2);
    const r = rng(11);
    let gr = x.createRadialGradient(-0.3 * R, -0.36 * R, 0.1 * R, 0, 0, 1.3 * R);
    gr.addColorStop(0, '#3d9fb1'); gr.addColorStop(0.42, '#1f5b6f'); gr.addColorStop(0.8, '#0e2c3d'); gr.addColorStop(1, '#07151f');
    x.fillStyle = gr; x.fillRect(-S / 2, -S / 2, S, S);
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * R * 0.98, rr = (0.04 + r() * 0.12) * R;
      x.fillStyle = r() < 0.55 ? `rgba(150,230,238,${0.03 + r() * 0.05})` : `rgba(4,16,26,${0.1 + r() * 0.16})`;
      x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, TAU); x.fill();
    }
    gr = x.createRadialGradient(-0.14 * R, 0.04 * R, 0, -0.12 * R, 0.06 * R, 0.3 * R);
    gr.addColorStop(0, '#0a1b2b'); gr.addColorStop(0.8, '#103447'); gr.addColorStop(1, '#17475b');
    x.fillStyle = gr; x.beginPath(); x.arc(-0.12 * R, 0.06 * R, 0.3 * R, 0, TAU); x.fill();
    x.lineWidth = 1.2; x.strokeStyle = `rgba(${BIO},0.38)`; x.stroke();
    x.fillStyle = 'rgba(205,181,245,0.28)'; x.beginPath(); x.arc(-0.05 * R, 0.1 * R, 0.07 * R, 0, TAU); x.fill();
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU, d = (0.42 + r() * 0.5) * R;
      x.fillStyle = `rgba(${r() < 0.5 ? BIO : HYB},${0.25 + r() * 0.3})`;
      x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, (0.012 + r() * 0.016) * R, 0, TAU); x.fill();
    }
    gr = x.createLinearGradient(-0.5 * R, -0.6 * R, 0.8 * R, 0.9 * R);
    gr.addColorStop(0.45, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.42)');
    x.fillStyle = gr; x.fillRect(-S / 2, -S / 2, S, S);
    W.somaSpr = c;
  }

  /* chip */
  {
    const [c, x] = mk(S); x.translate(S / 2, S / 2);
    const r = rng(23);
    let gr = x.createLinearGradient(-R, -R, R, R);
    gr.addColorStop(0, '#47301c'); gr.addColorStop(0.5, '#2a1a12'); gr.addColorStop(1, '#150d0b');
    x.fillStyle = gr; x.fillRect(-S / 2, -S / 2, S, S);
    // fine substrate texture
    for (let i = 0; i < 160; i++) {
      x.fillStyle = `rgba(${COP},${0.02 + r() * 0.03})`;
      x.fillRect((r() - 0.5) * 2.2 * R, (r() - 0.5) * 2.2 * R, 1.2, 1.2);
    }
    // guard ring and die
    x.lineWidth = 1; x.strokeStyle = `rgba(${COP},0.22)`;
    x.strokeRect(-0.82 * R, -0.7 * R, 1.64 * R, 1.4 * R);
    const dx = 0.14 * R, dh = 0.52 * R;
    x.fillStyle = '#1b110d'; x.fillRect(dx - dh, -dh, 2 * dh, 2 * dh);
    x.strokeStyle = `rgba(${COP},0.55)`; x.lineWidth = 1.2; x.strokeRect(dx - dh, -dh, 2 * dh, 2 * dh);
    x.save(); x.beginPath(); x.rect(dx - dh, -dh, 2 * dh, 2 * dh); x.clip();
    x.strokeStyle = `rgba(${COP},0.09)`; x.lineWidth = 1;
    for (let i = -14; i <= 14; i++) { x.beginPath(); x.moveTo(dx - dh + i * 0.075 * R, -dh); x.lineTo(dx - dh + i * 0.075 * R + 2 * dh, dh); x.stroke(); }
    x.restore();
    // pads on the die edge
    x.fillStyle = `rgba(${COP},0.6)`;
    for (let i = 0; i < 7; i++) {
      const o = dx - dh + (i + 0.5) * (2 * dh / 7);
      x.fillRect(o - 2, -dh + 3, 4, 4); x.fillRect(o - 2, dh - 7, 4, 4);
      x.fillRect(dx - dh + 3, -dh + (i + 0.5) * (2 * dh / 7) - 2, 4, 4); x.fillRect(dx + dh - 7, -dh + (i + 0.5) * (2 * dh / 7) - 2, 4, 4);
    }
    // the transistor: gate, channel, source and drain
    const gx = dx, gy = 0, u = 0.19 * R;
    x.strokeStyle = '#f0b36a'; x.lineWidth = 1.5; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(gx - 1.15 * u, gy - 0.9 * u); x.lineTo(gx - 1.15 * u, gy + 0.9 * u);       // gate plate
    x.moveTo(gx - 0.55 * u, gy - 0.95 * u); x.lineTo(gx - 0.55 * u, gy + 0.95 * u);      // channel
    x.moveTo(gx - 0.55 * u, gy - 0.8 * u); x.lineTo(gx + 0.9 * u, gy - 0.8 * u); x.lineTo(gx + 0.9 * u, gy - 1.6 * u); // drain
    x.moveTo(gx - 0.55 * u, gy + 0.8 * u); x.lineTo(gx + 0.9 * u, gy + 0.8 * u); x.lineTo(gx + 0.9 * u, gy + 1.6 * u); // source
    x.moveTo(gx - 1.15 * u, gy); x.lineTo(gx - 2.1 * u, gy);                              // gate lead
    x.stroke();
    x.fillStyle = '#f0b36a'; x.beginPath(); x.arc(gx - 0.55 * u + 0.0, gy, 0, 0, TAU);
    x.beginPath(); x.moveTo(gx - 0.55 * u, gy); x.lineTo(gx + 0.2 * u, gy); x.stroke(); // body tie
    gr = x.createLinearGradient(-R, -R, R * 0.6, R);
    gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.4)');
    x.fillStyle = gr; x.fillRect(-S / 2, -S / 2, S, S);
    W.chipSpr = c;
  }

  /* bokeh discs */
  const disc = (rgb) => {
    const [c, x] = mk(96); x.translate(48, 48);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 46);
    g.addColorStop(0, `rgba(${rgb},0.55)`); g.addColorStop(0.7, `rgba(${rgb},0.4)`); g.addColorStop(0.92, `rgba(${rgb},0.55)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 46, 0, TAU); x.fill();
    return c;
  };
  W.bokehBio = disc(BIO); W.bokehCop = disc(COP); W.bokehHyb = disc(HYB);

  /* grain tile */
  {
    const c = document.createElement('canvas'); c.width = c.height = 192;
    const x = c.getContext('2d'); const img = x.createImageData(192, 192); const r = rng(5);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() < 0.5 ? 255 : 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = r() * 34;
    }
    x.putImageData(img, 0, 0);
    W.grain = c;
  }

  /* ground disc used for the emergence */
  {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0, GROUND); g.addColorStop(0.86, GROUND); g.addColorStop(1, `rgba(${GROUND_RGB},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    W.disc = c;
  }

  /* background plane: night violet with a cool lean left, warm lean right */
  {
    const c = document.createElement('canvas'); c.width = Math.ceil(s.w * k); c.height = Math.ceil(s.h * k);
    const x = c.getContext('2d'); x.scale(k, k);
    x.fillStyle = GROUND; x.fillRect(0, 0, s.w, s.h);
    const ax = W.portrait ? [0, 1] : [1, 0];
    const cx = W.cx, cy = W.cy;
    const spot = (px, py, rad, rgba) => {
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, rgba); g.addColorStop(1, 'rgba(10,7,18,0)'); x.fillStyle = g; x.fillRect(0, 0, s.w, s.h);
    };
    const span = (W.portrait ? s.h : s.w) * 0.34;
    spot(cx - ax[0] * span, cy - ax[1] * span, span * 1.5, 'rgba(34,92,112,0.2)');
    spot(cx + ax[0] * span, cy + ax[1] * span, span * 1.5, 'rgba(120,66,30,0.18)');
    spot(cx, cy, Math.max(s.w, s.h) * 0.42, 'rgba(46,28,84,0.5)');
    W.bg = c;
  }

  /* the quiet zone: ground rises under the copy as the departure begins */
  {
    const c = document.createElement('canvas'); c.width = Math.ceil(s.w); c.height = Math.ceil(s.h);
    const x = c.getContext('2d');
    let g2;
    if (W.portrait) { g2 = x.createLinearGradient(0, s.h * 0.5, 0, s.h * 0.64); g2.addColorStop(0, `rgba(${GROUND_RGB},0)`); g2.addColorStop(1, GROUND); x.fillStyle = g2; x.fillRect(0, 0, s.w, s.h); }
    else { g2 = x.createRadialGradient(s.w * 0.22, s.h * 0.82, 0, s.w * 0.22, s.h * 0.82, s.w * 0.5); g2.addColorStop(0, GROUND); g2.addColorStop(0.62, GROUND); g2.addColorStop(1, `rgba(${GROUND_RGB},0)`); x.setTransform(1, 0, 0, 0.62, 0, s.h * 0.82 * 0.38); x.fillStyle = g2; x.fillRect(0, 0, s.w, s.h * 2); }
    W.shade = c;
  }

  /* plate: hairline frame, ruler ticks (static) */
  {
    const c = document.createElement('canvas'); c.width = Math.ceil(s.w * k); c.height = Math.ceil(s.h * k);
    const x = c.getContext('2d'); x.scale(k, k);
    const m = W.portrait ? 12 : 18;
    const top = W.portrait ? 58 : 18;
    x.strokeStyle = `rgba(${HYB},0.16)`; x.lineWidth = 1;
    x.strokeRect(m + 0.5, top + 0.5, s.w - 2 * m - 1, s.h - top - m - 1);
    x.strokeStyle = `rgba(${HYB},0.34)`;
    const t = 12;
    for (const [px, py, sx, sy] of [[m, top, 1, 1], [s.w - m, top, -1, 1], [m, s.h - m, 1, -1], [s.w - m, s.h - m, -1, -1]]) {
      x.beginPath(); x.moveTo(px + sx * t, py + 0.5 * sy); x.lineTo(px, py + 0.5 * sy); x.lineTo(px, py + sy * t); x.stroke();
    }
    x.strokeStyle = `rgba(${HYB},0.22)`;
    const rx0 = s.w * 0.5 - (W.portrait ? 80 : 300), rx1 = s.w * 0.5 + (W.portrait ? 80 : 300);
    for (let X = rx0, i = 0; X <= rx1; X += 10, i++) {
      x.beginPath(); x.moveTo(Math.round(X) + 0.5, top + 1); x.lineTo(Math.round(X) + 0.5, top + (i % 5 === 0 ? 10 : 5)); x.stroke();
    }
    W.plate = c;
  }
}

function setup(s) {
  const portrait = s.portrait;
  const w = s.w, h = s.h;
  W.portrait = portrait; W.dpr = s.dpr;
  W.cx = w * 0.5; W.cy = portrait ? h * 0.35 : h * 0.375;
  W.R = portrait ? Math.min(w * 0.19, 84) : Math.min(w * 0.085, h * 0.135);
  const R = W.R;
  const unit = portrait ? Math.max(6, w / 46) : Math.max(8, w / 150);
  const xf = 0.62 * R;
  W.xf = xf;
  W.X0 = portrait ? h * 0.27 : w * 0.285;
  let reachA, reachB, yMin, yMax;
  if (portrait) {
    reachA = W.cy - h * 0.145 - xf; reachB = h * 0.6 - W.cy - xf;
    yMax = w * 0.5 - 12; yMin = -yMax;
  } else {
    reachA = reachB = w * 0.5 - xf - w * 0.07;
    yMin = -(W.cy - h * 0.085); yMax = h * 0.15;
  }
  W.reach = [reachA, reachB];
  const r = rng(portrait ? 77 : 41);
  W.treeA = organicTree(r, -1, reachA, yMin, yMax, unit, 1.1);
  W.treeB = circuitTree(rng(portrait ? 91 : 53), 1, reachB, yMin, yMax, unit, 1.25, R);

  // pulse paths: a leaf of the neuron, through a bridge in the seam, out to a leaf of the circuit
  const LA = leavesSorted(W.treeA), LB = leavesSorted(W.treeB);
  const M = 6;
  W.paths = [];
  const pick = (L, i) => L[Math.min(L.length - 1, Math.round((i + 0.5) / M * (L.length - 1)))];
  for (let i = 0; i < M; i++) {
    const a = chainOf(W.treeA, pick(LA, i));
    const b = chainOf(W.treeB, pick(LB, (i * 5 + 2) % M));
    const bridge = (i - (M - 1) / 2) * 0.27 * R;
    const xs = [], ys = [];
    for (let k = a.xs.length - 1; k >= 0; k--) { xs.push(a.xs[k] - xf); ys.push(a.ys[k]); }
    const seamStart = xs.length - 1;
    xs.push(-0.2 * R, 0.2 * R); ys.push(bridge, bridge);
    for (let k = 0; k < b.xs.length; k++) { xs.push(b.xs[k] + xf); ys.push(b.ys[k]); }
    const P = { x: Float32Array.from(xs), y: Float32Array.from(ys), cum: new Float32Array(xs.length), bridge };
    for (let k = 1; k < xs.length; k++) P.cum[k] = P.cum[k - 1] + Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]);
    P.total = P.cum[P.cum.length - 1];
    P.seamS = (P.cum[seamStart] + P.cum[seamStart + 2]) / 2;
    P.period = 4.7 + i * 0.62; P.travel = 2.3 + (P.total / (portrait ? 700 : 1400)) * 1.2;
    P.phase = i * 1.37 + 0.2; P.t0 = 4.0 + i * 0.32;
    W.paths.push(P);
  }

  // cross-colonisation inside the seam: cool organelles in the die, warm pads in the membrane
  const rr = rng(63);
  W.mix = [];
  for (let i = 0; i < 34; i++) {
    const x = (rr() - 0.5) * 1.3 * R, y = (rr() - 0.5) * 1.5 * R;
    if (Math.hypot(x / (0.8 * R), y / (0.86 * R)) > 1) continue;
    W.mix.push({ x, y, s: (0.02 + rr() * 0.035) * R, d: 4.0 + rr() * 1.4 + Math.abs(x) / R * 1.5, sq: x < 0 ? rr() < 0.8 : rr() < 0.2, ph: rr() * TAU });
  }
  // bokeh
  const rb = rng(9);
  W.bokeh = [];
  for (let i = 0; i < (portrait ? 14 : 24); i++) {
    const x = rb() * w, y = rb() * h;
    const side = portrait ? (y < W.cy ? 0 : 1) : (x < w / 2 ? 0 : 1);
    W.bokeh.push({ x, y, r: 10 + rb() * (portrait ? 34 : 52), a: 0.04 + rb() * 0.07, side, sp: 0.05 + rb() * 0.1, ph: rb() * TAU });
  }
  // soma lumps
  const rl = rng(31);
  W.lump = new Float32Array(120);
  const a1 = rl() * TAU, a2 = rl() * TAU;
  for (let i = 0; i < 120; i++) { const th = i / 120 * TAU; W.lump[i] = 0.05 * Math.sin(2 * th + a1) + 0.035 * Math.sin(4 * th + a2); }
  W.seamGrad = null;
  paintSprites(s);
  if ('letterSpacing' in s.g) W.ls = true;
}

/* ---------- drawing ---------- */
function traceSoma(g, t, grow) {
  const R = W.R;
  g.beginPath();
  for (let i = 0; i < 120; i++) {
    const th = i / 120 * TAU;
    const r = R * (1 + W.lump[i] + grow * (0.018 * Math.sin(3 * th + t * 0.5 + 1.1) + 0.012 * Math.sin(5 * th - t * 0.37 + 2.3) + 0.008 * Math.sin(7 * th + t * 0.71)));
    const x = Math.cos(th) * r, y = Math.sin(th) * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
}
function traceChip(g, grow) {
  const R = W.R, hw = R, hh = 0.86 * R, c = 0.2 * R;
  g.beginPath();
  g.moveTo(-hw + c, -hh); g.lineTo(hw - c, -hh); g.lineTo(hw, -hh + c); g.lineTo(hw, hh - c);
  g.lineTo(hw - c, hh); g.lineTo(-hw + c, hh); g.lineTo(-hw, hh - c); g.lineTo(-hw, -hh + c); g.closePath();
  void grow;
}

function drawTree(g, tree, ox, t, bio, lz, k0) {
  g.save(); g.translate(ox, 0);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < tree.length; i++) {
    const b = tree[i];
    const f = bio ? easeOut(seg(t, b.t0, b.t0 + b.dur)) : seg(t, b.t0, b.t0 + b.dur * 0.8);
    if (f <= 0) continue;
    const kk = f * b.n;
    const full = Math.floor(kk);
    const shimmer = 0.9 + 0.1 * Math.sin(t * 0.6 + b.ph);
    const d = b.depth;
    const lw = (bio ? [3.4, 2.4, 1.6, 1.1][d] : [2.6, 1.9, 1.4, 1.1][d]) * lz;
    if (bio && d <= 1) {
      g.strokeStyle = 'rgba(2,8,14,0.45)'; g.lineWidth = lw + 1.2 * lz;
      g.beginPath(); g.moveTo(b.xs[0] + 1.5, b.ys[0] + 2.5);
      for (let j = 1; j <= full; j++) g.lineTo(b.xs[j] + 1.5, b.ys[j] + 2.5);
      g.stroke();
    }
    g.strokeStyle = bio ? `rgba(${BIO},${(0.78 - d * 0.1) * shimmer})` : `rgba(${COP},${(0.8 - d * 0.1) * shimmer})`;
    g.lineWidth = lw;
    g.beginPath(); g.moveTo(b.xs[0], b.ys[0]);
    for (let j = 1; j <= full && j <= b.n; j++) g.lineTo(b.xs[j], b.ys[j]);
    if (full < b.n) { const q = kk - full; g.lineTo(lerp(b.xs[full], b.xs[full + 1], q), lerp(b.ys[full], b.ys[full + 1], q)); }
    g.stroke();
    if (b.leaf && f >= 1) {
      const x = b.xs[b.n], y = b.ys[b.n];
      if (bio) {
        g.fillStyle = `rgba(190,245,248,${0.85 * shimmer})`; g.beginPath(); g.arc(x, y, 2.3 * lz + 0.4, 0, TAU); g.fill();
      } else {
        g.strokeStyle = `rgba(255,214,160,${0.85 * shimmer})`; g.lineWidth = 1.3 * lz; g.beginPath(); g.arc(x, y, 3.6 * lz + 0.4, 0, TAU); g.stroke();
        g.fillStyle = `rgba(${COP},0.9)`; g.beginPath(); g.arc(x, y, 1.2 * lz + 0.2, 0, TAU); g.fill();
      }
    }
  }
  g.restore();
  void k0;
}

function drawPulses(g, t, lz, amp) {
  const R = W.R;
  for (let i = 0; i < W.paths.length; i++) {
    const P = W.paths[i];
    const tt = t - P.t0 + P.phase;
    if (t < P.t0) continue;
    const cyc = Math.floor(tt / P.period);
    const local = (tt - cyc * P.period) / P.travel;
    if (local < 0 || local > 1) continue;
    const dir = (cyc & 1) ? -1 : 1;
    const u = local;
    const head = (dir > 0 ? u : 1 - u) * P.total;
    const K = 18, step = P.total * 0.014;
    const a0 = amp * Math.min(1, u * 6) * Math.min(1, (1 - u) * 6);
    for (let j = 0; j < K; j++) {
      const s0 = head - dir * j * step, s1 = head - dir * (j + 1) * step;
      pointAt(P, s0); const x0 = _x, y0 = _y;
      pointAt(P, s1);
      const idx = clamp(Math.round(((s0 - P.seamS) / (R * 1.6) + 1) / 2 * 64), 0, 64);
      const fr = 1 - j / K;
      g.globalAlpha = a0 * Math.pow(fr, 1.3);
      g.strokeStyle = LUT[idx];
      g.lineWidth = (4 * fr + 0.8) * lz;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(_x, _y); g.stroke();
    }
    pointAt(P, head);
    const idx = clamp(Math.round(((head - P.seamS) / (R * 1.6) + 1) / 2 * 64), 0, 64);
    g.globalAlpha = a0;
    g.fillStyle = LUT_HI[idx];
    g.beginPath(); g.arc(_x, _y, 3.4 * lz + 0.5, 0, TAU); g.fill();
    // ripple in the seam as the signal crosses it
    const uc = dir > 0 ? P.seamS / P.total : 1 - P.seamS / P.total;
    const age = (u - uc) * P.travel;
    if (age >= 0 && age < 1.2) {
      const q = age / 1.2;
      g.globalAlpha = a0 * 0.55 * (1 - q) * (1 - q);
      g.strokeStyle = `rgb(${HYB})`; g.lineWidth = 1.2 * lz;
      g.beginPath(); g.arc(0, P.bridge, R * (0.06 + 0.34 * easeOut(q)), 0, TAU); g.stroke();
    }
  }
  g.globalAlpha = 1;
}

function lab(g, text, x, y, align, rgb, a) {
  if (a <= 0.01) return;
  g.font = MONO; g.textAlign = align; g.textBaseline = 'alphabetic';
  if (W.ls) g.letterSpacing = '1.8px';
  g.fillStyle = `rgba(${rgb},${a})`;
  g.fillText(text, x, y);
  if (W.ls) g.letterSpacing = '0px';
}

function draw(s) {
  const { g, w, h, t, p } = s;
  const R = W.R, portrait = W.portrait;
  const intro = smooth(seg(t, 0, 1.2));
  const leave = smooth(seg(p, 0.0, 0.3));
  const bodyA = smooth(seg(t, 0.2, 1.5));
  const m = easeInOut(seg(t, 1.5, 4.1));
  const xa = -lerp(W.X0, W.xf, m), xb = lerp(W.X0, W.xf, m);
  const hy = smooth(seg(t, 3.2, 5.0));
  const pz = easeInOut(seg(p, 0.16, 0.95));
  const Z = Math.pow(9, pz);
  const lz = 1 / Math.pow(Z, 0.55);
  const breath = 0.5 + 0.5 * Math.sin(t * 0.85);
  const dx = (s.px - 0.5) * -14, dy = (s.py - 0.5) * -9;

  // ground + background plane
  g.fillStyle = GROUND; g.fillRect(0, 0, w, h);
  g.globalAlpha = intro; g.drawImage(W.bg, 0, 0, w, h); g.globalAlpha = 1;

  // far field: out of focus cells and out of focus pads, drifting slowly
  for (let i = 0; i < W.bokeh.length; i++) {
    const b = W.bokeh[i];
    const x = b.x + Math.sin(t * b.sp + b.ph) * 10 + dx * 0.4;
    const y = b.y + Math.cos(t * b.sp * 0.8 + b.ph) * 8 + dy * 0.4;
    g.globalAlpha = b.a * intro * (1 - leave * 0.8);
    g.drawImage(b.side ? W.bokehCop : W.bokehBio, x - b.r, y - b.r, b.r * 2, b.r * 2);
  }
  g.globalAlpha = 1;

  // plate
  g.globalAlpha = intro * (1 - leave);
  g.drawImage(W.plate, 0, 0, w, h);
  g.globalAlpha = 1;

  // ---- world (abstract frame, camera descends into the seam) ----
  g.save();
  g.translate(W.cx + dx * 0.6, W.cy + dy * 0.6);
  if (portrait) g.rotate(Math.PI / 2);
  g.scale(Z, Z);

  // signal axis
  const axisLen = (portrait ? h : w);
  g.globalAlpha = intro * 0.8 * (1 - pz);
  g.strokeStyle = `rgba(${HYB},0.09)`; g.lineWidth = 1 * lz;
  g.beginPath(); g.moveTo(-axisLen, 0); g.lineTo(axisLen, 0); g.stroke();
  g.globalAlpha = 1;

  // branches (grow, then shimmer)
  g.globalAlpha = 1;
  drawTree(g, W.treeA, xa, t, true, lz);
  drawTree(g, W.treeB, xb, t, false, lz);

  // body A: soma, clipped at the seam once the two touch
  const sh = 5 * lz, sh2 = 7 * lz;
  g.save();
  g.globalAlpha = bodyA;
  g.beginPath(); g.rect(-axisLen * 4, -axisLen * 4, axisLen * 4, axisLen * 8); g.clip();
  g.translate(xa, 0);
  traceSoma(g, t, 1);
  g.save(); g.translate(sh, sh2); g.fillStyle = 'rgba(2,3,8,0.5)'; g.fill(); g.restore();
  g.save(); traceSoma(g, t, 1); g.clip();
  const SA = Math.ceil(2.7 * R);
  g.drawImage(W.somaSpr, -SA / 2, -SA / 2, SA, SA);
  g.restore();
  traceSoma(g, t, 1);
  g.strokeStyle = `rgba(190,245,248,${0.72})`; g.lineWidth = 1.5 * lz; g.stroke();
  g.save(); g.scale(0.955, 0.955); traceSoma(g, t, 1); g.strokeStyle = `rgba(${BIO},0.22)`; g.lineWidth = 1 * lz; g.stroke(); g.restore();
  g.restore();

  // body B: the die, with its pins
  g.save();
  g.globalAlpha = bodyA;
  g.beginPath(); g.rect(0, -axisLen * 4, axisLen * 4, axisLen * 8); g.clip();
  g.translate(xb, 0);
  // pins
  g.fillStyle = '#b9763a';
  for (let i = 0; i < 8; i++) {
    const px = -0.7 * R + i * 0.22 * R;
    g.fillRect(px, -0.86 * R - 0.15 * R, 0.07 * R, 0.17 * R);
    g.fillRect(px, 0.86 * R - 0.02 * R, 0.07 * R, 0.17 * R);
  }
  g.fillStyle = 'rgba(255,214,160,0.55)';
  for (let i = 0; i < 8; i++) { const px = -0.7 * R + i * 0.22 * R; g.fillRect(px, -0.86 * R - 0.15 * R, 0.025 * R, 0.17 * R); g.fillRect(px, 0.86 * R - 0.02 * R, 0.025 * R, 0.17 * R); }
  traceChip(g);
  g.save(); g.translate(sh, sh2); g.fillStyle = 'rgba(2,3,8,0.5)'; g.fill(); g.restore();
  g.save(); traceChip(g); g.clip();
  const SS = Math.ceil(2.7 * R);
  g.drawImage(W.chipSpr, -SS / 2, -SS / 2, SS, SS);
  g.restore();
  traceChip(g);
  g.strokeStyle = 'rgba(255,214,160,0.7)'; g.lineWidth = 1.5 * lz; g.stroke();
  // status lamp, blinks on a long cycle
  const lamp = Math.pow(0.5 + 0.5 * Math.sin(t * 1.6), 6);
  g.fillStyle = `rgba(255,190,110,${0.25 + 0.7 * lamp * hy})`;
  g.beginPath(); g.arc(0.74 * R, -0.62 * R, 0.035 * R, 0, TAU); g.fill();
  g.restore();

  // the seam: the hybrid, third colour between two worlds
  if (hy > 0) {
    const bb = (0.85 + 0.15 * breath) * hy;
    g.save();
    // lens shaped zone with a teal to lilac to copper gradient
    const gr = W.seamGrad || (W.seamGrad = (() => {
      const q = g.createLinearGradient(-0.2 * R, 0, 0.2 * R, 0);
      q.addColorStop(0, 'rgba(120,200,225,0)'); q.addColorStop(0.25, 'rgba(150,175,240,0.42)');
      q.addColorStop(0.5, 'rgba(218,196,255,0.7)'); q.addColorStop(0.75, 'rgba(236,170,165,0.42)'); q.addColorStop(1, 'rgba(232,161,90,0)');
      return q;
    })());
    g.globalAlpha = bb;
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(0, 0, 0.2 * R * (1 + 0.04 * breath), 0.86 * R, 0, 0, TAU); g.fill();
    // interface hairline and contact rings at each bridge
    g.globalAlpha = hy * 0.7;
    g.strokeStyle = `rgba(${HYB},0.6)`; g.lineWidth = 1 * lz; g.setLineDash([3 * lz, 4 * lz]);
    g.beginPath(); g.moveTo(0, -0.8 * R); g.lineTo(0, 0.8 * R); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < W.paths.length; i++) {
      const by = W.paths[i].bridge;
      g.strokeStyle = `rgba(${HYB},0.85)`; g.lineWidth = 1.2 * lz;
      g.beginPath(); g.moveTo(-0.2 * R, by); g.lineTo(0.2 * R, by); g.stroke();
      g.beginPath(); g.arc(-0.2 * R, by, 0.032 * R, 0, TAU); g.stroke();
      g.beginPath(); g.rect(0.2 * R - 0.03 * R, by - 0.03 * R, 0.06 * R, 0.06 * R); g.stroke();
    }
    // organelles in the die, pads in the membrane
    for (let i = 0; i < W.mix.length; i++) {
      const q = W.mix[i];
      const a = smooth(seg(t, q.d - 0.9, q.d + 0.5)) * (0.55 + 0.25 * Math.sin(t * 0.7 + q.ph));
      if (a <= 0) continue;
      g.globalAlpha = a * hy;
      if (q.sq) { g.fillStyle = `rgba(${COP},0.9)`; g.fillRect(q.x - q.s, q.y - q.s, q.s * 2, q.s * 2); }
      else { g.fillStyle = `rgba(${BIO},0.9)`; g.beginPath(); g.arc(q.x, q.y, q.s, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  // signals, both ways, through the seam
  drawPulses(g, t, lz, smooth(seg(t, 4.0, 4.6)) * (1 - pz * 0.35));

  // first contact: a single ring leaves the seam
  const cA = t - 3.25;
  if (cA > 0 && cA < 1.6) {
    const q = cA / 1.6;
    g.globalAlpha = 0.6 * (1 - q) * (1 - q);
    g.strokeStyle = `rgb(${HYB})`; g.lineWidth = 1.4 * lz;
    g.beginPath(); g.ellipse(0, 0, R * (0.1 + 0.9 * easeOut(q)) * 0.5, R * (0.1 + 0.9 * easeOut(q)), 0, 0, TAU); g.stroke();
    g.globalAlpha = 1;
  }
  g.restore();

  { const sa = smooth(seg(p, 0.04, 0.34)); if (sa > 0) { g.globalAlpha = sa; g.drawImage(W.shade, 0, 0, w, h); g.globalAlpha = 1; } }

  // ---- labels on the plate ----
  const la = smooth(seg(t, 1.2, 2.4)) * (1 - leave);
  if (!portrait) {
    lab(g, 'BIOLOGICAL', 48, 92, 'left', BIO, 0.72 * la);
    lab(g, 'COMPUTATIONAL', w - 48, 92, 'right', COP, 0.72 * la);
    lab(g, 'HYBRID', W.cx, W.cy - 0.86 * R - 36 + dy * 0.6, 'center', HYB, 0.82 * la * hy);
    g.globalAlpha = 0.4 * la * hy; g.strokeStyle = `rgb(${HYB})`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(W.cx + dx * 0.6, W.cy - 0.86 * R - 28 + dy * 0.6); g.lineTo(W.cx + dx * 0.6, W.cy - 0.86 * R - 8 + dy * 0.6); g.stroke(); g.globalAlpha = 1;
  } else {
    lab(g, 'BIOLOGICAL', 24, 84, 'left', BIO, 0.72 * la);
    lab(g, 'COMPUTATIONAL', 24, h * 0.6 + 26, 'left', COP, 0.72 * la);
    lab(g, 'HYBRID', w - 24, W.cy + 4, 'right', HYB, 0.82 * la * hy);
  }

  // ---- departure: the page ground grows out of the junction ----
  const dgrow = easeInOut(seg(p, 0.5, 0.95));
  if (dgrow > 0) {
    const diag = Math.hypot(w, h) * 1.15;
    const rad = dgrow * diag;
    const cx = W.cx + dx * 0.6, cy = W.cy + dy * 0.6;
    g.drawImage(W.disc, cx - rad, cy - rad, rad * 2, rad * 2);
    g.globalAlpha = (1 - seg(p, 0.8, 0.95)) * 0.55;
    g.strokeStyle = `rgb(${HYB})`; g.lineWidth = 1.2;
    g.beginPath(); g.arc(cx, cy, rad * 0.86, 0, TAU); g.stroke();
    g.globalAlpha = 1;
  }

  // ---- atmosphere: filmic grain that settles out with the departure ----
  const ga = 0.55 * intro * (1 - seg(p, 0.5, 0.95));
  if (ga > 0.005) {
    const fr = Math.floor(t * 8);
    const ox = (fr * 53) % 192, oy = (fr * 97) % 192;
    g.globalAlpha = ga;
    for (let X = -ox; X < w; X += 192) for (let Y = -oy; Y < h; Y += 192) g.drawImage(W.grain, X, Y);
    g.globalAlpha = 1;
  }
  const fin = seg(p, 0.9, 0.995);
  if (fin > 0) { g.globalAlpha = fin; g.fillStyle = GROUND; g.fillRect(0, 0, w, h); g.globalAlpha = 1; }
  if (p >= 0.995) { g.fillStyle = GROUND; g.fillRect(0, 0, w, h); }
}

export const scene = { id: 'artificial-self', duration: 5.4, still: 8.1, setup, draw };
export default scene;
