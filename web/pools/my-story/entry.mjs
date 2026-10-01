/*
 * My Story: a sketchbook page. A chair nearly completes itself in graphite, the
 * last leg goes slightly wrong, the pencil hovers in comic silence, a red
 * pencil scribbles the correction, and the page turns to a new, subtly
 * different chair. A faint ladder in the margin gains a rung every cycle.
 *
 * Cycle (10 s), seconds:
 *   0.5  1.05  construction lines (light graphite)
 *   1.1  1.6   dimension line (blue ink pen)
 *   1.7  3.6   the chair, stroke by stroke
 *   3.65 4.2   the last leg, drawn too long
 *   4.2  5.0   the pencil hovers (the beat of silence)
 *   4.95 6.35  red pencil: scribble, tick, arrow, a few words
 *   6.9  7.5   a rung on the ladder
 *   8.35 9.45  eraser wipes the sheet left to right, leaving a faint ghost
 * Arrival is the first cycle up to the note (6.4 s). Then the loop carries on.
 */
import { clamp, lerp, seg, smooth, easeInOut, rng } from '/web/shared/pool-entry/pool-entry.mjs';

const GROUND = '#f1ecdf';           // keep identical to --entry-ground in pool.css
const GRAPH = '#2b2a27';
const GRAPH_L = '#8f8b80';
const GRAPH_XL = '#bdb8aa';
const GHOST = '#ddd8cc';
const GHOST_RED = '#e6c8b4';
const BLUE = '#2b4a93';
const RED = '#d2501d';
const CYCLE = 10;
const NOTES = ['shorter.', 'this leg, shorter', 'measure twice', 'a bit less leg', 'ok, shorter'];

let L = null;
let paperTex = null, inkC = null, inkG = null, grainPat = null, wipeTex = null;
const sprites = {};
const cache = new Map();
const HEAD = { x: 0, y: 0 };

/* ---------- pre-rendered sprites ---------- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

function buildPaper(s) {
  const { w, h, dpr } = s;
  const c = mk(w * dpr, h * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr);
  const r = rng(77);
  for (let i = 0; i < 46; i++) {
    const x = r() * w, y = r() * h, rad = (0.15 + r() * 0.4) * Math.max(w, h);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const warm = r() < 0.5;
    gr.addColorStop(0, warm ? 'rgba(206,188,140,0.07)' : 'rgba(255,255,250,0.10)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  const n = Math.round(w * h / 260);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, a = r() * 6.283, l = 2 + r() * 7;
    g.strokeStyle = r() < 0.7 ? `rgba(120,104,76,${0.04 + r() * 0.07})` : `rgba(255,255,255,${0.2 + r() * 0.3})`;
    g.lineWidth = 0.5 + r() * 0.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < n * 0.35; i++) {
    g.fillStyle = `rgba(90,76,52,${0.05 + r() * 0.13})`;
    const q = 0.4 + r() * 0.7; g.fillRect(r() * w, r() * h, q, q);
  }
  const v = g.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.hypot(w, h) * 0.62);
  v.addColorStop(0, 'rgba(120,98,56,0)'); v.addColorStop(1, 'rgba(120,98,56,0.17)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  return c;
}

function buildGrain(s) {
  const c = mk(128, 128); const g = c.getContext('2d'); const im = g.createImageData(128, 128); const r = rng(5);
  for (let i = 0; i < 128 * 128; i++) {
    const a = Math.pow(r(), 2.1) * 255 * 0.85;
    im.data[i * 4] = 0; im.data[i * 4 + 1] = 0; im.data[i * 4 + 2] = 0; im.data[i * 4 + 3] = a;
  }
  g.putImageData(im, 0, 0);
  return g.createPattern(c, 'repeat');
}

function buildWipeTex() {
  const c = mk(512, 1); const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.91)'); gr.addColorStop(0.38, 'rgba(0,0,0,0.91)');
  gr.addColorStop(0.62, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 1);
  return c;
}

/** A pencil with its tip at (4, mid) and its body running along +x. */
function buildPencil(len, body, band, lead, dpr) {
  const wd = len * 0.058, pad = 6;
  const c = mk((len + pad * 2) * dpr, (wd + pad * 2) * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr);
  const my = pad + wd / 2, x0 = pad;
  const wood = g.createLinearGradient(0, my - wd / 2, 0, my + wd / 2);
  wood.addColorStop(0, '#ecd9aa'); wood.addColorStop(1, '#c4a56c');
  g.fillStyle = wood;
  g.beginPath(); g.moveTo(x0, my); g.lineTo(x0 + len * 0.15, my - wd / 2); g.lineTo(x0 + len * 0.15, my + wd / 2); g.closePath(); g.fill();
  g.fillStyle = lead;
  g.beginPath(); g.moveTo(x0, my); g.lineTo(x0 + len * 0.045, my - wd * 0.17); g.lineTo(x0 + len * 0.045, my + wd * 0.17); g.closePath(); g.fill();
  const bg = g.createLinearGradient(0, my - wd / 2, 0, my + wd / 2);
  bg.addColorStop(0, 'rgba(255,255,255,0.38)'); bg.addColorStop(0.3, 'rgba(255,255,255,0)'); bg.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = body; g.fillRect(x0 + len * 0.15, my - wd / 2, len * 0.74, wd);
  g.fillStyle = bg; g.fillRect(x0 + len * 0.15, my - wd / 2, len * 0.74, wd);
  g.fillStyle = band; g.fillRect(x0 + len * 0.2, my - wd / 2, len * 0.012, wd);
  g.fillRect(x0 + len * 0.225, my - wd / 2, len * 0.006, wd);
  g.fillStyle = '#b9b4a6'; g.fillRect(x0 + len * 0.89, my - wd / 2, len * 0.06, wd);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  for (let i = 0; i < 3; i++) g.fillRect(x0 + len * (0.905 + i * 0.016), my - wd / 2, 1, wd);
  g.fillStyle = '#d99a8a'; g.beginPath();
  g.roundRect ? g.roundRect(x0 + len * 0.95, my - wd / 2, len * 0.05, wd, wd * 0.3) : g.rect(x0 + len * 0.95, my - wd / 2, len * 0.05, wd);
  g.fill();
  return { c, w: len + pad * 2, h: wd + pad * 2, tx: pad, ty: my };
}

