/*
 * AI-d kit entry: "The patch bay".
 *
 * A graphite and anodised-aluminium rack panel. A request pulse enters at the
 * left, a patch cable is drawn and plugged into one of the abstract provider
 * sockets, the pulse routes through and the readout resolves. Every price slot
 * is a hollow "?" because a missing price is unknown, never zero. Nothing on
 * the panel is a real provider, price or count.
 *
 * Arrival (5.2 s): 0.2 sockets wake column by column, 0.5-1.5 request pulse
 * runs the input trace, 1.4-2.2 candidates scan, 2.2-3.6 cable is drawn,
 * 3.6-4.3 plug seats (settle), 4.3-5.0 pulse routes through, readout resolves.
 * Rest: a quiet scan runs along the sockets; every 30 s a second request
 * patches or re-patches a cable. Depart: the panel slides away like a rack
 * drawer on scroll until only the ground remains.
 */
import { clamp, lerp, seg, smooth, easeOut, easeOutQuint, easeInOut, easeOutBack, rng } from '/web/shared/pool-entry/pool-entry.mjs';

const GROUND = '#121417'; // must equal --entry-ground in pool.css
const AMBER = '245,165,36';
const AMBER_HEX = '#f5a524';
const SANS = '"Barlow Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

const PERIOD = 30;
const E0 = [2.2, 15];
const PHASE = { retract: 0.9, draw: 1.4, seat: 0.7, pulse: 0.7 };
const TARGETS = [
  [[2, 1], [4, 3], [1, 2], [3, 0]],
  [[5, 2], [0, 1], [3, 3], [1, 0]],
];

let geo = null;
let panel = null;
let sprites = null;
let sheen = null;
let dirty = true;
let fontsHooked = false;

const cs = [{}, {}]; // per-cable state, reused every frame
const P0 = { x: 0, y: 0 };
const P1 = { x: 0, y: 0 };
const C1 = { x: 0, y: 0 };
const C2 = { x: 0, y: 0 };
const PT = { x: 0, y: 0 };

function layout(w, h, portrait) {
  const ear = portrait ? 12 : 30;
  const G = { w, h, portrait, ear };
  if (!portrait) {
    G.cols = 6; G.rows = 5;
    G.cw = Math.max(34, Math.min(86, (w * 0.36) / 6, (h * 0.6) / 5 / 1.1));
    G.ch = G.cw * 1.1;
    const gridW = G.cols * G.cw, gridH = G.rows * G.ch;
    G.gx = Math.min(w * 0.58, w - ear - 40 - gridW);
    G.gy = Math.max(h * 0.5 - gridH / 2 - 6, 96);
    G.jackX = G.gx - G.cw * 0.9;
    G.plate = { x: G.jackX - 42, y: G.gy - 46, w: gridW + (G.gx - G.jackX) + 42 + 24, h: gridH + 46 + 34 };
    G.trace = h * 0.095;
    G.title = { x: G.plate.x, y: G.plate.y - 24, size: 22 };
  } else {
    G.cols = 4; G.rows = h < 760 ? 2 : 3;
    G.cw = Math.max(34, Math.min(72, (w - ear * 2 - 120) / 4));
    G.ch = G.cw * 1.12;
    const gridW = G.cols * G.cw, gridH = G.rows * G.ch;
    G.gx = w - ear - 30 - gridW;
    G.jackX = G.gx - G.cw * 0.78;
    const plateH = gridH + 46 + 34;
    G.gy = h - 136 - plateH + 46 + 2;
    G.plate = { x: Math.max(ear + 4, G.jackX - 34), y: G.gy - 46, w: 0, h: plateH };
    G.plate.w = w - ear - 4 - G.plate.x;
    G.trace = h * 0.094;
    G.title = { x: w - ear - 8, y: G.plate.y - 14, size: 18, right: true };
  }
  G.sr = Math.min(G.cw * 0.2, G.ch * 0.2);
  G.read = { x: G.plate.x, y: G.plate.y + G.plate.h + 14, w: G.plate.w, h: portrait ? 46 : 50 };
  G.busX = G.plate.x - 12;
  G.jacks = [
    { x: G.jackX, y: G.gy + G.ch * (G.rows > 3 ? 1.0 : 0.7) },
    { x: G.jackX, y: G.gy + G.ch * (G.rows > 3 ? 3.0 : 2.1) },
  ];
  G.traces = G.jacks.map((j) => {
    const pts = [[0, G.trace], [G.busX, G.trace], [G.busX, j.y], [j.x, j.y]];
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, len, total: len[len.length - 1] };
  });
  return G;
}

