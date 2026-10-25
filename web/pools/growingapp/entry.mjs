/*
 * GrowingApp entry: height marks on the doorframe.
 *
 * A painted door casing in a sunlit room. A hand-held pencil climbs the frame
 * leaving a pencil mark, a tiny hand-set tick and, beside a few of them, a
 * footnote asterisk (every piece of guidance names its source). A seedling in
 * a clay pot beside the frame grows to meet each mark, leaf by leaf, while
 * window light and leaf shadows drift across the wall. No text in the scene.
 *
 * Arrive 0..5.6 s; rest = light drifts, leaves sway, dust turns in the beam.
 * Depart = camera rises up the frame, then the wall dissolves into the page.
 */
import { clamp, lerp, seg, smooth, easeOut, easeInOut, easeOutBack, rng } from '/web/shared/pool-entry/pool-entry.mjs';

const GROUND = '#f6ead9'; // keep identical to --entry-ground in pool.css
const TAU = Math.PI * 2;
const FR = [0, 0.15, 0.3, 0.44, 0.57, 0.69, 0.8, 0.9, 1];
const N = FR.length;
const T0 = 0.95; // first mark starts
const DT = 0.46; // per mark
const STROKE = 0.28;
const K = 11; // leaf nodes
const LIGHT_K = 0.25; // low-res scale of light layers
const WYK = 1.0;
const DASH_A = [9, 3, 14, 2];

let L = null;

function canvas(w, h, dpr = 1) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * dpr));
  c.height = Math.max(1, Math.ceil(h * dpr));
  const x = c.getContext('2d');
  x.scale(dpr, dpr);
  return [c, x];
}

function leafPath(x, len, wid) {
  x.beginPath();
  x.moveTo(0, 0);
  x.bezierCurveTo(len * 0.22, -wid * 1.05, len * 0.72, -wid * 0.95, len, 0);
  x.bezierCurveTo(len * 0.7, wid * 0.8, len * 0.25, wid * 1.0, 0, 0);
  x.closePath();
}

/** A leaf sprite pointing +x from (0, half); lit side brighter, with a rib. */
function leafSprite(dpr, tint) {
  const len = 100, wid = 30;
  const [c, x] = canvas(len + 8, wid * 2 + 10, dpr * 1.6);
  x.translate(4, wid + 5);
  if (tint === 'shadow') {
    leafPath(x, len, wid);
    x.fillStyle = 'rgba(96,52,30,1)';
    x.fill();
    return c;
  }
  const gr = x.createLinearGradient(0, 0, len, 0);
  gr.addColorStop(0, '#6c9a3c');
  gr.addColorStop(0.55, '#8dbd4f');
  gr.addColorStop(1, '#b4d878');
  leafPath(x, len, wid);
  x.fillStyle = gr;
  x.fill();
  // shade the lower half, light the upper half
  x.save();
  leafPath(x, len, wid);
  x.clip();
  const sh = x.createLinearGradient(0, -wid, 0, wid);
  sh.addColorStop(0, 'rgba(255,255,220,.26)');
  sh.addColorStop(0.5, 'rgba(255,255,220,0)');
  sh.addColorStop(1, 'rgba(40,70,20,.28)');
  x.fillStyle = sh;
  x.fillRect(-2, -wid - 2, len + 4, wid * 2 + 4);
  x.restore();
  x.strokeStyle = 'rgba(224,240,170,.7)';
  x.lineWidth = 1.4;
  x.beginPath();
  x.moveTo(2, 0);
  x.quadraticCurveTo(len * 0.5, -2.5, len * 0.92, -0.5);
  x.stroke();
  x.strokeStyle = 'rgba(60,100,30,.25)';
  x.lineWidth = 0.9;
  for (let i = 1; i < 5; i++) {
    const px = len * (0.14 + i * 0.16);
    x.beginPath();
    x.moveTo(px, -0.5);
    x.quadraticCurveTo(px + 6, -wid * 0.3, px + 14, -wid * 0.62 * (1 - i * 0.12));
    x.moveTo(px, 0.5);
    x.quadraticCurveTo(px + 6, wid * 0.25, px + 14, wid * 0.5 * (1 - i * 0.12));
    x.stroke();
  }
  return c;
}