/* ---------- layout ---------- */
function layout(s) {
  const { w, h, portrait } = s;
  if (portrait) {
    const u = Math.min(w * 0.31, h * 0.155);
    L = {
      portrait, u, cx: w * 0.46, fy: h * 0.775, reg: [0, h * 0.34, w, h * 0.66],
      lad: { x: w * 0.9, top: h * 0.5, bot: h * 0.9, hw: w * 0.045, lean: w * 0.02 },
      len: Math.min(w * 0.5, 190),
      rest: { pencil: [w * 0.05, h * 0.915, -0.04], blue: [w * 0.09, h * 0.975, 0.02], red: [w * 0.07, h * 0.945, -0.03], eraser: [w * 0.56, h * 0.955, 0.1] },
    };
  } else {
    const u = Math.min(h * 0.255, w * 0.16);
    L = {
      portrait, u, cx: w * 0.69, fy: h * 0.77, reg: [w * 0.36, h * 0.04, w * 0.64, h * 0.95],
      lad: { x: w * 0.935, top: h * 0.13, bot: h * 0.84, hw: h * 0.045, lean: h * 0.03 },
      len: Math.min(h * 0.27, 260),
      rest: { pencil: [w * 0.5, h * 0.935, -0.04], blue: [w * 0.56, h * 0.97, 0.02], red: [w * 0.63, h * 0.945, -0.02], eraser: [w * 0.865, h * 0.95, 0.12] },
    };
  }
}

/* ---------- one cycle: a chair, as timed strokes ---------- */
function dense(ctrl, r, amp, step = 6) {
  const out = []; const ph1 = r() * 6.28, ph2 = r() * 6.28, f1 = 0.04 + r() * 0.04, f2 = 0.11 + r() * 0.05;
  let acc = 0;
  for (let i = 0; i < ctrl.length - 1; i++) {
    const a = ctrl[i], b = ctrl[i + 1]; const dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1;
    const n = Math.max(1, Math.ceil(len / step)); const nx = -dy / len, ny = dx / len;
    for (let j = i ? 1 : 0; j <= n; j++) {
      const f = j / n; const d = acc + len * f;
      const off = amp * (Math.sin(ph1 + d * f1) * 0.6 + Math.sin(ph2 + d * f2) * 0.4);
      out.push(a[0] + dx * f + nx * off, a[1] + dy * f + ny * off);
    }
    acc += len;
  }
  return out;
}
function bez(a, c, b, n = 14) {
  const o = [];
  for (let i = 0; i <= n; i++) { const f = i / n, m = 1 - f; o.push([m * m * a[0] + 2 * m * f * c[0] + f * f * b[0], m * m * a[1] + 2 * m * f * c[1] + f * f * b[1]]); }
  return o;
}
function mkEv(xy, o) {
  const cum = [0]; let tot = 0;
  for (let i = 2; i < xy.length; i += 2) { tot += Math.hypot(xy[i] - xy[i - 2], xy[i + 1] - xy[i - 1]); cum.push(tot); }
  return { kind: 'draw', xy, cum, total: tot || 1, col: o.col, ghost: o.ghost || o.col, w: o.w, tool: o.tool, t0: 0, t1: 0 };
}