const sockX = (c) => geo.gx + c * geo.cw + geo.cw / 2;
const sockY = (r) => geo.gy + r * geo.ch + geo.ch * 0.4;

function mk(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, g };
}

function engrave(g, text, x, y, size, { weight = 600, spacing = 2, align = 'left', mono = false, alpha = 1 } = {}) {
  g.font = `${mono ? 500 : weight} ${size}px ${mono ? MONO : SANS}`;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
  g.fillStyle = `rgba(0,0,0,${0.7 * alpha})`;
  g.fillText(text, x, y - 1);
  g.fillStyle = `rgba(214,212,204,${0.62 * alpha})`;
  g.fillText(text, x, y);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
}

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function screw(g, x, y, r, a) {
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  gr.addColorStop(0, '#5a5f67'); gr.addColorStop(1, '#25282d');
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(x + 1, y + 1.5, r, 0, 7); g.fill();
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = '#0c0d0f'; g.lineWidth = 1.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - Math.cos(a) * r * 0.6, y - Math.sin(a) * r * 0.6); g.lineTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); g.stroke();
}

function buildPanel(s) {
  const { w, h, dpr } = s;
  const G = geo;
  const { c, g } = mk(w, h, dpr);
  // Anodised face.
  const face = g.createLinearGradient(0, 0, 0, h);
  face.addColorStop(0, '#2c3035'); face.addColorStop(0.5, '#25292e'); face.addColorStop(1, '#202328');
  g.fillStyle = face; g.fillRect(0, 0, w, h);
  // Brushed grain, deterministic.
  const r = rng(77);
  g.lineWidth = 1;
  for (let y = 0; y < h; y += 1) {
    const a = r();
    if (a < 0.55) continue;
    g.strokeStyle = a > 0.82 ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.05)';
    const x0 = r() * w * 0.5, x1 = x0 + w * (0.35 + r() * 0.65);
    g.beginPath(); g.moveTo(x0, y + 0.5); g.lineTo(x1, y + 0.5); g.stroke();
  }
  // Rack ears: darker strips with mounting slots and screws.
  for (const side of [0, 1]) {
    const ex = side ? w - G.ear : 0;
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(ex, 0, G.ear, h);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(side ? ex : ex + G.ear - 1, 0, 1, h);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(side ? ex - 1 : ex + G.ear, 0, 1, h);
    if (!G.portrait) {
      for (let y = 62; y < h - 30; y += 74) {
        rrect(g, ex + 8, y, G.ear - 16, 34, (G.ear - 16) / 2);
        g.fillStyle = '#0b0c0e'; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 1; g.stroke();
      }
    } else {
      for (let y = 70; y < h - 20; y += 90) {
        rrect(g, ex + 4, y, G.ear - 8, 26, (G.ear - 8) / 2);
        g.fillStyle = '#0b0c0e'; g.fill();
      }
    }
  }
  // Ventilation slots in the quiet lower-left of the panel (landscape), a maker's plate on portrait.
  if (!G.portrait) {
    const vx = G.ear + 60, vy = h * 0.8;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 16; i++) {
      rrect(g, vx + i * 20, vy + row * 14, 12, 5, 2.5);
      g.fillStyle = '#0a0b0d'; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(vx + i * 20 + 2, vy + row * 14 + 5, 8, 1);
    }
    engrave(g, 'AI-D KIT / PATCH BAY / 1U', vx, vy + 58, 10.5, { spacing: 2.2, weight: 500, alpha: 0.8 });
  }
  // Panel edge bevels.
  g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(0, 0, w, 1);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, h - 2, w, 2);
  g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, h - 3, w, 1);

  // Input trace: a routed groove from the left edge to the input bus.
  const groove = (pts, width) => {
    g.lineJoin = 'round'; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.lineWidth = width + 2; g.strokeStyle = 'rgba(255,255,255,0.07)';
    g.save(); g.translate(0, 1); g.stroke(); g.restore();
    g.lineWidth = width; g.strokeStyle = '#0b0c0e'; g.stroke();
  };
  for (const t of G.traces) groove(t.pts, 3);
  engrave(g, G.portrait ? 'REQUEST IN' : 'REQUEST IN', G.portrait ? G.ear + 54 : 76, G.trace - 10, G.portrait ? 11 : 12, { spacing: 2.4 });

  // Title.
  const T = G.title;
  engrave(g, 'PATCH BAY', T.x, T.y, T.size, { spacing: 4.5, align: T.right ? 'right' : 'left' });
  if (!G.portrait) engrave(g, 'ROUTE ONE REQUEST AT A TIME', T.x + 6 + 160, T.y, 11, { spacing: 2.2, alpha: 0.8, weight: 500 });

  // Recessed plate for the matrix.
  const Pl = G.plate;
  g.save(); rrect(g, Pl.x, Pl.y, Pl.w, Pl.h, 5);
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.translate(0, 1.5); g.fill(); g.restore();
  rrect(g, Pl.x, Pl.y, Pl.w, Pl.h, 5);
  const pg = g.createLinearGradient(0, Pl.y, 0, Pl.y + Pl.h);
  pg.addColorStop(0, '#16181b'); pg.addColorStop(1, '#1b1e22');
  g.fillStyle = pg; g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 1.5; g.stroke();
  g.save(); rrect(g, Pl.x, Pl.y, Pl.w, Pl.h, 5); g.clip();
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(Pl.x, Pl.y, Pl.w, 3);
  g.restore();
  screw(g, Pl.x + 9, Pl.y + 9, 3.6, 0.5); screw(g, Pl.x + Pl.w - 9, Pl.y + 9, 3.6, 2.1);
  screw(g, Pl.x + 9, Pl.y + Pl.h - 9, 3.6, 1.2); screw(g, Pl.x + Pl.w - 9, Pl.y + Pl.h - 9, 3.6, 0.2);

  // Matrix labels: column letters and row numbers, engraved into the plate.
  const colSize = G.portrait ? 11 : 12;
  for (let ci = 0; ci < G.cols; ci++) {
    engrave(g, String.fromCharCode(65 + ci), sockX(ci), G.gy - 18, colSize, { align: 'center', spacing: 1 });
    // hairline column rule
    g.fillStyle = 'rgba(255,255,255,0.035)';
    if (ci > 0) g.fillRect(G.gx + ci * G.cw, G.gy - 8, 1, G.rows * G.ch + 4);
  }
  for (let ri = 0; ri < G.rows; ri++) {
    engrave(g, String(ri + 1), G.gx - 12, sockY(ri) + 4, colSize, { align: 'right', spacing: 0 });
    g.fillStyle = 'rgba(255,255,255,0.03)';
    if (ri > 0) g.fillRect(G.gx, G.gy + ri * G.ch - 2, G.cols * G.cw, 1);
  }
  // Jack labels and the unknown-price legend.
  engrave(g, 'IN 1', G.jacks[0].x, G.jacks[0].y - G.cw * 0.42, 10.5, { align: 'center', spacing: 1.6 });
  engrave(g, 'IN 2', G.jacks[1].x, G.jacks[1].y - G.cw * 0.42, 10.5, { align: 'center', spacing: 1.6 });
  if (!G.portrait) engrave(g, 'PROVIDER MATRIX', Pl.x + 20, Pl.y + 22, 11, { spacing: 2.4, weight: 500 });
  engrave(g, '? = PRICE UNKNOWN, NEVER ZERO', Pl.x + 20, Pl.y + Pl.h - 12, 10.5, { spacing: 1.8, weight: 500 });
  // Jack wells (empty until a cable arrives).
  for (const j of G.jacks) {
    g.drawImage(sprites.well.c, j.x - sprites.well.r, j.y - sprites.well.r, sprites.well.r * 2, sprites.well.r * 2);
  }

  // Readout window (recessed LCD) with static field labels.
  const R = G.read;
  g.save(); rrect(g, R.x, R.y, R.w, R.h, 4); g.translate(0, 1.5); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill(); g.restore();
  rrect(g, R.x, R.y, R.w, R.h, 4);
  g.fillStyle = '#0a0b0d'; g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 1.5; g.stroke();
  const fl = R.w / 3;
  for (let i = 0; i < 3; i++) {
    g.font = `600 10px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = '2px';
    g.fillStyle = `rgba(${AMBER},0.62)`;
    g.fillText(['ROUTE', 'PRICE', 'STATE'][i], R.x + 12 + i * fl, R.y + 17);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    if (i) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(R.x + i * fl - 1, R.y + 8, 1, R.h - 16); }
  }
  g.fillStyle = 'rgba(0,0,0,0.0)';
  return { c, g };
}

function buildSprites(s) {
  const { dpr } = s;
  const G = geo;
  const sr = G.sr;
  // Socket: bezel ring, recessed throat, dark hole.
  const R = sr + 5;
  const sock = mk(R * 2 + 8, R * 2 + 8, dpr);
  {
    const g = sock.g, cx = R + 4, cy = R + 4;
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(cx + 1, cy + 2, R, 0, 7); g.fill();
    let gr = g.createLinearGradient(0, cy - R, 0, cy + R);
    gr.addColorStop(0, '#565b63'); gr.addColorStop(1, '#16181b');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    gr = g.createLinearGradient(0, cy - R, 0, cy + R);
    gr.addColorStop(0, '#15171a'); gr.addColorStop(1, '#3a3e45');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, sr + 1.5, 0, 7); g.fill();
    const hg = g.createRadialGradient(cx - sr * 0.25, cy - sr * 0.3, 1, cx, cy, sr);
    hg.addColorStop(0, '#16181b'); hg.addColorStop(1, '#030304');
    g.fillStyle = hg; g.beginPath(); g.arc(cx, cy, sr - 1.5, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R - 0.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  }
  // Jack well: same family, slightly larger.
  const wr = sr + 7;
  const well = mk(wr * 2 + 6, wr * 2 + 6, dpr);
  {
    const g = well.g, cx = wr + 3, cy = wr + 3;
    let gr = g.createLinearGradient(0, cy - wr, 0, cy + wr);
    gr.addColorStop(0, '#0b0c0e'); gr.addColorStop(1, '#2f3338');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, wr, 0, 7); g.fill();
    g.fillStyle = '#050506'; g.beginPath(); g.arc(cx, cy, sr, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, wr - 0.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  }
  well.r = wr + 3; sock.r = R + 4;
  // Price slot: hollow engraved circle with a "?".
  const pr = Math.max(6, Math.min(8.5, G.cw * 0.1));
  const price = mk(pr * 2 + 6, pr * 2 + 6, dpr);
  {
    const g = price.g, cx = pr + 3, cy = pr + 3;
    g.lineWidth = 1.2;
    g.strokeStyle = 'rgba(0,0,0,0.8)'; g.beginPath(); g.arc(cx, cy - 0.8, pr, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(190,188,180,0.45)'; g.beginPath(); g.arc(cx, cy, pr, 0, 7); g.stroke();
    g.font = `500 ${Math.round(pr * 1.25)}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.8)'; g.fillText('?', cx, cy + 0.2);
    g.fillStyle = 'rgba(190,188,180,0.5)'; g.fillText('?', cx, cy + 1.2);
  }
  price.r = pr + 3;
  // Plug: top-down metal ferrule with a dark tip.
  const pl = sr + 3;
  const plug = mk(pl * 2 + 6, pl * 2 + 6, dpr);
  {
    const g = plug.g, cx = pl + 3, cy = pl + 3;
    let gr = g.createLinearGradient(cx - pl, cy - pl, cx + pl, cy + pl);
    gr.addColorStop(0, '#c9ccd1'); gr.addColorStop(0.5, '#8c9097'); gr.addColorStop(1, '#4b4f56');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, pl, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, pl - 0.5, 0, 7); g.stroke();
    gr = g.createLinearGradient(cx, cy - pl, cx, cy + pl);
    gr.addColorStop(0, '#2a2d32'); gr.addColorStop(1, '#101114');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, pl * 0.62, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, pl * 0.62, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.fillStyle = '#050506'; g.beginPath(); g.arc(cx, cy, pl * 0.2, 0, 7); g.fill();
  }
  plug.r = pl + 3;
  return { sock, well, price, plug };
}

