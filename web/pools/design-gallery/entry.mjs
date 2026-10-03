/*
 * Design Gallery entry: "Three doorways".
 * A pale white-cube gallery in one-point perspective. The lights come up wall by
 * wall, the polished floor settles into its reflection, three abstract works
 * hang on the side walls, a museum plate appears, and the camera takes a step
 * forward. Scroll walks the camera through the central doorway.
 *
 * The room is real 3D reduced to one formula: screen = vanish + (X - cam) / (z - adv).
 * X, Y are pixel units at the far wall (z = 1); z runs 1 (far wall) toward 0.
 * Walking forward is nothing but raising `adv`.
 */
import { clamp, lerp, seg, smooth, easeOut, easeInOut, rng } from '/web/shared/pool-entry/pool-entry.mjs';

const GROUND = '#ebe7dd'; // identical to --entry-ground in pool.css
const VEIL = '#2b2e36';
const INK = '#1f2023';
const VERMILION = '#c1391d';
const TAU = Math.PI * 2;

let G = null;            // geometry for the current size
let SP = null;           // pre-rendered sprites
const cam = { x: 0, y: 0, a: 0 };

const px = (X, z) => G.vx + (X - cam.x) / (z - cam.a);
const py = (Y, z) => G.vy + (Y - cam.y) / (z - cam.a);

function layout(s) {
  const { w, h, portrait } = s;
  const o = { portrait, w, h, dpr: s.dpr, vx: (portrait ? 0.5 : 0.575) * w };
  if (!portrait) {
    Object.assign(o, {
      vy: 0.46 * h, W: 0.21 * w, Fy: 0.22 * h, Cy: -0.34 * h,
      dh: [0.30 * h, 0.34 * h, 0.30 * h], dhw: [0.17, 0.2, 0.17],
    });
  } else {
    Object.assign(o, {
      vy: 0.40 * h, W: 0.42 * w, Fy: 0.16 * h, Cy: -0.30 * h,
      dh: [0.19 * h, 0.22 * h, 0.19 * h], dhw: [0.18, 0.2, 0.18],
    });
  }
  o.doorX = [-0.62 * o.W, 0, 0.62 * o.W];
  o.doorMid = o.Fy - o.dh[1] / 2;
  return o;
}

function sprite(w, h, fn, scale = 2) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale);
  fn(g, w, h);
  return c;
}

/* ---- the three works: purely abstract, no titles, no lettering ---- */
function frameWork(g, w, h, art) {
  g.fillStyle = '#25262a'; g.fillRect(0, 0, w, h);
  const f = Math.min(w, h) * 0.035;
  g.fillStyle = '#f5f3ec'; g.fillRect(f, f, w - 2 * f, h - 2 * f);
  const m = Math.min(w, h) * 0.13;
  g.save(); g.beginPath(); g.rect(m, m, w - 2 * m, h - 2 * m); g.clip();
  art(g, m, m, w - 2 * m, h - 2 * m);
  g.restore();
  g.strokeStyle = 'rgba(31,32,35,.22)'; g.lineWidth = 1; g.strokeRect(m - 0.5, m - 0.5, w - 2 * m + 1, h - 2 * m + 1);
}
function artField(g, x, y, w, h) {
  g.fillStyle = '#e4dccb'; g.fillRect(x, y, w, h);
  g.filter = 'blur(2.5px)';
  g.fillStyle = '#a49584'; g.fillRect(x + w * 0.08, y + h * 0.1, w * 0.84, h * 0.46);
  g.fillStyle = '#5c534b'; g.fillRect(x + w * 0.08, y + h * 0.6, w * 0.84, h * 0.3);
  g.filter = 'none';
  g.fillStyle = VERMILION; g.fillRect(x + w * 0.08, y + h * 0.565, w * 0.84, h * 0.024);
}
function artLines(g, x, y, w, h) {
  g.fillStyle = '#efe9db'; g.fillRect(x, y, w, h);
  g.lineWidth = 0.7;
  for (let i = 0; i < 15; i++) {
    const k = i / 14;
    g.strokeStyle = i === 9 ? VERMILION : 'rgba(31,32,35,.78)';
    g.lineWidth = i === 9 ? 1.1 : 0.7;
    g.beginPath();
    g.moveTo(x + w * 0.08, y + h * (0.12 + k * 0.76));
    g.bezierCurveTo(x + w * 0.35, y + h * (0.04 + k * 0.76), x + w * 0.62, y + h * (0.28 + k * 0.76), x + w * 0.92, y + h * (0.08 + k * 0.78));
    g.stroke();
  }
}
function artSlate(g, x, y, w, h) {
  const a = g.createLinearGradient(0, y, 0, y + h * 0.66);
  a.addColorStop(0, '#8795a8'); a.addColorStop(1, '#6a7b91');
  g.fillStyle = '#d9d6cd'; g.fillRect(x, y, w, h);
  g.filter = 'blur(2px)';
  g.fillStyle = a; g.fillRect(x + w * 0.06, y + h * 0.06, w * 0.88, h * 0.62);
  g.fillStyle = '#2f3641'; g.fillRect(x + w * 0.06, y + h * 0.74, w * 0.88, h * 0.2);
  g.filter = 'none';
  g.fillStyle = 'rgba(245,243,236,.85)'; g.fillRect(x + w * 0.06, y + h * 0.69, w * 0.88, h * 0.012);
}
function plateSprite(g, w, h) {
  g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(31,32,35,.35)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
  g.fillStyle = INK; g.fillRect(w * 0.1, h * 0.2, w * 0.5, h * 0.12);
  g.fillStyle = 'rgba(31,32,35,.45)';
  g.fillRect(w * 0.1, h * 0.44, w * 0.72, h * 0.07);
  g.fillRect(w * 0.1, h * 0.58, w * 0.62, h * 0.07);
  g.fillRect(w * 0.1, h * 0.72, w * 0.4, h * 0.07);
  g.fillStyle = VERMILION; g.beginPath(); g.arc(w * 0.88, h * 0.22, h * 0.07, 0, TAU); g.fill();
}