function buildCycle(k, s) {
  const r = rng(900 + k * 131);
  const { u, cx: bx, fy: by } = L;
  const style = k % 3;
  const sw = 0.86 + r() * 0.16, sd = 0.7 + r() * 0.12, sh = 0.98 + r() * 0.1, bh = 0.9 + r() * 0.28;
  const spl = 0.03 + r() * 0.05, lean = 0.04 + r() * 0.1, th = 0.08;
  const cx = bx + (r() - 0.5) * 0.12 * u, fy = by + (r() - 0.5) * 0.05 * u;
  const P = (x, y, z) => [cx + (x - sw / 2 + (z - sd / 2) * 0.56) * u, fy - (y + z * 0.34) * u];
  const S = (...pts) => pts.map((q) => P(q[0], q[1], q[2]));
  const wrongFL = style === 1;
  const ev = { constr: [], dim: [], fin: [], wrong: null, hover: null, red: [], text: null, rung: null, crumbs: [], all: [] };
  const lw = Math.max(1.5, u * 0.0105);
  const add = (grp, ctrl, o, amp = 0.7, step) => { const e = mkEv(dense(ctrl, r, amp, step), o); ev[grp].push(e); return e; };
  const gp = { col: GRAPH, ghost: GHOST, w: lw, tool: 'pencil' };
  const cl = { col: GRAPH_XL, ghost: 'rgba(0,0,0,0)', w: Math.max(1, lw * 0.7), tool: 'pencil' };

  const top = sh + bh;
  // construction: floor, back-floor, two guides, seat box ghost, one stray diagonal
  add('constr', [[cx - 1.1 * u, fy + 2], [cx + 1.15 * u, fy - 1]], cl, 1.2);
  add('constr', S([-0.1, 0, 0], [sw + 0.12, 0, 0], [sw + 0.12 + 0.02, 0, sd + 0.05]), cl, 1.1);
  add('constr', S([-0.04, -0.02, 0], [-0.02, top + 0.16, 0]), cl, 0.9);
  add('constr', S([sw + 0.03, -0.02, 0], [sw + 0.05, top + 0.12, 0]), cl, 0.9);
  add('constr', S([-0.06, sh + 0.03, -0.04], [sw + 0.1, sh + 0.02, -0.04], [sw + 0.12, sh + 0.02, sd + 0.1], [-0.05, sh + 0.01, sd + 0.1], [-0.06, sh + 0.03, -0.04]), cl, 0.9);

  // blue dimension: floor to seat, standing off to the left
  const dx = -0.3;
  add('dim', [P(dx - 0.05, 0.0, 0), P(dx + 0.05, 0.0, 0), P(dx, 0.0, 0), P(dx, sh, 0), P(dx + 0.05, sh, 0), P(dx - 0.05, sh, 0), P(dx, sh, 0), P(dx + 0.025, sh - 0.12, 0), P(dx, sh, 0), P(dx - 0.025, sh - 0.12, 0)],
    { col: BLUE, ghost: '#d3d6df', w: lw * 0.85, tool: 'blue' }, 0.4);

  // the chair itself
  const FL = [0, sh, 0], FR = [sw, sh, 0], BR = [sw, sh, sd], BL = [0, sh, sd];
  add('fin', S(FL, FR, BR, BL, FL), gp);
  add('fin', S([0, sh, 0], [0, sh - th, 0], [sw, sh - th, 0], [sw, sh, 0]), gp);
  add('fin', S([sw, sh - th, 0], [sw, sh - th, sd]), gp);
  const leg = (x, z, sx) => S([x, sh - th * (z ? 0.2 : 1), z], [x + sx * spl, 0, z]);
  add('fin', leg(0, sd, -1), gp, 0.5);
  add('fin', leg(sw, sd, 1), gp, 0.5);
  if (wrongFL) add('fin', leg(sw, 0, 1), gp, 0.5); else add('fin', leg(0, 0, -1), gp, 0.5);
  const lx = lean;
  add('fin', S([0.02, sh, sd], [0.02 + lx * 0.2, top, sd + lx * 0.5]), gp, 0.5);
  add('fin', S([sw - 0.02, sh, sd], [sw - 0.02 + lx * 0.2, top, sd + lx * 0.5]), gp, 0.5);
  const rl = P(0.02 + lx * 0.2, top, sd + lx * 0.5), rr = P(sw - 0.02 + lx * 0.2, top, sd + lx * 0.5);
  if (style === 2) add('fin', bez(rl, [(rl[0] + rr[0]) / 2, rl[1] - 0.2 * u], rr), gp, 0.5);
  else add('fin', [rl, [(rl[0] + rr[0]) / 2, (rl[1] + rr[1]) / 2 - 0.03 * u], rr], gp, 0.6);
  if (style === 1) {
    for (const f of [0.38, 0.7]) add('fin', S([0.02 + lx * 0.2 * f, sh + bh * f, sd + lx * 0.5 * f], [sw - 0.02 + lx * 0.2 * f, sh + bh * f, sd + lx * 0.5 * f]), gp, 0.5);
  } else {
    const n = style === 0 ? 3 : 1;
    for (let i = 1; i <= n; i++) {
      const f = i / (n + 1); const x = lerp(0.02, sw - 0.02, f);
      add('fin', S([x, sh, sd], [x + lx * 0.2, top - (style === 2 ? 0.1 : 0.02), sd + lx * 0.5]), gp, 0.5);
    }
  }
  add('fin', S([0.01, 0.4, 0], [sw + 0.01, 0.4, 0]), { ...gp, w: lw * 0.85 }, 0.5);
  // a little hatched shadow on the floor
  const hs = []; const hx0 = cx - 0.5 * u, hx1 = cx + 0.85 * u, hy = fy + 0.07 * u;
  for (let i = 0; i < 7; i++) { const x = lerp(hx0, hx1, i / 6); hs.push([x, hy + (i % 2 ? 0.045 : -0.0) * u], [x + 0.07 * u, hy + (i % 2 ? 0.0 : 0.045) * u]); }
  add('fin', hs, { col: GRAPH_L, ghost: GHOST, w: lw * 0.75, tool: 'pencil' }, 0.3);

  // the wrong leg: a touch too long and skewed
  const wx = wrongFL ? 0 : sw, wsx = wrongFL ? -1 : 1;
  const wTop = P(wx, sh - th, 0);
  const wFloor = P(wx + wsx * spl, 0, 0);
  const wEnd = P(wx + wsx * (spl + 0.065), -0.25, 0);
  ev.wrong = mkEv(dense([wTop, wFloor, wEnd], r, 0.5), gp);
  ev.floorPt = wFloor; ev.endPt = wEnd;

  // correction in red: scribble over the extra leg, a tick, an arrow, a few words
  const rw = Math.max(1.8, u * 0.0125);
  const rc = { col: RED, ghost: GHOST_RED, w: rw, tool: 'red' };
  const dxv = wEnd[0] - wFloor[0], dyv = wEnd[1] - wFloor[1]; const dl = Math.hypot(dxv, dyv) || 1;
  const nx = -dyv / dl, ny = dxv / dl; const zig = [];
  const half = 0.09 * u;
  for (let i = 0; i <= 8; i++) {
    const f = i / 8, sg = i % 2 ? 1 : -1;
    zig.push([wFloor[0] + dxv * (f * 1.12 - 0.04) + nx * half * sg, wFloor[1] + dyv * (f * 1.12 - 0.04) + ny * half * sg]);
  }
  add('red', zig, rc, 0.5, 4);
  add('red', [[wFloor[0] - 0.15 * u, wFloor[1] + 0.025 * u], [wFloor[0] + 0.16 * u, wFloor[1] - 0.025 * u]], rc, 0.4);
  const fs = clamp(u * 0.115, 15, 24);
  const note = NOTES[k % NOTES.length];
  s.g.font = `italic 400 ${fs}px Alegreya, Georgia, serif`;
  const tw = s.g.measureText(note).width;
  const side = L.portrait ? -1 : 1;
  const tx = clamp(wEnd[0] + (side > 0 ? 0.3 : -0.1) * u - (side < 0 ? tw * 0.4 : 0), 8, s.w - tw - 8);
  const ty = Math.min(wEnd[1] + 0.34 * u, s.h * (L.portrait ? 0.9 : 0.9));
  const arrS = [tx + tw * 0.12, ty - fs * 1.05], arrE = [wEnd[0] + 0.035 * u, wEnd[1] + 0.04 * u];
  const arrC = [lerp(arrS[0], arrE[0], 0.2), lerp(arrS[1], arrE[1], 0.75)];
  const ap = bez(arrS, arrC, arrE, 10);
  const ah = 0.06 * u;
  ap.push([arrE[0] + ah * 0.9, arrE[1] + ah * 0.9], arrE, [arrE[0] - ah * 0.5, arrE[1] + ah * 1.1]);
  add('red', ap, { ...rc, w: rw * 0.85 }, 0.3);
  ev.text = { kind: 'text', note, x: tx, y: ty, fs, w: tw, t0: 0, t1: 0, col: RED, ghost: GHOST_RED, tool: 'red' };

  // ladder rung drawn this cycle
  const ld = L.lad; const nrung = 3 + (k % 4);
  const ladX = (v) => ld.x + ld.lean * (1 - v);        // v: 0 top .. 1 bottom
  const ladY = (v) => lerp(ld.top, ld.bot, v);
  const rv = lerp(0.18, 0.88, (nrung - 1 + 0.5) / 6);
  const rw0 = ladX(rv) - ld.hw * (0.6 + 0.55 * rv), rw1 = ladX(rv) + ld.hw * (0.6 + 0.55 * rv);
  ev.rung = mkEv(dense([[rw0, ladY(rv)], [rw1, ladY(rv) - 1.5]], r, 0.5), { col: GRAPH_L, ghost: GHOST, w: lw * 0.9, tool: 'pencil' });
  ev.nrung = nrung;

  // timeline
  const place = (list, a, b, gap = 0.02) => {
    const tot = list.reduce((m, e) => m + Math.pow(e.total, 0.7), 0);
    let t = a; const span = b - a - gap * (list.length - 1);
    for (const e of list) { const d = span * Math.pow(e.total, 0.7) / tot; e.t0 = t; e.t1 = t + d; t += d + gap; }
  };
  place(ev.constr, 0.5, 1.05, 0.03);
  place(ev.dim, 1.1, 1.6);
  place(ev.fin, 1.7, 3.6);
  ev.wrong.t0 = 3.65; ev.wrong.t1 = 4.2;
  ev.hover = { kind: 'hover', t0: 4.2, t1: 5.0, tool: 'pencil', x: wEnd[0], y: wEnd[1] };
  ev.red[0].t0 = 4.95; ev.red[0].t1 = 5.45;
  ev.red[1].t0 = 5.5; ev.red[1].t1 = 5.6;
  ev.red[2].t0 = 5.65; ev.red[2].t1 = 5.92;
  ev.text.t0 = 5.95; ev.text.t1 = 6.4;
  ev.rung.t0 = 6.9; ev.rung.t1 = 7.5;

  // bounds, eraser crumbs
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const e of [...ev.fin, ev.wrong]) for (let i = 0; i < e.xy.length; i += 2) { x0 = Math.min(x0, e.xy[i]); x1 = Math.max(x1, e.xy[i]); y0 = Math.min(y0, e.xy[i + 1]); y1 = Math.max(y1, e.xy[i + 1]); }
  ev.bx0 = x0 - 0.35 * u; ev.bx1 = Math.max(x1, tx + tw) + 0.25 * u; ev.by0 = y0; ev.by1 = y1;
  for (let i = 0; i < 8; i++) ev.crumbs.push({ x: lerp(x0, x1, r()), y: fy + (0.03 + r() * 0.1) * u, s: 1.4 + r() * 2.2, a: r() * 3 });
  ev.timed = [...ev.constr, ...ev.dim, ...ev.fin, ev.wrong, ...ev.red, ev.rung];
  ev.tools = {
    pencil: [...ev.constr, ...ev.fin, ev.wrong, ev.hover, ev.rung].sort((a, b) => a.t0 - b.t0),
    blue: ev.dim, red: [...ev.red, ev.text].sort((a, b) => a.t0 - b.t0),
  };
  return ev;
}