function potSprite(potW, potH, dpr) {
  const [c, x] = canvas(potW * 1.4, potH * 1.15, dpr);
  const ox = potW * 0.2, oy = potH * 0.04;
  const rimH = potH * 0.2, bodyH = potH * 0.74, saucerH = potH * 0.09;
  const topW = potW, botW = potW * 0.7;
  const cx = ox + potW / 2;
  // body
  const bg = x.createLinearGradient(ox, 0, ox + potW, 0);
  bg.addColorStop(0, '#e08f60');
  bg.addColorStop(0.35, '#cf703f');
  bg.addColorStop(0.75, '#b45a30');
  bg.addColorStop(1, '#8f4424');
  x.fillStyle = bg;
  x.beginPath();
  x.moveTo(cx - topW * 0.46, oy + rimH * 0.8);
  x.lineTo(cx + topW * 0.46, oy + rimH * 0.8);
  x.lineTo(cx + botW / 2, oy + rimH + bodyH);
  x.quadraticCurveTo(cx, oy + rimH + bodyH + potH * 0.05, cx - botW / 2, oy + rimH + bodyH);
  x.closePath();
  x.fill();
  // glaze patch and a hand-painted band
  x.fillStyle = 'rgba(255,225,190,.20)';
  x.beginPath();
  x.ellipse(cx - topW * 0.2, oy + rimH + bodyH * 0.3, topW * 0.07, bodyH * 0.2, 0.1, 0, TAU);
  x.fill();
  x.strokeStyle = 'rgba(252,236,212,.62)';
  x.lineWidth = Math.max(2, potW * 0.022);
  x.lineCap = 'round';
  x.beginPath();
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const px = cx - topW * 0.4 + t * topW * 0.8;
    const py = oy + rimH + bodyH * 0.42 + Math.sin(t * TAU * 2.5) * potH * 0.025;
    if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
  }
  x.stroke();
  // rim
  const rg = x.createLinearGradient(ox, 0, ox + potW, 0);
  rg.addColorStop(0, '#eb9d6e');
  rg.addColorStop(0.4, '#d67d4a');
  rg.addColorStop(1, '#a24f2a');
  x.fillStyle = rg;
  const rx = cx - topW * 0.54, rw = topW * 1.08;
  x.beginPath();
  x.roundRect(rx, oy, rw, rimH, rimH * 0.32);
  x.fill();
  x.fillStyle = 'rgba(60,20,8,.22)';
  x.fillRect(rx + 2, oy + rimH * 0.86, rw - 4, rimH * 0.16);
  x.fillStyle = 'rgba(255,230,200,.35)';
  x.fillRect(rx + rimH * 0.3, oy + 2, rw - rimH * 0.6, 2);
  // soil
  const sg = x.createLinearGradient(0, oy, 0, oy + rimH);
  sg.addColorStop(0, '#3c261a');
  sg.addColorStop(1, '#5a3a28');
  x.fillStyle = sg;
  x.beginPath();
  x.ellipse(cx, oy + rimH * 0.22, topW * 0.5, rimH * 0.2, 0, 0, TAU);
  x.fill();
  const r = rng(11);
  x.fillStyle = 'rgba(120,84,58,.55)';
  for (let i = 0; i < 40; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    x.fillRect(cx + Math.cos(a) * d * topW * 0.46, oy + rimH * 0.22 + Math.sin(a) * d * rimH * 0.17, 1.4, 1.2);
  }
  // saucer
  const sy = oy + rimH + bodyH * 0.98;
  const sc = x.createLinearGradient(0, sy, 0, sy + saucerH * 2);
  sc.addColorStop(0, '#c26a3b');
  sc.addColorStop(1, '#8a4121');
  x.fillStyle = sc;
  x.beginPath();
  x.roundRect(cx - botW * 0.62, sy, botW * 1.24, saucerH * 1.7, saucerH * 0.8);
  x.fill();
  x.fillStyle = 'rgba(255,225,190,.28)';
  x.fillRect(cx - botW * 0.55, sy + 2, botW * 1.1, 1.6);
  return { c, ox, oy, cx, baseY: oy + rimH * 0.22, w: potW * 1.4, h: potH * 1.15, saucerY: sy + saucerH * 1.7 };
}

function pencilSprite(u, dpr, shadow) {
  const len = 176 * u, th = 12 * u;
  const [c, x] = canvas(len + 8, th + 16, dpr);
  x.translate(2, 8 + th / 2);
  const path = () => {
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(24 * u, -th / 2);
    x.lineTo(len - 2 * u, -th / 2);
    x.lineTo(len, 0);
    x.lineTo(len - 2 * u, th / 2);
    x.lineTo(24 * u, th / 2);
    x.closePath();
  };
  if (shadow) {
    path();
    x.fillStyle = 'rgba(86,48,26,1)';
    x.fill();
    return c;
  }
  // wood cone
  x.fillStyle = '#ecd0a2';
  x.beginPath(); x.moveTo(0, 0); x.lineTo(26 * u, -th / 2); x.lineTo(26 * u, th / 2); x.closePath(); x.fill();
  x.fillStyle = 'rgba(150,100,50,.25)';
  x.beginPath(); x.moveTo(0, 0); x.lineTo(26 * u, 0); x.lineTo(26 * u, th / 2); x.closePath(); x.fill();
  // graphite point
  x.fillStyle = '#3a3633';
  x.beginPath(); x.moveTo(0, 0); x.lineTo(7.4 * u, -th * 0.15); x.lineTo(7.4 * u, th * 0.15); x.closePath(); x.fill();
  // body
  const bg = x.createLinearGradient(0, -th / 2, 0, th / 2);
  bg.addColorStop(0, '#f0c85c');
  bg.addColorStop(0.5, '#dcab3a');
  bg.addColorStop(1, '#b5821f');
  x.fillStyle = bg;
  x.fillRect(26 * u, -th / 2, 112 * u, th);
  x.fillStyle = 'rgba(255,255,255,.35)';
  x.fillRect(26 * u, -th / 2 + th * 0.12, 112 * u, th * 0.1);
  x.fillStyle = 'rgba(70,40,10,.28)';
  x.fillRect(26 * u, th * 0.22, 112 * u, th * 0.1);
  // ferrule
  const fg = x.createLinearGradient(0, -th / 2, 0, th / 2);
  fg.addColorStop(0, '#e4e5e4'); fg.addColorStop(0.5, '#a9acae'); fg.addColorStop(1, '#797c7f');
  x.fillStyle = fg;
  x.fillRect(138 * u, -th / 2, 18 * u, th);
  x.fillStyle = 'rgba(40,40,40,.28)';
  for (let i = 0; i < 3; i++) x.fillRect((142 + i * 5) * u, -th / 2, 1.2 * u, th);
  // eraser
  x.fillStyle = '#dc8d86';
  x.beginPath(); x.roundRect(156 * u, -th / 2 + 0.5, 20 * u, th - 1, 3.5 * u); x.fill();
  x.fillStyle = 'rgba(255,255,255,.3)';
  x.fillRect(158 * u, -th / 2 + 2, 16 * u, 2);
  return c;
}