function buildSheen(s) {
  // One soft anodised sheen band, baked once, slid by the pointer.
  const w = Math.round(s.w * 1.5), h = s.h;
  const { c, g } = mk(w, h, 1);
  const gr = g.createLinearGradient(0, 0, w, h * 0.3);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.46, 'rgba(255,255,255,0)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.035)');
  gr.addColorStop(0.58, 'rgba(255,255,255,0)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  return c;
}

function bez(a, c1, c2, b, t, out) {
  const u = 1 - t, uu = u * u, tt = t * t;
  out.x = uu * u * a.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + tt * t * b.x;
  out.y = uu * u * a.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + tt * t * b.y;
}

function cableState(ci, t, st) {
  const e0 = E0[ci];
  st.on = t >= e0;
  if (!st.on) return st;
  const n = Math.floor((t - e0) / PERIOD);
  const local = t - e0 - n * PERIOD;
  const T = TARGETS[ci];
  const R = n === 0 ? 0 : PHASE.retract;
  const tg = T[n % T.length], pg = T[(n + T.length - 1) % T.length];
  st.target = tg; st.n = n; st.start = e0 + n * PERIOD;
  st.tx = sockX(tg[0] % geo.cols); st.ty = sockY(tg[1] % geo.rows);
  st.px = sockX(pg[0] % geo.cols); st.py = sockY(pg[1] % geo.rows);
  st.col = tg[0] % geo.cols; st.row = tg[1] % geo.rows;
  st.pcol = pg[0] % geo.cols; st.prow = pg[1] % geo.rows;
  st.pulse = -1; st.lift = 0; st.settle = 0; st.sock = 0; st.psock = 0;
  st.pop = easeOutBack(seg(t, e0 + n * PERIOD * 0, e0 + 0.3));
  if (local < R) {
    st.phase = 'retract';
    const u = local / R, e = easeInOut(u);
    st.fx = lerp(st.px, geo.jacks[ci].x, e); st.fy = lerp(st.py, geo.jacks[ci].y, e);
    st.fy -= Math.sin(Math.PI * e) * Math.hypot(st.px - geo.jacks[ci].x, st.py - geo.jacks[ci].y) * 0.05;
    st.lift = smooth(u * 4); st.sag = 0.1;
    st.psock = 1 - smooth(u * 3); st.u = u;
    return st;
  }
  const l = local - R;
  const J = geo.jacks[ci];
  const dist = Math.hypot(st.tx - J.x, st.ty - J.y);
  st.u = 0;
  if (l < PHASE.draw) {
    st.phase = 'draw';
    const u = l / PHASE.draw, e = easeInOut(u);
    st.fx = lerp(J.x, st.tx, e); st.fy = lerp(J.y, st.ty, e) - Math.sin(Math.PI * e) * dist * 0.06;
    st.lift = 1; st.sag = 0.1; st.u = u;
  } else {
    st.fx = st.tx; st.fy = st.ty; st.sag = 0.1;
    const l2 = l - PHASE.draw;
    if (l2 < PHASE.seat) {
      st.phase = 'seat';
      const u = l2 / PHASE.seat;
      st.lift = 1 - easeOutBack(clamp(u / 0.62)); // dips below 0: the click
      st.settle = u;
      st.sag = 0.1 * (1 + 0.45 * Math.exp(-5.5 * u) * Math.cos(15 * u));
      st.sock = smooth(seg(u, 0.5, 1));
    } else {
      st.sock = 1;
      const l3 = l2 - PHASE.seat;
      if (l3 < PHASE.pulse) { st.phase = 'pulse'; st.pulse = l3 / PHASE.pulse; }
      else st.phase = 'live';
    }
  }
  return st;
}