function cycle(k, s) {
  let c = cache.get(k);
  if (!c) {
    c = buildCycle(k, s); cache.set(k, c);
    if (cache.size > 4) for (const key of cache.keys()) { if (key < k - 2) cache.delete(key); }
  }
  return c;
}

/* ---------- drawing ---------- */
function strokePart(g, e, frac, col, wMul = 1) {
  const { xy, cum, total, w } = e; const target = total * frac;
  g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
  const n = xy.length / 2; let hx = xy[0], hy = xy[1];
  for (let i = 1; i < n; i++) {
    const c0 = cum[i - 1], c1 = cum[i]; if (c0 >= target) break;
    let x1 = xy[i * 2], y1 = xy[i * 2 + 1];
    if (c1 > target) { const f = (target - c0) / (c1 - c0); x1 = lerp(xy[i * 2 - 2], x1, f); y1 = lerp(xy[i * 2 - 1], y1, f); }
    const pf = c0 / total;
    g.lineWidth = w * wMul * (0.8 + 0.32 * Math.sin(Math.PI * Math.min(1, pf * 0.92 + 0.04)));
    g.beginPath(); g.moveTo(xy[i * 2 - 2], xy[i * 2 - 1]); g.lineTo(x1, y1); g.stroke();
    hx = x1; hy = y1;
  }
  HEAD.x = hx; HEAD.y = hy;
}
const pen = (x) => 0.12 + 0.88 * easeInOut(x) * 0.5 + 0.88 * 0.5 * x;  // a hand: eases in, mostly steady