function buildStatic(s, G) {
  const { w, h, dpr } = s;
  const { fx, fw, fl, u, portrait } = G;
  const wy = h * WYK; // world is offset so y in [-WYK*h, h]
  const [c, x] = canvas(w, h * (1 + WYK), dpr);
  x.translate(0, wy);
  const r = rng(7);
  // wall
  const wall = x.createLinearGradient(0, -wy, w, h);
  wall.addColorStop(0, '#f9e9d3');
  wall.addColorStop(0.5, '#f2d8b8');
  wall.addColorStop(1, '#e9c9a3');
  x.fillStyle = wall;
  x.fillRect(0, -wy, w, h * (1 + WYK));
  // plaster mottling
  for (let i = 0; i < 90; i++) {
    const bx = r() * w, by = -wy + r() * h * (1 + WYK), br = (60 + r() * 220) * u;
    const rg = x.createRadialGradient(bx, by, 0, bx, by, br);
    const warm = r() > 0.5;
    rg.addColorStop(0, warm ? 'rgba(255,236,208,.12)' : 'rgba(196,138,92,.07)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg;
    x.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  // grain
  const [gc, gx] = canvas(192, 192, 1);
  const id = gx.createImageData(192, 192);
  const gr = rng(3);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = gr();
    const dark = v < 0.5;
    id.data[i] = dark ? 120 : 255;
    id.data[i + 1] = dark ? 78 : 244;
    id.data[i + 2] = dark ? 48 : 222;
    id.data[i + 3] = Math.abs(v - 0.5) * 2 > 0.55 ? 20 + gr() * 22 : 0;
  }
  gx.putImageData(id, 0, 0);
  x.fillStyle = x.createPattern(gc, 'repeat');
  x.fillRect(0, -wy, w, h * (1 + WYK));
  // ambient occlusion above the baseboard
  const ao = x.createLinearGradient(0, fl - 0.3 * h, 0, fl);
  ao.addColorStop(0, 'rgba(150,90,50,0)');
  ao.addColorStop(1, 'rgba(150,90,50,.13)');
  x.fillStyle = ao;
  x.fillRect(0, fl - 0.3 * h, fx, 0.3 * h);

  // door slab
  const dx = fx + fw, dw = w - dx;
  const headY = -0.42 * h, headH = fw * 0.82;
  if (dw > 4) {
    const dg = x.createLinearGradient(dx, 0, dx + Math.min(dw, 260 * u), 0);
    dg.addColorStop(0, '#d9b085');
    dg.addColorStop(0.1, '#e6c39a');
    dg.addColorStop(1, '#eed0a8');
    x.fillStyle = dg;
    x.fillRect(dx, headY + headH, dw, fl - headY - headH);
    // gap shadow where the door tucks behind the casing
    const gap = x.createLinearGradient(dx, 0, dx + 26 * u, 0);
    gap.addColorStop(0, 'rgba(70,40,24,.55)');
    gap.addColorStop(0.18, 'rgba(70,40,24,.22)');
    gap.addColorStop(1, 'rgba(70,40,24,0)');
    x.fillStyle = gap;
    x.fillRect(dx, headY + headH, 26 * u, fl - headY - headH);
    if (dw > 150) {
      // raised panels
      const pad = 34 * u, pw = (dw - pad * 3) / 2;
      const rows = [[-0.31, -0.02], [0.05, 0.33], [0.41, 0.8]];
      rows.forEach(([a, b]) => {
        for (let col = 0; col < 2; col++) {
          const px = dx + pad + col * (pw + pad);
          const py = a * h, ph = (b - a) * h;
          x.fillStyle = 'rgba(70,40,24,.13)';
          x.fillRect(px, py, pw, ph);
          x.fillStyle = 'rgba(255,244,224,.5)';
          x.fillRect(px + pw, py - 1, 2.4 * u, ph + 2);
          x.fillRect(px - 1, py + ph, pw + 2, 2.4 * u);
          x.fillStyle = 'rgba(70,40,24,.34)';
          x.fillRect(px - 2.4 * u, py - 2.4 * u, pw + 2.4 * u, 2.4 * u);
          x.fillRect(px - 2.4 * u, py - 2.4 * u, 2.4 * u, ph + 2.4 * u);
          const ig = x.createLinearGradient(px, py, px + pw, py + ph);
          ig.addColorStop(0, 'rgba(255,240,214,.18)');
          ig.addColorStop(1, 'rgba(120,70,40,.1)');
          x.fillStyle = ig;
          x.fillRect(px + 8 * u, py + 8 * u, pw - 16 * u, ph - 16 * u);
        }
      });
      // brass knob
      const kx = dx + pad * 0.62 + 6 * u, ky = 0.42 * h;
      x.fillStyle = 'rgba(70,40,24,.25)';
      x.beginPath(); x.ellipse(kx + 5 * u, ky + 7 * u, 17 * u, 17 * u, 0, 0, TAU); x.fill();
      const kg = x.createRadialGradient(kx - 5 * u, ky - 6 * u, 1, kx, ky, 18 * u);
      kg.addColorStop(0, '#fbe9b4'); kg.addColorStop(0.45, '#d9a94c'); kg.addColorStop(1, '#8c6422');
      x.fillStyle = kg;
      x.beginPath(); x.arc(kx, ky, 17 * u, 0, TAU); x.fill();
    }
  }

  // head casing, with a drop shadow below it
  const hs = x.createLinearGradient(0, headY + headH, 0, headY + headH + 34 * u);
  hs.addColorStop(0, 'rgba(70,40,24,.34)');
  hs.addColorStop(1, 'rgba(70,40,24,0)');
  x.fillStyle = hs;
  x.fillRect(fx, headY + headH, w - fx, 34 * u);
  const paint = (px, py, pw, ph, horizontal) => {
    const pg = horizontal ? x.createLinearGradient(0, py, 0, py + ph) : x.createLinearGradient(px, 0, px + pw, 0);
    pg.addColorStop(0, '#fffaf0');
    pg.addColorStop(0.5, '#fbf2e3');
    pg.addColorStop(1, '#efe2cc');
    x.fillStyle = pg;
    x.fillRect(px, py, pw, ph);
    // bevel grooves
    x.fillStyle = 'rgba(120,80,50,.16)';
    if (horizontal) {
      x.fillRect(px, py + ph * 0.2, pw, 1.6 * u);
      x.fillRect(px, py + ph * 0.8, pw, 1.6 * u);
      x.fillStyle = 'rgba(255,255,255,.7)';
      x.fillRect(px, py + ph * 0.2 + 1.6 * u, pw, 1.2 * u);
    } else {
      x.fillRect(px + pw * 0.2, py, 1.6 * u, ph);
      x.fillRect(px + pw * 0.82, py, 1.6 * u, ph);
      x.fillStyle = 'rgba(255,255,255,.7)';
      x.fillRect(px + pw * 0.2 + 1.6 * u, py, 1.2 * u, ph);
    }
    // faint brush streaks
    for (let i = 0; i < (horizontal ? 18 : 24); i++) {
      x.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.2)' : 'rgba(130,90,60,.05)';
      if (horizontal) x.fillRect(px + r() * pw * 0.6, py + r() * ph, pw * (0.1 + r() * 0.4), 1);
      else x.fillRect(px + r() * pw, py + r() * ph * 0.9, 1, ph * (0.05 + r() * 0.5));
    }
  };
  paint(fx, headY, w - fx, headH, true);
  // casing: plinth block and jamb
  paint(fx, -wy, fw, fl + wy - 0.075 * h, false);
  // casing outer shadow cast on the wall to the left
  const cs = x.createLinearGradient(fx - 14 * u, 0, fx, 0);
  cs.addColorStop(0, 'rgba(120,70,40,0)');
  cs.addColorStop(1, 'rgba(120,70,40,.16)');
  x.fillStyle = cs;
  x.fillRect(fx - 14 * u, -wy, 14 * u, fl + wy);
  // plinth block
  const pb = x.createLinearGradient(fx - 7 * u, 0, fx + fw + 7 * u, 0);
  pb.addColorStop(0, '#fffaf0'); pb.addColorStop(1, '#ecdfc8');
  x.fillStyle = pb;
  x.fillRect(fx - 7 * u, fl - 0.075 * h, fw + 14 * u, 0.075 * h);
  x.fillStyle = 'rgba(120,80,50,.22)';
  x.fillRect(fx - 7 * u, fl - 0.075 * h, fw + 14 * u, 1.6 * u);
  x.fillStyle = 'rgba(255,255,255,.8)';
  x.fillRect(fx - 7 * u, fl - 0.075 * h + 1.6 * u, fw + 14 * u, 1.4 * u);
  // baseboard, left of the plinth
  const bh = 0.065 * h;
  const bgd = x.createLinearGradient(0, fl - bh, 0, fl);
  bgd.addColorStop(0, '#fffaf0'); bgd.addColorStop(1, '#eadcc3');
  x.fillStyle = bgd;
  x.fillRect(0, fl - bh, fx - 7 * u, bh);
  x.fillStyle = 'rgba(120,80,50,.2)';
  x.fillRect(0, fl - bh, fx - 7 * u, 1.6 * u);
  x.fillStyle = 'rgba(255,255,255,.85)';
  x.fillRect(0, fl - bh + 1.6 * u, fx - 7 * u, 1.4 * u);
  x.fillStyle = 'rgba(120,80,50,.3)';
  x.fillRect(0, fl - bh * 0.28, fx - 7 * u, 1.4 * u);
  const bsh = x.createLinearGradient(0, fl - bh, 0, fl - bh + 18 * u);
  bsh.addColorStop(0, 'rgba(120,70,40,.18)');
  bsh.addColorStop(1, 'rgba(120,70,40,0)');
  x.fillStyle = bsh;
  x.fillRect(0, fl - bh - 0, fx - 7 * u, 18 * u);

  // floor
  const fg = x.createLinearGradient(0, fl, 0, h);
  fg.addColorStop(0, '#b98456');
  fg.addColorStop(0.18, '#c99765');
  fg.addColorStop(1, '#a9754a');
  x.fillStyle = fg;
  x.fillRect(0, fl, w, h - fl);
  const rows = Math.max(2, Math.round((h - fl) / (28 * u)));
  const rh = (h - fl) / rows;
  for (let i = 0; i < rows; i++) {
    const y0 = fl + i * rh;
    x.fillStyle = 'rgba(70,40,20,.28)';
    x.fillRect(0, y0, w, 1.2);
    let px = -r() * 200 * u;
    while (px < w) {
      const bw = (170 + r() * 190) * u;
      x.fillStyle = 'rgba(70,40,20,.22)';
      x.fillRect(px + bw, y0, 1.2, rh);
      x.fillStyle = r() > 0.5 ? 'rgba(255,230,190,.07)' : 'rgba(80,45,20,.06)';
      x.fillRect(px + 1, y0 + 1, bw - 1, rh - 1);
      px += bw;
    }
    for (let k = 0; k < 14; k++) {
      x.fillStyle = 'rgba(80,45,20,.1)';
      x.fillRect(r() * w, y0 + r() * rh, (30 + r() * 90) * u, 1);
    }
  }
  const fsh = x.createLinearGradient(0, fl, 0, fl + 26 * u);
  fsh.addColorStop(0, 'rgba(60,30,14,.38)');
  fsh.addColorStop(1, 'rgba(60,30,14,0)');
  x.fillStyle = fsh;
  x.fillRect(0, fl, w, 26 * u);
  // vignette
  const vg = x.createRadialGradient(w * 0.5, h * 0.45, h * 0.35, w * 0.5, h * 0.45, Math.max(w, h) * (portrait ? 0.9 : 0.78));
  vg.addColorStop(0, 'rgba(120,70,40,0)');
  vg.addColorStop(1, 'rgba(120,70,40,.18)');
  x.fillStyle = vg;
  x.fillRect(0, -wy, w, h * (1 + WYK));
  return c;
}