function pulseOnTrace(ci, t) {
  // Request pulse for cable ci: returns progress 0..1 or -1.
  const e0 = E0[ci];
  const n0 = Math.max(0, Math.floor((t - e0) / PERIOD));
  for (let n = n0; n <= n0 + 1; n++) {
    const lead = n === 0 && ci === 0 ? 1.7 : 1.1;
    const a = e0 + n * PERIOD - lead;
    const u = (t - a) / (n === 0 && ci === 0 ? 1.0 : 1.0);
    if (u >= 0 && u < 1.15) return u;
  }
  return -1;
}

function strokeTrace(g, tr, d0, d1, lw, color) {
  if (d1 <= 0 || d0 >= tr.total) return;
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  let started = false;
  for (let i = 1; i < tr.pts.length; i++) {
    const a = tr.len[i - 1], b = tr.len[i];
    if (b < d0 || a > d1) continue;
    const s0 = Math.max(d0, a), s1 = Math.min(d1, b);
    const k0 = (s0 - a) / (b - a), k1 = (s1 - a) / (b - a);
    const x0 = lerp(tr.pts[i - 1][0], tr.pts[i][0], k0), y0 = lerp(tr.pts[i - 1][1], tr.pts[i][1], k0);
    const x1 = lerp(tr.pts[i - 1][0], tr.pts[i][0], k1), y1 = lerp(tr.pts[i - 1][1], tr.pts[i][1], k1);
    if (!started) { g.moveTo(x0, y0); started = true; }
    g.lineTo(x1, y1);
  }
  g.stroke();
}