function headAt(e, c) {
  if (e.kind === 'hover') { HEAD.x = e.x; HEAD.y = e.y; return; }
  if (e.kind === 'text') { const f = seg(c, e.t0, e.t1); HEAD.x = e.x + e.w * f; HEAD.y = e.y; return; }
  const f = pen(seg(c, e.t0, e.t1)); const target = e.total * f; const n = e.xy.length / 2;
  let i = 1; while (i < n - 1 && e.cum[i] < target) i++;
  const c0 = e.cum[i - 1], c1 = e.cum[i]; const q = c1 > c0 ? clamp((target - c0) / (c1 - c0)) : 0;
  HEAD.x = lerp(e.xy[i * 2 - 2], e.xy[i * 2], q); HEAD.y = lerp(e.xy[i * 2 - 1], e.xy[i * 2 + 1], q);
}
function startOf(e) { if (e.kind === 'hover') return [e.x, e.y]; if (e.kind === 'text') return [e.x, e.y]; return [e.xy[0], e.xy[1]]; }
function endOf(e) { if (e.kind === 'hover') return [e.x, e.y]; if (e.kind === 'text') return [e.x + e.w, e.y]; return [e.xy[e.xy.length - 2], e.xy[e.xy.length - 1]]; }

/** Where is this tool, how far into use (0 resting .. 1 working), how high above the paper. */
const POSE = { x: 0, y: 0, m: 0, lift: 0 };
function toolPose(list, rest, c) {
  const APP = 0.42;
  let prev = null, next = null;
  for (const e of list) { if (e.t1 <= c) prev = e; else if (e.t0 > c) { next = e; break; } else { // inside
      headAt(e, c);
      const hv = e.kind === 'hover';
      POSE.x = HEAD.x + (hv ? Math.sin(c * 8.5) * 1.1 + Math.cos((c - e.t0) * 2.6) * 7 : 0);
      POSE.y = HEAD.y + (hv ? Math.cos(c * 7.3) * 0.9 + Math.sin((c - e.t0) * 2.6) * 5 : 0);
      POSE.m = 1; POSE.lift = hv ? smooth(seg(c, e.t0, e.t0 + 0.25)) * (1 - smooth(seg(c, e.t1 - 0.2, e.t1))) : 0;
      return POSE;
    } }
  const rx = rest[0], ry = rest[1];
  if (prev && next && next.t0 - prev.t1 < 0.6) {
    const [ax, ay] = endOf(prev), [bx, by] = startOf(next); const f = smooth(seg(c, prev.t1, next.t0));
    POSE.x = lerp(ax, bx, f); POSE.y = lerp(ay, by, f); POSE.m = 1; POSE.lift = Math.sin(f * Math.PI) * 0.7; return POSE;
  }
  let m = 0, ax = rx, ay = ry;
  if (next && c > next.t0 - APP) { m = 1 - (next.t0 - c) / APP; [ax, ay] = startOf(next); }
  else if (prev && c < prev.t1 + APP) { m = 1 - (c - prev.t1) / APP; [ax, ay] = endOf(prev); }
  const e = smooth(m);
  POSE.x = lerp(rx, ax, e); POSE.y = lerp(ry, ay, e); POSE.m = e; POSE.lift = Math.sin(clamp(m) * Math.PI) * 0.8; return POSE;
}