function buildLight(s, G) {
  const { w, h } = s;
  const { u, portrait } = G;
  const lw = w * 1.4, lh = h * 1.6;
  const [c, x] = canvas(lw * LIGHT_K, lh * LIGHT_K, 1);
  x.setTransform(LIGHT_K, 0, 0, LIGHT_K, 0, 0);
  const ox = 0.2 * w, oy = 0.6 * h; // world (0,0) sits here in sprite space
  const cols = portrait ? 1 : 2, rows = portrait ? 2 : 3;
  const pw = portrait ? w * 0.4 : w * 0.115, ph = portrait ? h * 0.2 : h * 0.17;
  const gap = portrait ? w * 0.05 : w * 0.022;
  const x0 = portrait ? w * 0.06 : w * 0.0, y0 = portrait ? h * 0.2 : h * 0.1;
  const shear = portrait ? 0.4 : 0.3;
  const pane = (col, row, grow, a) => {
    const px = x0 + col * (pw + gap), py = y0 + row * (ph + gap);
    x.fillStyle = `rgba(255,247,224,${a})`;
    x.beginPath();
    const pts = [[px - grow, py - grow], [px + pw + grow, py - grow], [px + pw + grow, py + ph + grow], [px - grow, py + ph + grow]];
    pts.forEach(([qx, qy], i) => {
      const X = ox + qx + qy * shear, Y = oy + qy;
      if (i === 0) x.moveTo(X, Y); else x.lineTo(X, Y);
    });
    x.closePath();
    x.fill();
  };
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    pane(col, row, 7 * u, 0.22);
    pane(col, row, 3 * u, 0.4);
    pane(col, row, -1 * u, 1);
  }
  const [dc, dx] = canvas(lw * LIGHT_K, lh * LIGHT_K, 1);
  return { c, dc, dx, ox, oy, lw, lh, x0, y0, pw, ph, gap, shear, rows, cols };
}