function drawPlug(g, x, y, lift) {
  const sp = sprites.plug;
  const sc = 1 + 0.2 * lift;
  const off = 1 + 8 * Math.max(0, lift);
  g.save();
  g.fillStyle = `rgba(0,0,0,${0.32 + 0.1 * Math.max(0, lift)})`;
  g.beginPath(); g.arc(x + off * 0.5, y + off, (geo.sr + 3) * sc, 0, 7); g.fill();
  const d = sp.r * 2 * sc;
  g.drawImage(sp.c, x - d / 2, y - d / 2, d, d);
  g.restore();
}

function drawCable(g, st, ci) {
  const J = geo.jacks[ci];
  P0.x = J.x; P0.y = J.y; P1.x = st.fx; P1.y = st.fy;
  const dx = P1.x - P0.x, dist = Math.hypot(dx, P1.y - P0.y);
  const sag = st.sag * dist + 6;
  C1.x = P0.x + Math.max(36, dx * 0.32); C1.y = P0.y + sag * 0.35;
  C2.x = P1.x - dx * 0.16; C2.y = P1.y + sag;
  const bodyPath = () => { g.beginPath(); g.moveTo(P0.x, P0.y); g.bezierCurveTo(C1.x, C1.y, C2.x, C2.y, P1.x, P1.y); };
  g.lineCap = 'round'; g.lineJoin = 'round';
  // Cast shadow, offset (never a glow); tighter as the plug seats.
  const so = 3 + 6 * Math.max(0, st.lift);
  g.save(); g.translate(so * 0.6, so);
  bodyPath(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 7.5; g.stroke(); g.restore();
  bodyPath(); g.strokeStyle = '#0a0b0d'; g.lineWidth = 7.5; g.stroke();
  g.save(); g.translate(-0.8, -0.8);
  bodyPath(); g.strokeStyle = 'rgba(255,255,255,0.34)'; g.lineWidth = 1.5; g.stroke(); g.restore();
  // Routed pulse travelling the cable.
  if (st.pulse >= 0) {
    const head = easeInOut(st.pulse) * 1.0;
    const passes = [[0.13, 3.4, 0.28], [0.07, 3.2, 0.6], [0.025, 3, 1]];
    for (const [len, lw, a] of passes) {
      g.beginPath();
      const a0 = clamp(head - len), a1 = clamp(head);
      for (let k = 0; k <= 10; k++) {
        bez(P0, C1, C2, P1, lerp(a0, a1, k / 10), PT);
        if (k) g.lineTo(PT.x, PT.y); else g.moveTo(PT.x, PT.y);
      }
      g.strokeStyle = `rgba(${AMBER},${a})`; g.lineWidth = lw; g.stroke();
    }
  }
}

function drawSocketStates(g, t, states) {
  const G = geo;
  const n = G.cols * G.rows;
  const idle = t > 5.4;
  // quiet scan along the matrix, plus a decaying tail
  const rate = 2.6;
  const head = Math.floor(t * rate);
  for (let k = 0; k < 4; k++) {
    const idx = (head - k) % n; if (idx < 0) continue;
    const a = idle ? [0.55, 0.3, 0.14, 0.06][k] : 0;
    if (a) dot(g, idx % G.cols, Math.floor(idx / G.cols), a * (0.75 + 0.25 * (1 - ((t * rate) % 1))), 0);
  }
  // fast candidate sweep just before each patch lands
  for (let ci = 0; ci < 2; ci++) {
    const st = states[ci];
    const base = ci === 0 && t < E0[0] + 0.01 ? E0[0] : -1;
    let e = base;
    if (e < 0) {
      const nn = Math.floor((t - E0[ci] + 0.8) / PERIOD) + 0; // upcoming event index
      if (nn >= 1 || (ci === 1 && t < E0[1])) e = E0[ci] + Math.max(nn, 0) * PERIOD;
    }
    if (e < 0) continue;
    const w = e - t;
    if (w > 0 && w < 0.8) {
      const nn = Math.max(0, Math.round((e - E0[ci]) / PERIOD));
      const tg = TARGETS[ci][nn % TARGETS[ci].length];
      const ti = (tg[1] % G.rows) * G.cols + (tg[0] % G.cols);
      const idx = (((ti - Math.floor(w * 24)) % n) + n) % n;
      dot(g, idx % G.cols, Math.floor(idx / G.cols), 0.9, 0);
      const idx2 = (((ti - Math.floor(w * 24) - 1) % n) + n) % n;
      dot(g, idx2 % G.cols, Math.floor(idx2 / G.cols), 0.4, 0);
    }
    void st;
  }
}

function drawConnected(g, t, states) {
  for (let ci = 0; ci < 2; ci++) {
    const st = states[ci];
    if (!st.on) continue;
    if (st.psock > 0) dot(g, st.pcol, st.prow, st.psock, 1);
    if (st.sock > 0) {
      let boost = 0;
      if (st.phase === 'pulse') boost = smooth(seg(st.pulse, 0.7, 1)) * 0.35;
      else if (st.phase === 'live') boost = 0.18 * Math.max(0, 1 - ((t - st.start) - (PHASE.draw + PHASE.seat + PHASE.pulse) - 0) / 1.2) * 1;
      dot(g, st.col, st.row, st.sock, 1, boost);
    }
  }
}

function dot(g, c, r, a, hard, boost = 0) {
  const x = sockX(c), y = sockY(r), sr = geo.sr;
  // LED above the socket
  const lw = Math.max(6, sr * 0.45), lh = 3;
  const ly = y - sr - 10;
  g.fillStyle = `rgba(${AMBER},${clamp(a * (hard ? 1 : 0.9))})`;
  g.fillRect(x - lw / 2, ly, lw, lh);
  // ring on the throat
  g.lineWidth = hard ? 2 : 1.4;
  g.strokeStyle = `rgba(${AMBER},${clamp(a * (hard ? 0.9 : 0.55) + boost)})`;
  g.beginPath(); g.arc(x, y, hard ? sr + 6 : sr + 0.2, 0, 7); g.stroke();
}

function drawReadout(g, t, states) {
  const R = geo.read;
  const fl = R.w / 3;
  // Which cable acted most recently decides the readout.
  let cur = null;
  for (const st of states) if (st.on && (!cur || st.start >= cur.start)) cur = st;
  let route = '---', state = 'IDLE';
  if (t > 0.5 && t < 1.5) state = 'REQUEST';
  else if (t >= 1.5 && t < E0[0]) state = 'SCANNING';
  if (cur) {
    const ci = states.indexOf(cur);
    const name = `IN${ci + 1}>${String.fromCharCode(65 + cur.col)}${cur.row + 1}`;
    if (cur.phase === 'retract') { route = '---'; state = 'UNPATCH'; }
    else if (cur.phase === 'draw' || cur.phase === 'seat') { route = '---'; state = 'PATCHING'; }
    else if (cur.phase === 'pulse') { route = name; state = 'ROUTING'; }
    else { route = name; state = 'RESOLVED'; }
  }
  // upcoming request label for the second request
  for (let ci = 0; ci < 2; ci++) {
    const e = E0[ci];
    const n = Math.max(0, Math.floor((t - e) / PERIOD) + 1);
    const w = e + n * PERIOD - t;
    if (w > 0 && w < 1.1 && !(ci === 0 && n === 0) && (n > 0 || ci === 1)) { state = 'REQUEST'; if (n > 0 || ci === 1) route = '---'; }
  }
  const lit = state === 'RESOLVED' ? 1 : state === 'ROUTING' ? 0.9 : 0.7;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.font = `500 ${geo.portrait ? 14 : 16}px ${MONO}`;
  const y = R.y + R.h - 13;
  g.fillStyle = `rgba(${AMBER},${route === '---' ? 0.45 : lit})`;
  g.fillText(route, R.x + 12, y);
  g.fillStyle = `rgba(${AMBER},0.95)`;
  // a hollow price mark: unknown, drawn as an outlined question mark
  g.strokeStyle = `rgba(${AMBER},0.95)`; g.lineWidth = 1.3;
  g.beginPath(); g.arc(R.x + 12 + fl + 8, y - 5.5, 8, 0, 7); g.stroke();
  g.font = `500 ${geo.portrait ? 11 : 12}px ${MONO}`; g.textAlign = 'center';
  g.fillText('?', R.x + 12 + fl + 8, y - 1.5);
  g.textAlign = 'left';
  g.font = `500 ${geo.portrait ? 14 : 16}px ${MONO}`;
  const blink = state === 'SCANNING' || state === 'REQUEST' ? 0.6 + 0.4 * Math.sin(t * 14) : 1;
  g.fillStyle = `rgba(${AMBER},${state === 'IDLE' ? 0.45 : lit * blink})`;
  g.fillText(state, R.x + 12 + fl * 2, y);
}

function drawWake(g, t) {
  const G = geo;
  const a = seg(t, 0.2, 1.7);
  if (a <= 0 || a >= 1) return;
  // a single vertical scan bar sweeping across the plate while the sockets wake
  const x = lerp(G.plate.x, G.plate.x + G.plate.w, easeInOut(a));
  g.fillStyle = `rgba(${AMBER},${0.18 * (1 - Math.abs(a - 0.5) * 1.2)})`;
  g.fillRect(x - 1, G.plate.y + 4, 2, G.plate.h - 8);
}

export default {
  id: 'ai-d-kit',
  duration: 5.2,
  still: 5.6,

  setup(s) {
    geo = layout(s.w, s.h, s.portrait);
    sprites = buildSprites(s);
    panel = buildPanel(s);
    sheen = buildSheen(s);
    dirty = false;
    if (!fontsHooked && document.fonts) {
      fontsHooked = true;
      const load = [`600 14px "Barlow Condensed"`, `500 14px "Barlow Condensed"`, `500 14px "JetBrains Mono"`, `400 14px "JetBrains Mono"`];
      Promise.all(load.map((f) => document.fonts.load(f).catch(() => null))).then(() => { dirty = true; });
      document.fonts.ready.then(() => { dirty = true; });
    }
    this._s = s;
  },

  draw(s) {
    const { g, w, h, t, p } = s;
    if (dirty) { this.setup(s); }
    // Ground first: at p = 1 nothing else is drawn, so the canvas is exactly the page.
    g.fillStyle = GROUND; g.fillRect(0, 0, w, h);
    const slide = easeInOut(seg(p, 0, 0.92));
    if (slide >= 1) return;
    const dir = geo.portrait ? 1 : -1; // portrait: the drawer drops away from the copy
    const off = dir * (h + 70) * slide;
    // The drawer's cast shadow on the ground it reveals.
    if (slide > 0) {
      const edge = dir < 0 ? h + off : off;
      const y0 = dir < 0 ? edge : edge - 46;
      const sh = g.createLinearGradient(0, edge, 0, dir < 0 ? edge + 46 : edge - 46);
      sh.addColorStop(0, 'rgba(0,0,0,0.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sh; g.fillRect(0, y0, w, 46);
    }
    g.save();
    g.translate(0, off);
    g.drawImage(panel.c, 0, 0, w, h);
    g.drawImage(sheen, (0.5 - s.px) * 90 - w * 0.25, 0, w * 1.5, h);

    // Sockets: wake column by column, then sit.
    const G = geo;
    for (let r = 0; r < G.rows; r++) {
      for (let c = 0; c < G.cols; c++) {
        const wake = smooth(seg(t, 0.2 + c * 0.11 + r * 0.035, 0.6 + c * 0.11 + r * 0.035));
        const x = sockX(c), y = sockY(r);
        g.globalAlpha = 0.25 + 0.75 * wake;
        const sk = sprites.sock;
        g.drawImage(sk.c, x - sk.r, y - sk.r, sk.r * 2, sk.r * 2);
        const pr = sprites.price;
        g.globalAlpha = wake;
        g.drawImage(pr.c, x - pr.r, y + G.sr + 14 - pr.r + 2, pr.r * 2, pr.r * 2);
      }
    }
    g.globalAlpha = 1;
    drawWake(g, t);

    cableState(0, t, cs[0]); cableState(1, t, cs[1]);
    drawSocketStates(g, t, cs);

    // Request pulses along the input traces.
    for (let ci = 0; ci < 2; ci++) {
      const u = pulseOnTrace(ci, t);
      if (u < 0) continue;
      const tr = G.traces[ci];
      const dist = easeInOut(clamp(u)) * tr.total;
      strokeTrace(g, tr, dist - 90, dist, 3, `rgba(${AMBER},0.22)`);
      strokeTrace(g, tr, dist - 46, dist, 3, `rgba(${AMBER},0.55)`);
      strokeTrace(g, tr, dist - 16, dist, 3.2, `rgba(${AMBER},1)`);
    }
    // Cables above sockets, plugs on top.
    for (let ci = 0; ci < 2; ci++) {
      const st = cs[ci];
      if (!st.on) continue;
      const J = G.jacks[ci];
      drawCable(g, st, ci);
      const pop = clamp(st.pop, 0, 1.2);
      drawPlug(g, J.x, J.y, 0);
      if (pop < 1) { /* jack plug pops in with the cable */ }
      drawPlug(g, st.fx, st.fy, st.lift);
    }
    drawConnected(g, t, cs);
    drawReadout(g, t, cs);
    g.restore();
  },
};