function drawTool(g, sp, x, y, ang, lift, dpr, alpha) {
  g.save();
  g.globalAlpha = alpha;
  g.shadowColor = `rgba(70,56,30,${0.3 - lift * 0.08})`;
  g.shadowBlur = (2 + lift * 14) * dpr; g.shadowOffsetX = (2 + lift * 14) * dpr; g.shadowOffsetY = (3 + lift * 20) * dpr;
  g.translate(x, y); g.rotate(ang);
  g.drawImage(sp.c, -sp.tx, -sp.ty, sp.w, sp.h);
  g.restore();
}

function drawEraser(g, x, y, ang, lift, u, dpr, alpha) {
  const w = Math.max(54, u * 0.4), h = w * 0.42;
  g.save(); g.globalAlpha = alpha;
  g.shadowColor = 'rgba(70,56,30,0.3)'; g.shadowBlur = (3 + lift * 10) * dpr; g.shadowOffsetX = (2 + lift * 8) * dpr; g.shadowOffsetY = (3 + lift * 12) * dpr;
  g.translate(x, y); g.rotate(ang);
  g.fillStyle = '#e2a898'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h * 0.2); g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.22);
  g.fillStyle = BLUE; g.fillRect(-w * 0.12, -h / 2, w * 0.4, h);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-w * 0.04, -h / 2, w * 0.03, h);
  g.restore();
}