function layout(s) {
  const { w, h, portrait } = s;
  const u = portrait ? Math.min(h / 844, w / 390) * 0.95 : clamp(Math.min(h / 900, (w / 1440) * 1.3), 0.55, 1.4);
  const fl = h * (portrait ? 0.9 : 0.885);
  const fw = portrait ? w * 0.16 : clamp(118 * u, 80, 170);
  const fx = portrait ? w * 0.77 : Math.min(w * 0.66, w - fw - 100);
  const potW = portrait ? w * 0.24 : 128 * u;
  const potH = potW * 0.86;
  const cx = Math.max(potW, fx - (portrait ? w * 0.22 : 168 * u));
  const potTop = fl - potH - 4 * u;
  const yTop = h * (portrait ? 0.47 : 0.2);
  const ym0 = potTop - 44 * u;
  const G = { u, fl, fw, fx, potW, potH, cx, potTop, yTop, ym0, portrait };
  G.baseY = potTop + 6 * u;
  G.Hmax = G.baseY - yTop;
  G.ys = FR.map((f) => ym0 - (ym0 - yTop) * f);
  const r = rng(21);
  G.xs = fx + fw * 0.1;
  G.len = FR.map((_, i) => fw * (i === N - 1 ? 0.7 : i % 2 ? 0.46 : 0.6) * (0.94 + r() * 0.1));
  G.tilt = FR.map(() => (r() - 0.5) * 3.2 * u);
  G.jit = FR.map(() => Array.from({ length: 12 }, () => (r() - 0.5) * 1.1 * u));
  G.star = [2, 4, 6, 8];
  G.nodes = Array.from({ length: K }, (_, k) => {
    const f = k / (K - 1);
    return {
      h: G.Hmax * (0.16 + 0.76 * f),
      len: u * (34 + 56 * Math.sin(Math.PI * (0.1 + 0.8 * f))) * (1 - 0.42 * f * f) * (portrait ? 0.92 : 1),
      side: k % 2 ? -1 : 1, ph: r() * TAU,
    };
  });
  G.motes = Array.from({ length: 5 }, (_, i) => ({ a: r() * TAU, b: r() * TAU, x: 0.04 + r() * 0.4, y: 0.15 + r() * 0.5, f: 0.12 + r() * 0.1, sp: 0.012 + r() * 0.012, sz: 0.8 + r() * 1.2, i }));
  G.blobs = Array.from({ length: 18 }, () => ({ x: r(), y: r(), a: r() * TAU, s: (0.7 + r() * 0.9), f: 0.3 + r() * 0.4, ph: r() * TAU }));
  return G;
}