function setup(s) {
  G = layout(s);
  const r = rng(61);
  const noise = sprite(160, 160, (g) => {
    const d = g.createImageData(160, 160);
    const nr = rng(9);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 90 + nr() * 120;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  }, 1);
  const vig = sprite(Math.max(2, Math.round(s.w / 2)), Math.max(2, Math.round(s.h / 2)), (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.3, w / 2, h * 0.48, Math.hypot(w, h) * 0.58);
    gr.addColorStop(0, 'rgba(60,66,78,0)'); gr.addColorStop(1, 'rgba(60,66,78,.24)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, 1);
  const motes = [];
  for (let i = 0; i < 7; i++) {
    motes.push({ x: 0.44 + r() * 0.12, y: 0.3 + r() * 0.36, ph: r() * TAU, sp: 0.1 + r() * 0.12, rad: 0.9 + r() * 1.2, par: 8 + r() * 14 });
  }
  const layer = document.createElement('canvas');
  layer.width = Math.round(s.w * s.dpr); layer.height = Math.round(s.h * s.dpr);
  SP = {
    layer, lg: layer.getContext('2d'),
    noisePat: s.g.createPattern(noise, 'repeat'),
    vig,
    A: sprite(360, 240, (g, w, h) => frameWork(g, w, h, artField)),
    B: sprite(200, 280, (g, w, h) => frameWork(g, w, h, artLines)),
    C: sprite(280, 360, (g, w, h) => frameWork(g, w, h, artSlate)),
    plate: sprite(150, 84, plateSprite),
    motes,
  };
}

/* ---- geometry helpers ---- */
function quad(g, X0, Y0, z0, X1, Y1, z1, X2, Y2, z2, X3, Y3, z3) {
  g.beginPath();
  g.moveTo(px(X0, z0), py(Y0, z0)); g.lineTo(px(X1, z1), py(Y1, z1));
  g.lineTo(px(X2, z2), py(Y2, z2)); g.lineTo(px(X3, z3), py(Y3, z3));
  g.closePath();
}
function veil(g, a) { if (a > 0.004) { g.globalAlpha = a; g.fillStyle = VEIL; g.fill(); g.globalAlpha = 1; } }

/** Hang a flat sprite on a side wall, in true perspective, one vertical strip at a time. */
function hang(g, img, side, zc, wm, hm, Yc, alpha, edge = '#25262a', lw = 2.2) {
  if (alpha < 0.01) return;
  const W = G.W, unit = W / 5;
  const ext = wm / 12, hu = hm * unit;
  const za = zc - ext / 2, zb = zc + ext / 2;
  if (za - cam.a < 0.05) return;
  const X = side * W, Yt = Yc - hu / 2, Yb = Yc + hu / 2;
  // soft contact shadow, offset down and away from the light
  g.globalAlpha = 0.14 * alpha; g.fillStyle = '#1c2230';
  quad(g, X, Yt, za, X, Yt, zb, X, Yb, zb, X, Yb, za);
  g.save(); g.translate(3 * -side, 3.5); g.fill(); g.restore();
  const n = 36, iw = img.width, ih = img.height, sw = iw / n, d = G.dpr;
  const fade = alpha < 0.999;
  const tg = fade ? SP.lg : g;
  let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
  if (fade) {
    for (const z of [za, zb]) {
      const x = px(X, z); bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x);
      by0 = Math.min(by0, py(Yt, z)); by1 = Math.max(by1, py(Yb, z));
    }
    bx0 = Math.floor(bx0) - 4; by0 = Math.floor(by0) - 4; bx1 = Math.ceil(bx1) + 4; by1 = Math.ceil(by1) + 4;
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(bx0 * d, by0 * d, (bx1 - bx0) * d, (by1 - by0) * d);
  }
  for (let i = 0; i < n; i++) {
    const z0 = lerp(za, zb, i / n), z1 = lerp(za, zb, (i + 1) / n);
    const x0 = px(X, z0), x1 = px(X, z1);
    const t0 = py(Yt, z0), t1 = py(Yt, z1), b0 = py(Yb, z0), b1 = py(Yb, z1);
    const u0 = side < 0 ? i : n - 1 - i;
    const dir = x1 >= x0 ? 1 : -1;
    // shear the strip so its top and bottom edges follow the wall's perspective lines
    const xa = dir > 0 ? x0 : x1, ta = dir > 0 ? t0 : t1, tb = dir > 0 ? t1 : t0;
    const ba = dir > 0 ? b0 : b1, bb = dir > 0 ? b1 : b0;
    const wd = Math.abs(x1 - x0) + 0.6;
    tg.setTransform(d * wd / sw, d * (tb - ta) / sw, 0, d * ((ba - ta) + (bb - tb)) / 2 / ih, d * (xa - 0.3), d * ta);
    tg.drawImage(img, u0 * sw, 0, sw, ih, 0, 0, sw, ih);
  }
  tg.setTransform(d, 0, 0, d, 0, 0);
  if (fade) {
    g.globalAlpha = alpha;
    g.drawImage(SP.layer, bx0 * d, by0 * d, (bx1 - bx0) * d, (by1 - by0) * d, bx0, by0, bx1 - bx0, by1 - by0);
  }
  g.globalAlpha = alpha;
  quad(g, X, Yt, za, X, Yt, zb, X, Yb, zb, X, Yb, za);
  g.strokeStyle = edge; g.lineWidth = lw; g.lineJoin = 'miter'; g.stroke();
  g.globalAlpha = 1;
}

/** A work hung flat on the far wall (portrait composition). */
function hangFar(g, img, X, Yc, wu, hu, alpha) {
  if (alpha < 0.01) return;
  const sc = 1 / (1 - cam.a), cx = px(X, 1), cy = py(Yc, 1), w = wu * sc, h = hu * sc;
  g.globalAlpha = 0.14 * alpha; g.fillStyle = '#1c2230'; g.fillRect(cx - w / 2 + 3 * sc, cy - h / 2 + 3.5 * sc, w, h);
  g.globalAlpha = alpha; g.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  g.globalAlpha = 1;
}

/* ---- the far wall with its three doorways; mir draws the floor reflection ---- */
const DOOR = [
  { top: '#f4d18c', bot: '#e5a255', hot: '#fff0c4', mix: 0.0, w: 8.6, ph: 0.4 },   // warm lamp
  { top: '#f7fbff', bot: '#c3d8ec', hot: '#ffffff', mix: 0.0, w: 11.2, ph: 2.0 },  // cool daylight
  { top: '#3a529b', bot: '#1b2760', hot: '#6c86d4', mix: 0.0, w: 7.4, ph: 4.1 },   // in progress
];

function farWall(g, t, lights, mir, wob) {
  const { W, Fy, Cy } = G;
  const Ym = (Y) => (mir ? 2 * Fy - Y + wob : Y);
  const x0 = px(-W, 1), x1 = px(W, 1);
  const y0 = py(Ym(Cy), 1), y1 = py(Ym(Fy), 1);
  const top = Math.min(y0, y1), hgt = Math.abs(y1 - y0);
  const gr = g.createLinearGradient(0, top, 0, top + hgt);
  if (!mir) { gr.addColorStop(0, '#e8e5dd'); gr.addColorStop(0.5, '#f1eee7'); gr.addColorStop(1, '#e9e5dc'); }
  else { gr.addColorStop(0, '#e9e5dc'); gr.addColorStop(0.5, '#f1eee7'); gr.addColorStop(1, '#e8e5dd'); }
  g.fillStyle = gr; g.fillRect(x0, top, x1 - x0, hgt);
  const sc = 1 / (1 - cam.a);

  for (let i = 0; i < 3; i++) {
    const d = DOOR[i];
    const hw = G.dhw[i] * W, X = G.doorX[i];
    const apex = Fy - G.dh[i];
    const cx = px(X, 1), r = hw * sc;
    const baseY = py(Ym(Fy), 1), springY = py(Ym(apex + hw), 1), apexY = py(Ym(apex), 1);
    const dl = lights[i];
    const breath = 0.5 + 0.5 * Math.sin(t * (TAU / d.w) + d.ph);

    // light spilling onto the wall around the opening
    if (dl > 0.01) {
      const spill = g.createRadialGradient(cx, springY, r * 0.6, cx, springY, r * 3.2);
      const col = i === 0 ? '255,214,150' : i === 1 ? '214,232,250' : '88,112,196';
      spill.addColorStop(0, `rgba(${col},${(0.26 + 0.1 * breath) * dl * (i === 2 ? 0.7 : 1)})`);
      spill.addColorStop(1, `rgba(${col},0)`);
      g.save(); g.beginPath(); g.rect(x0, top, x1 - x0, hgt); g.clip();
      g.fillStyle = spill; g.fillRect(cx - r * 3.3, springY - r * 3.3, r * 6.6, r * 6.6); g.restore();
    }
    // the opening
    const path = (inset, dy) => {
      const rr = r - inset;
      g.beginPath();
      g.moveTo(cx - rr, baseY + dy); g.lineTo(cx - rr, springY + dy);
      g.arc(cx, springY + dy, rr, Math.PI, 0, mir);
      g.lineTo(cx + rr, baseY + dy); g.closePath();
    };
    path(0, 0);
    g.fillStyle = '#34363d'; g.fill();
    if (dl > 0.01) {
      g.save(); g.clip();
      g.globalAlpha = dl;
      const gd = g.createLinearGradient(0, apexY, 0, baseY);
      gd.addColorStop(0, d.top); gd.addColorStop(1, d.bot);
      g.fillStyle = gd; g.fillRect(cx - r, Math.min(apexY, baseY) - 2, 2 * r, Math.abs(baseY - apexY) + 4);
      const hot = g.createRadialGradient(cx, springY, 0, cx, springY, r * 1.7);
      const ha = (i === 2 ? 0.22 + 0.2 * breath : 0.35 + 0.3 * breath);
      hot.addColorStop(0, rgba(d.hot, ha)); hot.addColorStop(1, rgba(d.hot, 0));
      g.fillStyle = hot; g.fillRect(cx - r, Math.min(apexY, baseY) - 2, 2 * r, Math.abs(baseY - apexY) + 4);
      if (i === 2) {
        // the work in progress: a faint scaffold of hairlines inside the blue
        g.strokeStyle = 'rgba(190,205,255,.22)'; g.lineWidth = 1;
        g.beginPath();
        for (let k = 1; k < 6; k++) { const yy = apexY + (k * (baseY - apexY)) / 6; g.moveTo(cx - r, yy); g.lineTo(cx + r, yy); }
        g.moveTo(cx, apexY); g.lineTo(cx, baseY);
        g.stroke();
      }
      // inset reveal: the wall has thickness, so the near edge casts a cool shadow inside
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(31,38,52,.34)'; g.lineWidth = Math.max(2, 7 * sc);
      path(0, mir ? -3 * sc : 4 * sc); g.stroke();
      g.restore();
    }
    path(0, 0);
    g.strokeStyle = 'rgba(31,32,35,.30)'; g.lineWidth = Math.min(3, 1 * sc); g.stroke();
    // architrave: a second, wider arch line in the wall
    g.beginPath();
    const ro = r + 7 * sc;
    g.moveTo(cx - ro, baseY); g.lineTo(cx - ro, springY); g.arc(cx, springY, ro, Math.PI, 0, mir); g.lineTo(cx + ro, baseY);
    g.strokeStyle = 'rgba(31,32,35,.12)'; g.lineWidth = Math.min(3, 1 * sc); g.stroke();
  }
  // baseboard shadow line
  const by = py(Ym(Fy), 1);
  g.fillStyle = 'rgba(31,32,35,.16)'; g.fillRect(x0, by + (mir ? 0 : -2.5 * sc), x1 - x0, 2.5 * sc);
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function draw(s) {
  const { g, w, h, t, p } = s;
  const W = G.W, Fy = G.Fy, Cy = G.Cy;

  /* timeline */
  const wallLit = easeOut(seg(t, 0.2, 1.6));
  const sideL = easeOut(seg(t, 0.7, 2.0));
  const sideR = easeOut(seg(t, 0.95, 2.25));
  const ceilLit = easeOut(seg(t, 1.3, 2.5));
  const floorLit = easeOut(seg(t, 1.6, 2.9));
  const doors = [easeOut(seg(t, 2.3, 3.5)), easeOut(seg(t, 2.6, 3.8)), easeOut(seg(t, 2.95, 4.15))];
  const reflect = easeOut(seg(t, 2.4, 4.6));
  const settle = 1 - smooth(seg(t, 2.6, 5.2));
  const frameA = easeOut(seg(t, 3.0, 4.2)), frameB = easeOut(seg(t, 3.5, 4.7)), frameC = easeOut(seg(t, 3.25, 4.45));
  const plate = easeOut(seg(t, 4.3, 5.2));
  const step = easeInOut(seg(t, 3.9, 6.3));

  /* camera: the arrival step, then the scroll walk through the central doorway */
  const e = smooth(seg(p, 0.05, 0.93));
  const rest = Math.sin(t * 0.52) * 0.004;
  const ze = (1 - 0.09 * step + rest) * Math.exp(-Math.log(16) * e);
  cam.a = 1 - ze;
  const calm = 1 - smooth(seg(p, 0, 0.4));
  cam.x = ((s.px - 0.5) * 0.24 * W + Math.sin(t * 0.37) * 3) * calm;
  cam.y = (s.py - 0.5) * 0.06 * h * calm + G.doorMid * smooth(seg(p, 0.05, 0.85));

  const zlo = Math.min(cam.a + 0.22, 0.985);
  g.fillStyle = GROUND; g.fillRect(0, 0, w, h);

  /* ceiling */
  quad(g, -W, Cy, zlo, W, Cy, zlo, W, Cy, 1, -W, Cy, 1);
  let gr = g.createLinearGradient(0, py(Cy, 1), 0, py(Cy, zlo));
  gr.addColorStop(0, '#e6e3db'); gr.addColorStop(1, '#f7f5f0');
  g.fillStyle = gr; g.fill(); veil(g, (1 - ceilLit) * 0.34);
  // the long skylight strip, soft edged
  g.globalAlpha = ceilLit * 0.35; g.fillStyle = '#ffffff';
  quad(g, -0.2 * W, Cy, zlo, 0.2 * W, Cy, zlo, 0.14 * W, Cy, 0.98, -0.14 * W, Cy, 0.98); g.fill();
  g.globalAlpha = ceilLit * 0.9;
  quad(g, -0.1 * W, Cy, zlo, 0.1 * W, Cy, zlo, 0.07 * W, Cy, 0.98, -0.07 * W, Cy, 0.98); g.fill();
  g.globalAlpha = 1;

  /* side walls */
  for (let sd = -1; sd <= 1; sd += 2) {
    const lit = sd < 0 ? sideL : sideR;
    quad(g, sd * W, Cy, zlo, sd * W, Cy, 1, sd * W, Fy, 1, sd * W, Fy, zlo);
    gr = g.createLinearGradient(px(sd * W, 1), 0, px(sd * W, zlo), 0);
    if (sd < 0) { gr.addColorStop(0, '#e7e3da'); gr.addColorStop(0.5, '#dcd8cd'); gr.addColorStop(1, '#cbc7bc'); }
    else { gr.addColorStop(0, '#e1e0da'); gr.addColorStop(0.5, '#d6d5cf'); gr.addColorStop(1, '#c4c3bd'); }
    g.fillStyle = gr; g.fill();
    const wash = g.createLinearGradient(0, 0, 0, h * 0.75);
    wash.addColorStop(0, 'rgba(255,255,255,.34)'); wash.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = wash; g.fill();
    veil(g, (1 - lit) * 0.34);
    // skirting
    g.globalAlpha = 0.12; g.fillStyle = INK;
    quad(g, sd * W, Fy - 14, zlo, sd * W, Fy - 14, 1, sd * W, Fy, 1, sd * W, Fy, zlo); g.fill();
    g.globalAlpha = 1;
  }

  /* floor */
  const fy0 = py(Fy, 1), fy1 = py(Fy, zlo);
  quad(g, -W, Fy, zlo, W, Fy, zlo, W, Fy, 1, -W, Fy, 1);
  gr = g.createLinearGradient(0, fy0, 0, fy1);
  gr.addColorStop(0, '#dad5ca'); gr.addColorStop(1, '#c9c3b6');
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  // the reflection of the far wall and its doorways, settling like still water
  if (reflect > 0.01) {
    const wob = settle * 16 * Math.sin(t * 6.3) + Math.sin(t * 0.8) * 0.9;
    g.globalAlpha = reflect * 0.5;
    farWall(g, t, doors, true, wob);
    g.globalAlpha = 1;
  }
  // polish: the reflection dissolves into the stone with distance
  const fd = (Fy - Cy) * 0.62 / (1 - cam.a);
  gr = g.createLinearGradient(0, fy0, 0, fy0 + fd);
  gr.addColorStop(0, 'rgba(214,209,198,0)'); gr.addColorStop(0.35, 'rgba(213,208,197,.5)'); gr.addColorStop(1, 'rgba(206,201,190,1)');
  g.fillStyle = gr; g.fillRect(0, fy0, w, h - fy0 + 4);
  // slab seams, true to perspective
  g.strokeStyle = 'rgba(31,32,35,.07)'; g.lineWidth = 1;
  g.beginPath();
  for (let i = 1; i < 6; i++) { const X = -W + (i * 2 * W) / 6; g.moveTo(px(X, 1), py(Fy, 1)); g.lineTo(px(X, zlo), py(Fy, zlo)); }
  for (let j = 1; j < 12; j++) { const z = 1 - j * 0.085; if (z <= zlo) break; g.moveTo(px(-W, z), py(Fy, z)); g.lineTo(px(W, z), py(Fy, z)); }
  g.stroke();
  // light spilling from each doorway across the floor
  for (let i = 0; i < 3; i++) {
    const dl = doors[i]; if (dl < 0.01) continue;
    const d = DOOR[i], X = G.doorX[i], hw = G.dhw[i] * W;
    const breath = 0.5 + 0.5 * Math.sin(t * (TAU / d.w) + d.ph);
    const zn = Math.max(zlo, 0.5);
    const col = i === 0 ? '255,206,130' : i === 1 ? '210,230,252' : '84,108,198';
    gr = g.createLinearGradient(0, py(Fy, 1), 0, py(Fy, zn));
    gr.addColorStop(0, `rgba(${col},${(0.34 + 0.12 * breath) * dl * (i === 2 ? 0.7 : 1)})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    quad(g, X - hw, Fy, 1, X + hw, Fy, 1, X + hw * 1.6, Fy, zn, X - hw * 1.6, Fy, zn); g.fill();
  }
  // daylight from the long skylight drifts slowly across the stone
  const drift = Math.sin(t * 0.26) * 0.34 * W + Math.sin(t * 0.11 + 1) * 0.1 * W;
  const lf = floorLit * reflect;
  const zm = (zlo + 0.96) / 2, zq = Math.max(0.45, zlo);
  const dx0 = px(drift - 0.5 * W, zm), dx1 = px(drift + 0.6 * W, zm);
  gr = g.createLinearGradient(dx0, 0, dx1, 0);
  gr.addColorStop(0, 'rgba(255,250,238,0)'); gr.addColorStop(0.5, `rgba(255,250,238,${0.34 * lf})`); gr.addColorStop(1, 'rgba(255,250,238,0)');
  g.fillStyle = gr;
  quad(g, drift - 0.5 * W, Fy, 0.96, drift + 0.5 * W, Fy, 0.96, drift + 0.9 * W, Fy, zq, drift - 0.1 * W, Fy, zq); g.fill();
  g.restore();
  quad(g, -W, Fy, zlo, W, Fy, zlo, W, Fy, 1, -W, Fy, 1); veil(g, (1 - floorLit) * 0.34);

  /* far wall and its three doorways */
  farWall(g, t, doors, false, 0);
  const bx0 = px(-W, 1), bx1 = px(W, 1), bt = Math.min(py(Cy, 1), py(Fy, 1)), bh = Math.abs(py(Fy, 1) - py(Cy, 1));
  g.globalAlpha = (1 - wallLit) * 0.34; g.fillStyle = VEIL; g.fillRect(bx0, bt, bx1 - bx0, bh); g.globalAlpha = 1;

  /* the works */
  if (G.portrait) {
    const sc = 1 / (1 - cam.a), ay = G.Fy - G.dh[1] - 0.085 * G.h;
    hangFar(g, SP.B, G.doorX[0], ay + 6, 46, 64, frameA);
    hangFar(g, SP.A, G.doorX[1], ay - 8, 84, 56, frameB);
    hangFar(g, SP.C, G.doorX[2], ay + 6, 50, 64, frameC);
  } else {
    hang(g, SP.A, -1, 0.64, 2.8, 1.8, -34, frameA);
    hang(g, SP.B, -1, 0.87, 1.0, 1.4, -26, frameB);
    hang(g, SP.C, 1, 0.66, 2.0, 2.5, -34, frameC);
    hang(g, SP.plate, 1, 0.9, 0.6, 0.34, 18 + (1 - plate) * 5, plate, 'rgba(120,116,106,.9)', 0.8);
  }

  /* dust, caught in the light of the centre doorway */
  const mt = easeOut(seg(t, 3.2, 5)) * (1 - smooth(seg(p, 0, 0.3)));
  if (mt > 0.01) {
    for (let i = 0; i < SP.motes.length; i++) {
      const m = SP.motes[i];
      const mx = (m.x + Math.sin(t * 0.17 + m.ph) * 0.018) * w - (s.px - 0.5) * m.par;
      const my = (m.y + Math.sin(t * m.sp + m.ph * 2) * 0.03 - ((t * 0.003) % 0.0)) * h;
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.7 + m.ph * 3));
      g.globalAlpha = 0.42 * tw * mt; g.fillStyle = '#8f8372';
      g.beginPath(); g.arc(mx, my, m.rad, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }

  /* a pale pool of limestone light under the words keeps the copy quiet at every moment */
  const hush = easeOut(seg(t, 0, 0.8)) * (1 - smooth(seg(p, 0.3, 0.75)));
  if (hush > 0.01) {
    g.save();
    if (G.portrait) {
      gr = g.createLinearGradient(0, h * 0.6, 0, h);
      gr.addColorStop(0, 'rgba(235,231,221,0)'); gr.addColorStop(0.45, `rgba(235,231,221,${0.5 * hush})`); gr.addColorStop(1, `rgba(235,231,221,${0.62 * hush})`);
      g.fillStyle = gr; g.fillRect(0, h * 0.6, w, h * 0.4);
    } else {
      g.translate(w * 0.17, h * 0.8); g.scale(1, 0.62);
      gr = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.34);
      gr.addColorStop(0, `rgba(235,231,221,${0.78 * hush})`); gr.addColorStop(0.55, `rgba(235,231,221,${0.5 * hush})`); gr.addColorStop(1, 'rgba(235,231,221,0)');
      g.fillStyle = gr; g.fillRect(-w * 0.34, -w * 0.34, w * 0.68, w * 0.68);
    }
    g.restore();
  }

  /* atmosphere: cool vignette and a little stone grain */
  g.drawImage(SP.vig, 0, 0, w, h);
  g.globalAlpha = 0.07; g.globalCompositeOperation = 'multiply'; g.fillStyle = SP.noisePat; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;

  /* depart: the doorway light becomes the page */
  const flood = smooth(seg(p, 0.72, 0.97));
  if (flood > 0) { g.globalAlpha = flood >= 0.999 ? 1 : flood; g.fillStyle = GROUND; g.fillRect(0, 0, w, h); g.globalAlpha = 1; }
}

export const scene = { id: 'design-gallery', duration: 6.3, still: 6.3, setup, draw };
export default scene;