function renderInk(s, cur, prev, c, p) {
  const g = inkG; const [rx, ry, rw, rh] = L.reg; const { dpr, u: _u } = { dpr: s.dpr };
  g.setTransform(dpr, 0, 0, dpr, -rx * dpr, -ry * dpr);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.clearRect(rx, ry, rw, rh);
  if (prev) {
    for (const e of prev.timed) if (e !== prev.rung && e.ghost !== 'rgba(0,0,0,0)') strokePart(g, e, 1, e.ghost);
    g.fillStyle = GHOST_RED; g.font = `italic 400 ${prev.text.fs}px Alegreya, Georgia, serif`; g.fillText(prev.text.note, prev.text.x, prev.text.y);
  }
  const wp = seg(c, 8.35, 9.45); const wipeLadder = cur.nrung >= 6;
  const drawLadder = () => {
    const ld = L.lad; const nr = cur.nrung - 1;
    const lw = Math.max(1.2, L.u * 0.008); g.lineCap = 'round'; g.strokeStyle = GRAPH_L; g.lineWidth = lw;
    g.beginPath();
    g.moveTo(ld.x + ld.lean - ld.hw * 0.6, ld.top); g.quadraticCurveTo(ld.x + ld.lean * 0.5 - ld.hw * 0.9, (ld.top + ld.bot) / 2, ld.x - ld.hw * 1.15, ld.bot);
    g.moveTo(ld.x + ld.lean + ld.hw * 0.6, ld.top); g.quadraticCurveTo(ld.x + ld.lean * 0.5 + ld.hw * 0.9, (ld.top + ld.bot) / 2, ld.x + ld.hw * 1.15, ld.bot);
    g.stroke();
    g.lineWidth = lw * 0.9;
    for (let i = 0; i < nr; i++) {
      const v = lerp(0.18, 0.88, (i + 0.5) / 6), xx = ld.x + ld.lean * (1 - v), hw = ld.hw * (0.6 + 0.55 * v);
      g.beginPath(); g.moveTo(xx - hw, ladYv(ld, v)); g.lineTo(xx + hw, ladYv(ld, v) - 1.5); g.stroke();
    }
    if (c >= cur.rung.t0 && c < cur.rung.t1 + 0.01) strokePart(g, cur.rung, pen(seg(c, cur.rung.t0, cur.rung.t1)), GRAPH_L);
    else if (c >= cur.rung.t1) strokePart(g, cur.rung, 1, GRAPH_L);
  };
  for (const e of cur.timed) {
    if (e.tool === 'pencil' && e === cur.rung) continue;
    if (c < e.t0) continue;
    const f = c >= e.t1 ? 1 : pen(seg(c, e.t0, e.t1));
    strokePart(g, e, f, e.col);
  }
  if (c >= cur.text.t0) {
    const f = seg(c, cur.text.t0, cur.text.t1);
    g.save(); g.beginPath(); g.rect(cur.text.x - 3, cur.text.y - cur.text.fs * 1.3, (cur.text.w + 6) * f, cur.text.fs * 1.7); g.clip();
    g.fillStyle = RED; g.font = `italic 400 ${cur.text.fs}px Alegreya, Georgia, serif`; g.fillText(cur.text.note, cur.text.x, cur.text.y); g.restore();
  }
  if (wipeLadder) drawLadder();
  if (wp > 0) {
    const front = lerp(cur.bx0, cur.bx1, easeInOut(wp)); const k = 0.5 * (L.u / 200) + 0.3;
    const dx = front - 256 * k;
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,0.91)'; g.fillRect(rx, ry, Math.max(0, dx - rx), rh);
    g.drawImage(wipeTex, dx, ry, 512 * k, rh);
    g.globalCompositeOperation = 'source-over';
  }
  if (!wipeLadder) drawLadder();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = grainPat; g.fillRect(rx, ry, rw, rh);
  g.globalCompositeOperation = 'source-over';
}
function ladYv(ld, v) { return lerp(ld.top, ld.bot, v); }