const P = { x: 0, y: 0, lift: 0, a: 0, ang: 0 };

function pencilAt(t, G) {
  const { xs, len, ys, u } = G;
  const end = (i) => xs + len[i];
  const tl = T0 + (N - 1) * DT; // last stroke start
  if (t < T0) {
    const k = easeInOut(seg(t, 0.35, T0));
    P.x = lerp(xs + 160 * u, xs, k); P.y = lerp(ys[0] - 90 * u, ys[0], k);
    P.lift = 1 - k; P.a = smooth(seg(t, 0.35, 0.7));
    return P;
  }
  if (t >= tl + STROKE) {
    const k = easeInOut(seg(t, tl + STROKE, tl + STROKE + 0.7));
    P.x = lerp(end(N - 1), end(N - 1) + 150 * u, k); P.y = lerp(ys[N - 1], ys[N - 1] - 90 * u, k);
    P.lift = k; P.a = 1 - smooth(seg(t, tl + STROKE + 0.15, tl + STROKE + 0.7));
    return P;
  }
  const i = Math.min(N - 1, Math.floor((t - T0) / DT));
  const lt = t - (T0 + i * DT);
  P.a = 1;
  if (lt < STROKE) {
    const k = easeInOut(lt / STROKE);
    P.x = lerp(xs, end(i), k); P.y = ys[i] + G.tilt[i] * k; P.lift = 0;
  } else {
    const k = easeInOut((lt - STROKE) / (DT - STROKE));
    P.x = lerp(end(i), xs, k); P.y = lerp(ys[i] + G.tilt[i], ys[i + 1], k); P.lift = Math.sin(k * Math.PI) * 0.8;
  }
  return P;
}

function tipHeight(t, G) {
  // px above the soil. Tip passes each mark just after the pencil draws it.
  const hAt = (i) => G.baseY - G.ys[i];
  const kt = (i) => T0 + i * DT + 0.3;
  if (t < kt(0)) return hAt(0) * easeOut(seg(t, 0.2, kt(0)));
  for (let i = 0; i < N - 1; i++) {
    if (t < kt(i + 1)) return lerp(hAt(i), hAt(i + 1), easeInOut(seg(t, kt(i), kt(i) + 0.3)));
  }
  return hAt(N - 1);
}

function drawMark(g, G, i, pr, color) {
  const { xs, len, ys, tilt, jit, u } = G;
  const y0 = ys[i];
  const n = jit[i].length;
  const pt = (k) => [xs + (len[i] * k) / (n - 1), y0 + tilt[i] * (k / (n - 1)) + jit[i][k]];
  const run = (lw, alpha, dy) => {
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1);
      if (f > pr) {
        const pf = (pr * (n - 1)) - (k - 1);
        const [ax, ay] = pt(k - 1), [bx, by] = pt(k);
        g.lineTo(lerp(ax, bx, clamp(pf)), lerp(ay, by, clamp(pf)) + dy);
        break;
      }
      const [px, py] = pt(k);
      if (k === 0) g.moveTo(px, py + dy); else g.lineTo(px, py + dy);
    }
    g.lineWidth = lw; g.strokeStyle = color(alpha);
    g.stroke();
  };
  run(3.4 * u, 0.17, 0);
  run(1.5 * u, 0.72, 0);
  g.setLineDash(DASH_A);
  run(0.8 * u, 0.5, 0.7 * u);
  g.setLineDash([]);
}

function colors(a) { return `rgba(54,48,44,${a})`; }

function drawStar(g, x, y, r, a) {
  g.strokeStyle = `rgba(54,48,44,${0.7 * a})`;
  g.lineWidth = Math.max(1, r * 0.34);
  g.lineCap = 'round';
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const an = k * (Math.PI / 3) + 0.2;
    g.moveTo(x - Math.cos(an) * r, y - Math.sin(an) * r);
    g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
  }
  g.stroke();
}

const STEM = Array.from({ length: 24 }, (_, i) => {
  const v = i / 23;
  const m = (a, b) => Math.round(lerp(a, b, v));
  return `rgb(${m(112, 150)},${m(146, 190)},${m(66, 92)})`;
});

function stemX(G, hpx, t, s, amp) {
  const v = clamp(hpx / G.Hmax);
  return G.cx - 9 * G.u * Math.sin(v * Math.PI * 0.9) + Math.sin(t * 0.72 + v * 2.2) * 2.6 * G.u * v * v * amp + (s.px - 0.5) * 9 * G.u * v * v;
}

function drawLeaf(g, sprite, x, y, ang, len, flip) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const k = len / 100;
  g.scale(k, flip * k);
  g.drawImage(sprite, -4, -35, 108, 70);
  g.restore();
}