export default {
  id: 'my-story',
  duration: 6.4,
  still: 6.7,

  setup(s) {
    layout(s); cache.clear();
    document.fonts?.load('italic 400 20px Alegreya');
    paperTex = buildPaper(s);
    const [, , rw, rh] = L.reg;
    inkC = mk(rw * s.dpr, rh * s.dpr); inkG = inkC.getContext('2d');
    grainPat = buildGrain(s); wipeTex = buildWipeTex();
    const len = L.len, d = s.dpr;
    sprites.pencil = buildPencil(len, '#35332f', '#d8d1bd', '#2b2a27', d);
    sprites.blue = buildPencil(len * 0.92, BLUE, '#d6dcea', BLUE, d);
    sprites.red = buildPencil(len, '#c9441b', '#f1d3c4', RED, d);
  },

  draw(s) {
    const { g, w, h, p, dpr } = s;
    const t = s.t, k = Math.floor(t / CYCLE), c = t - k * CYCLE;
    const cur = cycle(k, s), prev = k > 0 ? cycle(k - 1, s) : null;
    g.fillStyle = GROUND; g.fillRect(0, 0, w, h);
    const tex = 1 - smooth(seg(p, 0, 0.85));
    if (tex > 0.002) { g.globalAlpha = tex; g.drawImage(paperTex, 0, 0, w, h); g.globalAlpha = 1; }

    const ia = 1 - smooth(seg(p, 0.1, 0.72));
    if (ia < 0.004) return;
    const dy = -smooth(p) * h * 0.1;
    g.save(); g.translate(0, dy);

    // eraser crumbs left behind
    const crumb = (ev, a) => {
      if (a < 0.01) return;
      g.fillStyle = '#c8bba6';
      for (const q of ev.crumbs) { g.globalAlpha = a * ia; g.beginPath(); g.ellipse(q.x, q.y, q.s * 1.6, q.s * 0.8, q.a, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
    };
    if (prev) crumb(prev, 1 - seg(c, 0.5, 6));

    renderInk(s, cur, prev, c, p);
    const [rx, ry, rw, rh] = L.reg;
    g.globalAlpha = ia; g.drawImage(inkC, rx, ry, rw, rh); g.globalAlpha = 1;

    const wp = seg(c, 8.35, 9.45);
    const front = lerp(cur.bx0, cur.bx1, easeInOut(wp));
    for (const q of cur.crumbs) if (front > q.x && wp > 0) { g.globalAlpha = ia * smooth(seg(front - q.x, 0, 30)); g.fillStyle = '#c8bba6'; g.beginPath(); g.ellipse(q.x, q.y, q.s * 1.6, q.s * 0.8, q.a, 0, 6.283); g.fill(); }
    g.globalAlpha = 1;

    // tools
    const toolA = ia;
    const lists = [['pencil', cur.tools.pencil, 0], ['blue', cur.tools.blue, 1], ['red', cur.tools.red, 2]];
    for (const [name, list, ] of lists) {
      const rest = L.rest[name];
      toolPose(list, rest, c);
      const use = -1.02 + Math.sin(c * 1.3 + (name === 'red' ? 1 : 0)) * 0.015;
      const ang = lerp(rest[2], use, POSE.m);
      drawTool(g, sprites[name], POSE.x, POSE.y, ang, POSE.lift + POSE.m * 0.12, dpr, toolA);
    }
    // eraser
    {
      const rest = L.rest.eraser; const a0 = 7.95, a1 = 8.35, b0 = 9.45, b1 = 9.95;
      const mid = (cur.by0 + cur.by1) / 2, amp = (cur.by1 - cur.by0) * 0.42;
      const at = (q) => { const f = lerp(cur.bx0, cur.bx1, easeInOut(q)); POSE.x = f + 18 + Math.sin(c * 15) * 5; POSE.y = mid + Math.sin(c * 6.2) * amp; };
      let m = 0;
      if (c < a1) { m = smooth(seg(c, a0, a1)); at(0); }
      else if (c <= b0) { m = 1; at(wp); }
      else { m = 1 - smooth(seg(c, b0, b1)); at(1); }
      const x = lerp(rest[0], POSE.x, m), y = lerp(rest[1], POSE.y, m);
      drawEraser(g, x, y, lerp(rest[2], -0.15 + Math.sin(c * 15) * 0.05 * m, m), m * 0.25, L.u, dpr, ia);
    }
    g.restore();
  },
};