function plant(g, G, s, H, shadow) {
  const { u, cx, baseY, nodes } = G;
  const t = s.t;
  const amp = 0.55 + 0.45 * smooth(seg(t, 4.5, 7));
  const sprite = shadow ? L.leafShadow : L.leaf;
  const steps = 22;
  // stem
  g.lineCap = 'round';
  g.lineJoin = 'round';
  let px = stemX(G, 0, t, s, amp), py = baseY;
  if (shadow) {
    g.beginPath();
    g.moveTo(px, py);
    for (let j = 1; j <= steps; j++) g.lineTo(stemX(G, (H * j) / steps, t, s, amp), baseY - (H * j) / steps);
    g.lineWidth = 3.4 * u;
    g.strokeStyle = 'rgba(96,52,30,1)';
    g.stroke();
  }
  for (let j = 1; !shadow && j <= steps; j++) {
    const hh = (H * j) / steps;
    const nx = stemX(G, hh, t, s, amp), ny = baseY - hh;
    g.beginPath();
    g.moveTo(px, py); g.lineTo(nx, ny);
    g.lineWidth = lerp(5.2, 2.3, hh / G.Hmax) * u;
    g.strokeStyle = shadow ? 'rgba(96,52,30,1)' : STEM[Math.min(23, Math.round((j / steps) * 23))];
    g.stroke();
    px = nx; py = ny;
  }
  // cotyledons
  const co = easeOut(seg(t, 0.3, 1.0));
  if (co > 0) {
    const bx = stemX(G, 14 * u, t, s, amp), by = baseY - 14 * u;
    drawLeaf(g, sprite, bx, by, -2.6 + Math.sin(t * 0.8) * 0.03, 38 * u * co, 1);
    drawLeaf(g, sprite, bx, by, -0.54 - Math.sin(t * 0.8) * 0.03, 38 * u * co, -1);
  }
  // leaves
  for (let k = 0; k < K; k++) {
    const n = nodes[k];
    const gro = easeOut(clamp((H - n.h) / (80 * u)));
    if (gro <= 0.001) continue;
    const nx = stemX(G, n.h, t, s, amp), ny = baseY - n.h;
    const spread = lerp(1.15, 0.5 + 0.1 * Math.sin(n.ph), smooth(gro)); // radians above horizontal, young leaves stand upright
    const sway = Math.sin(t * 0.9 + n.ph) * 0.045 * amp + (s.px - 0.5) * 0.05;
    const droop = 0.22 * smooth(gro);
    const ang = n.side > 0 ? -spread + droop + sway : -Math.PI + spread - droop - sway;
    drawLeaf(g, sprite, nx, ny, ang, n.len * gro, n.side > 0 ? 1 : -1);
  }
  // growth tip: a small pair of leaves, unfurling for good at the end
  const tx = stemX(G, H, t, s, amp), ty = baseY - H;
  const bud = 0.35 + 0.65 * smooth(seg(t, 4.6, 5.8));
  const bl = 30 * u * bud;
  drawLeaf(g, sprite, tx, ty, -1.55 + 0.6 * bud + Math.sin(t * 1.1) * 0.03, bl, 1);
  drawLeaf(g, sprite, tx, ty, -1.59 - 0.6 * bud - Math.sin(t * 1.1) * 0.03, bl, -1);
  drawLeaf(g, sprite, tx, ty, -Math.PI / 2, bl * 0.6, 1);
}

export default {
  id: 'growingapp',
  duration: 5.6,
  still: 6.4,
  setup(s) {
    const G = layout(s);
    L = { G };
    L.world = buildStatic(s, G);
    L.light = buildLight(s, G);
    L.pot = potSprite(G.potW, G.potH, s.dpr);
    L.leaf = leafSprite(s.dpr);
    L.leafShadow = leafSprite(s.dpr, 'shadow');
    L.pencil = pencilSprite(G.u, s.dpr, false);
    L.pencilS = pencilSprite(G.u, s.dpr, true);
  },
  draw(s) {
    const { g, w, h, t, p } = s;
    const G = L.G;
    const { u, fx, fw, fl } = G;
    const wy = WYK * h;
    const cam = p * h * 0.95;
    const arrive = smooth(seg(t, 0, 1.5));

    g.fillStyle = GROUND;
    g.fillRect(0, 0, w, h);
    g.save();
    g.translate(0, cam);
    g.drawImage(L.world, 0, -wy, w, h * (1 + WYK));

    // window light: slides in, then drifts on a long cycle
    const Li = L.light;
    const ox = lerp(-0.07 * w, 0, easeOut(seg(t, 0, 4))) + Math.sin(t * 0.105) * 0.035 * w + (s.px - 0.5) * 14 + p * 0.1 * w;
    const kx = (Li.lw / (Li.c.width)) ;
    g.save();
    g.beginPath();
    g.rect(0, -0.6 * h, fx, 0.6 * h + fl);
    g.clip();
    g.globalAlpha = 0.62 * arrive;
    g.drawImage(Li.c, -Li.ox + ox, -Li.oy, Li.lw, Li.lh);
    // leaf shadows from the tree outside, only where the light lands
    const dx = Li.dx;
    dx.setTransform(1, 0, 0, 1, 0, 0);
    dx.globalCompositeOperation = 'source-over';
    dx.clearRect(0, 0, Li.dc.width, Li.dc.height);
    dx.drawImage(Li.c, 0, 0);
    dx.globalCompositeOperation = 'source-atop';
    dx.fillStyle = 'rgb(176,112,66)';
    const cw = Li.dc.width, ch = Li.dc.height;
    for (let i = 0; i < G.blobs.length; i++) {
      const b = G.blobs[i];
      const bx = cw * (0.1 + b.x * 0.5) + Math.sin(t * b.f + b.ph) * 6 * (1 + b.s) ;
      const by = ch * (0.18 + b.y * 0.55) + Math.cos(t * b.f * 0.8 + b.ph) * 4;
      dx.save();
      dx.translate(bx, by);
      dx.rotate(b.a + Math.sin(t * 0.4 + b.ph) * 0.25);
      dx.beginPath();
      dx.ellipse(0, 0, 6.5 * b.s * (w / 1440 + 0.3), 2.8 * b.s * (w / 1440 + 0.3), 0, 0, TAU);
      dx.fill();
      dx.restore();
    }
    dx.globalCompositeOperation = 'source-over';
    g.globalAlpha = 0.2 * arrive;
    g.drawImage(Li.dc, -Li.ox + ox, -Li.oy, Li.lw, Li.lh);
    g.restore();

    // dawn: the room starts a touch dim
    g.globalAlpha = 0.13 * (1 - arrive);
    g.fillStyle = '#6a4530';
    g.fillRect(0, -wy, w, h * (1 + WYK));
    g.globalAlpha = 1;

    // floor shadow and pot
    const pot = L.pot;
    const pxp = G.cx - pot.cx, pyp = fl - (pot.saucerY) + 3 * u;
    g.fillStyle = 'rgba(60,30,14,.2)';
    g.beginPath(); g.ellipse(G.cx + 18 * u, fl + 8 * u, G.potW * 0.74, 7 * u, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(60,30,14,.2)';
    g.beginPath(); g.ellipse(G.cx + 12 * u, fl + 6 * u, G.potW * 0.6, 4.5 * u, 0, 0, TAU); g.fill();
    g.drawImage(pot.c, pxp, pyp, pot.w, pot.h);
    // soil surface y for stem base derives from the sprite
    G.baseY = pyp + pot.baseY;
    G.Hmax = G.baseY - G.yTop;

    const H = tipHeight(t, G);

    // plant shadow on the wall (light from the upper left)
    g.save();
    g.beginPath(); g.rect(0, -wy, w, wy + fl - 0.03 * h); g.clip();
    g.globalAlpha = 0.075 * arrive;
    for (let i = 0; i < 3; i++) {
      g.save();
      g.translate(52 * u + i * 4 * u, 2 * u);
      plant(g, G, s, H, true);
      g.restore();
    }
    g.restore();

    // cane stays a little ahead of the stem
    const caneH = Math.min(G.baseY - G.yTop - 26 * u, H + 38 * u) * easeOut(seg(t, 0, 0.6));
    const caneK = caneH / (G.baseY - G.yTop);
    g.strokeStyle = '#c6a068';
    g.lineWidth = 3 * u;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(G.cx + 11 * u, G.baseY + 4 * u);
    g.lineTo(G.cx + 11 * u - 8 * u * caneK, G.baseY + 4 * u - caneH);
    g.stroke();
    g.strokeStyle = 'rgba(255,240,200,.45)';
    g.lineWidth = 0.9 * u;
    g.beginPath();
    g.moveTo(G.cx + 10 * u, G.baseY + 4 * u);
    g.lineTo(G.cx + 10 * u - 8 * u * caneK, G.baseY + 4 * u - caneH);
    g.stroke();

    plant(g, G, s, H, false);

    // pencil marks and their source ticks
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (let i = 0; i < N; i++) {
      const ti = T0 + i * DT;
      const pr = clamp((t - ti) / STROKE);
      if (pr <= 0) continue;
      drawMark(g, G, i, pr, colors);
      const endX = G.xs + G.len[i];
      const tk = smooth(seg(pr, 0.88, 1));
      if (tk > 0) {
        g.strokeStyle = `rgba(54,48,44,${0.8 * tk})`;
        g.lineWidth = 1.5 * u;
        g.beginPath();
        g.moveTo(endX, G.ys[i] + G.tilt[i] - 4.6 * u * tk);
        g.lineTo(endX + 0.4 * u, G.ys[i] + G.tilt[i] + 4.6 * u * tk);
        g.stroke();
      }
      if (G.star.includes(i)) {
        const a = easeOutBack(seg(t, ti + 0.3, ti + 0.62));
        if (a > 0) drawStar(g, endX + 12 * u, G.ys[i] - 10 * u, 3.5 * u * a, smooth(seg(t, ti + 0.3, ti + 0.5)));
      }
    }

    // pencil
    const pc = pencilAt(t, G);
    if (pc.a > 0.01) {
      const ang = -1.08 + pc.lift * 0.08;
      g.save();
      g.translate(pc.x, pc.y);
      g.rotate(ang);
      g.globalAlpha = 0.2 * pc.a;
      g.save();
      g.translate((6 + pc.lift * 20) * u, (4 + pc.lift * 10) * u);
      g.drawImage(L.pencilS, -2, -8 - 6 * u, L.pencilS.width / s.dpr, L.pencilS.height / s.dpr);
      g.restore();
      g.globalAlpha = pc.a;
      g.drawImage(L.pencil, -2, -8 - 6 * u, L.pencil.width / s.dpr, L.pencil.height / s.dpr);
      g.restore();
    }

    // dust motes drifting in the beam
    const lr = Li;
    for (let i = 0; i < G.motes.length; i++) {
      const m = G.motes[i];
      const cyc = (t * m.sp + m.b / TAU) % 1;
      const mx = (m.x + Math.sin(t * m.f + m.a) * 0.04) * w + lr.shear * cyc * 0 + cyc * 0.1 * w;
      const my = (0.75 - cyc * 0.55) * h + Math.sin(t * 0.7 + m.a) * 6;
      const al = Math.sin(cyc * Math.PI) * 0.8 * smooth(seg(t, 2, 4));
      if (al <= 0.02) continue;
      g.fillStyle = `rgba(255,248,226,${0.16 * al})`;
      g.beginPath(); g.arc(mx, my, 5 * m.sz * u, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,252,238,${0.85 * al})`;
      g.beginPath(); g.arc(mx, my, 1.5 * m.sz * u, 0, TAU); g.fill();
    }
    g.restore();

    // the wall gives way to the page
    const fade = smooth(seg(p, 0.5, 1));
    if (fade > 0) {
      g.globalAlpha = fade;
      g.fillStyle = GROUND;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 1;
    }
  },
};
