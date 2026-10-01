/*
 * TinkerBox entry: "Exploded view, then it runs".
 *
 * A small mechanism (three meshed gears, a pear cam and a follower lever on a
 * slate plate) is drawn as a true axonometric technical illustration on a
 * cutting mat. It begins exploded along dotted assembly axes, lettered like a
 * parts diagram, then slides together part by part, each seating with a small
 * rebound, and runs. Gear phases are solved from the tooth counts so the teeth
 * really mesh; the lever is solved against the cam outline so it really follows.
 * One spare screw is left over on the bench. At rest it keeps turning slowly and
 * every 12 s lifts apart a little and re-seats. Scroll tilts the whole bench
 * down to its edge and the mat fades into the page ground.
 */
import { clamp, lerp, seg, smooth, easeOut, easeInOut, rng } from '/web/shared/pool-entry/pool-entry.mjs';

const GROUND = '#10261d';           // must equal --entry-ground in pool.css
const CHALK = '#e9f0e5';
const ORANGE = '#ff6a1f';
const INK = '#0c1d15';
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- the mechanism
// Units are gear-module units (1 unit ~ one tooth height). Plane x,y; z is up.
const N1 = 24, N2 = 12, N3 = 36;
const R1 = N1 / 2, R2 = N2 / 2, R3 = N3 / 2;
const A = { x: 0, y: 0 };
const a12 = -30 * Math.PI / 180;
const B = { x: A.x + (R1 + R2) * Math.cos(a12), y: A.y + (R1 + R2) * Math.sin(a12) };
const a23 = 24 * Math.PI / 180;
const C = { x: B.x + (R2 + R3) * Math.cos(a23), y: B.y + (R2 + R3) * Math.sin(a23) };
const U_ANG = -76 * Math.PI / 180;
const UX = Math.cos(U_ANG), UY = Math.sin(U_ANG);
const VX = Math.cos(U_ANG + Math.PI / 2), VY = Math.sin(U_ANG + Math.PI / 2);
const LEVL = 20, ROLL = 2, H0 = 9.2;
const D = { x: C.x + UX * (H0 + ROLL) + VX * LEVL, y: C.y + UY * (H0 + ROLL) + VY * LEVL };
const PLATE = { x0: -17, x1: 70, y0: -28, y1: 31, r: 3.2, cx: 26.5, cy: 1.5 };
const SPARE = { x: 46, y: 44 };

// Part table. k: kind. z0,z1 seat bottom/top. d: exploded height above the seat.
// ts: when it starts to fall in (s). Order here is draw order after the plate.
const P = [
  { k: 'pin', x: A.x, y: A.y, z0: 0, z1: 3.5, r: 1.0, d: 3.2, ts: 1.95 },
  { k: 'pin', x: B.x, y: B.y, z0: 0, z1: 3.5, r: 1.0, d: 3.2, ts: 2.02 },
  { k: 'pin', x: C.x, y: C.y, z0: 0, z1: 5.3, r: 1.0, d: 3.2, ts: 2.09 },
  { k: 'pin', x: D.x, y: D.y, z0: 0, z1: 6.7, r: 1.0, d: 3.2, ts: 2.16 },
  { k: 'ring', x: A.x, y: A.y, z0: 0, z1: 0.3, r: 3.0, ri: 1.2, d: 8, ts: 2.4, pin: 0 },
  { k: 'ring', x: B.x, y: B.y, z0: 0, z1: 0.3, r: 3.0, ri: 1.2, d: 8, ts: 2.47, pin: 1 },
  { k: 'ring', x: C.x, y: C.y, z0: 0, z1: 0.3, r: 3.0, ri: 1.2, d: 8, ts: 2.54, pin: 2 },
  { k: 'collar', x: D.x, y: D.y, z0: 0, z1: 4.1, r: 2.5, ri: 1.2, d: 8, ts: 2.61, pin: 3 },
  { k: 'gear', x: A.x, y: A.y, z0: 0.3, z1: 2.3, N: N1, rp: R1, d: 14, ts: 2.85, pin: 0, holes: 4, hr: 2.3, hd: 7.2 },
  { k: 'gear', x: B.x, y: B.y, z0: 0.3, z1: 2.3, N: N2, rp: R2, d: 14, ts: 2.98, pin: 1, holes: 0, hr: 0, hd: 0 },
  { k: 'gear', x: C.x, y: C.y, z0: 0.3, z1: 2.3, N: N3, rp: R3, d: 14, ts: 3.11, pin: 2, holes: 5, hr: 3.2, hd: 11.2 },
  { k: 'cam', x: C.x, y: C.y, z0: 2.3, z1: 4.1, d: 21, ts: 3.45, pin: 2 },
  { k: 'lever', x: D.x, y: D.y, z0: 4.1, z1: 5.5, d: 26, ts: 3.78, pin: 3 },
  { k: 'cap', x: A.x, y: A.y, z0: 2.3, z1: 2.7, r: 2.4, ri: 1.0, d: 32, ts: 4.1, pin: 0 },
  { k: 'cap', x: B.x, y: B.y, z0: 2.3, z1: 2.7, r: 2.4, ri: 1.0, d: 32, ts: 4.18, pin: 1 },
  { k: 'cap', x: C.x, y: C.y, z0: 4.1, z1: 4.5, r: 2.4, ri: 1.0, d: 32, ts: 4.26, pin: 2 },
  { k: 'cap', x: D.x, y: D.y, z0: 5.5, z1: 5.9, r: 2.4, ri: 1.0, d: 32, ts: 4.34, pin: 3 },
];
const NP = P.length;
const FALL = 0.62;
// Lettered like a parts diagram. Index into P, or -1 for the plate, -2 for the spare.
// off: marker offset in screen units (1 = LS px) for landscape and portrait.
const CALL = [
  { l: 'A', i: -1, off: [-1.5, 6.8], offp: [-1.0, 5.4], at: 0.25 },
  { l: 'B', i: 2, off: [6.5, 0.4], offp: [3.0, 0.4], at: 0.4 },
  { l: 'C', i: 6, off: [5.6, 3.0], offp: [4.2, 3.4], at: 0.55 },
  { l: 'D', i: 8, off: [-5.2, -2.6], offp: [-3.2, -1.8], at: 0.7 },
  { l: 'E', i: 9, off: [-3.4, -4.6], offp: [3.0, -3.2], at: 0.85 },
  { l: 'F', i: 10, off: [8.4, 2.2], offp: [4.2, 2.6], at: 1.0 },
  { l: 'G', i: 11, off: [9.4, -3.6], offp: [4.4, -3.8], at: 1.15 },
  { l: 'H', i: 12, off: [7.2, -4.2], offp: [3.6, -3.9], at: 1.3 },
  { l: 'J', i: 15, off: [6.4, -2.6], offp: [3.2, -2.4], at: 1.45 },
];

// ---------------------------------------------------------------- scratch + view
const buf = {
  g1x: new Float32Array(300), g1y: new Float32Array(300),
  g2x: new Float32Array(300), g2y: new Float32Array(300),
  g3x: new Float32Array(300), g3y: new Float32Array(300),
  cx: new Float32Array(96), cy: new Float32Array(96),
  lx: new Float32Array(64), ly: new Float32Array(64),
};
const TA = [-0.31, -0.22, -0.11, 0.11, 0.22, 0.31, 0.5];
const TR = [0, 1, 2, 2, 1, 0, 0];

let EXPL = 1, W = 0, H = 0, PORT = false, LS = 10, BASE_TX = 0, BASE_TY = 0, PSI0 = 0;
let vcx = 0, vcy = 0, vS = 10, vcY = 1, vsY = 0, vK = 0.56, vZ = 0.83;
let SX = 0, SY = 0;
const proj = (x, y, z) => {
  const rx = x * vcY - y * vsY, ry = x * vsY + y * vcY;
  SX = vcx + vS * rx; SY = vcy + vS * (ry * vK - z * vZ);
};

// Sprites, built once in setup.
let sprBrass, sprBrassDk, sprOrange, sprPlate, sprLamp, sprShade, sprGrain, pinGrad, fontsReady = false;
const camPts = 72;
let rngSeed = 0;

function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function faceSprite(c0, c1, c2, c3, seed, brush, spec = 0.26) {
  const [c, x] = makeCanvas(160, 160);
  const gr = x.createLinearGradient(0, 0, 160, 160);
  gr.addColorStop(0, c0); gr.addColorStop(0.38, c1); gr.addColorStop(0.72, c2); gr.addColorStop(1, c3);
  x.fillStyle = gr; x.fillRect(0, 0, 160, 160);
  const r = rng(seed);
  if (brush) {
    for (let i = 0; i < 70; i++) {
      x.strokeStyle = `rgba(${r() < 0.5 ? '255,255,235' : '0,0,0'},${0.02 + r() * 0.035})`;
      x.lineWidth = 0.6 + r() * 1.2;
      x.beginPath(); const rad = 8 + r() * 76; x.arc(80, 80, rad, 0, TAU); x.stroke();
    }
  }
  const sp = x.createRadialGradient(46, 40, 4, 46, 40, 90);
  sp.addColorStop(0, `rgba(255,255,240,${spec})`); sp.addColorStop(1, 'rgba(255,255,240,0)');
  x.fillStyle = sp; x.fillRect(0, 0, 160, 160);
  return c;
}

export default {
  id: 'tinkerbox',
  duration: 6.2,
  still: 5.9,

  setup(s) {
    W = s.w; H = s.h; PORT = s.portrait; EXPL = PORT ? 0.64 : 1;
    if (PORT) {
      LS = Math.min(W * 0.0132, H * 0.0074);
      SPARE.x = 80; SPARE.y = 8;
      PSI0 = 80 * Math.PI / 180;
      BASE_TX = W * 0.5; BASE_TY = H * 0.695;
    } else {
      LS = Math.min(W * 0.0062, H * 0.0098);
      PSI0 = -14 * Math.PI / 180;
      SPARE.x = 46; SPARE.y = 44;
      BASE_TX = W * 0.685; BASE_TY = H * 0.60;
    }
    sprBrass = faceSprite('#d9dcc0', '#adb08c', '#858a68', '#5f6549', 3, true);
    sprBrassDk = faceSprite('#a3a687', '#80846a', '#5c6149', '#444832', 4, true);
    sprOrange = faceSprite('#ff9552', '#ff6a1f', '#e0500f', '#b83e08', 5, false);
    sprPlate = faceSprite('#2c4136', '#263a30', '#21332a', '#1b2b24', 6, false, 0.05);

    // Lamp pool on the mat.
    {
      const [c, x] = makeCanvas(512, 512);
      const g = x.createRadialGradient(256, 256, 10, 256, 256, 256);
      g.addColorStop(0, 'rgba(46,92,70,0.62)'); g.addColorStop(0.55, 'rgba(30,64,48,0.26)'); g.addColorStop(1, 'rgba(16,38,29,0)');
      x.fillStyle = g; x.fillRect(0, 0, 512, 512); sprLamp = c;
    }
    // Vignette and a quiet pool behind the copy.
    {
      const [c, x] = makeCanvas(Math.max(2, Math.round(W / 2)), Math.max(2, Math.round(H / 2)));
      const w = c.width, h = c.height;
      const v = x.createRadialGradient(w * 0.6, h * 0.5, Math.min(w, h) * 0.3, w * 0.55, h * 0.5, Math.max(w, h) * 0.85);
      v.addColorStop(0, 'rgba(6,14,10,0)'); v.addColorStop(1, 'rgba(6,14,10,0.62)');
      x.fillStyle = v; x.fillRect(0, 0, w, h);
      const q = PORT
        ? x.createLinearGradient(0, 0, 0, h * 0.5)
        : x.createRadialGradient(w * 0.2, h * 0.5, 0, w * 0.2, h * 0.5, w * 0.4);
      q.addColorStop(0, 'rgba(10,24,17,0.9)'); q.addColorStop(0.62, 'rgba(10,24,17,0.7)'); q.addColorStop(0.8, 'rgba(10,24,17,0.32)'); q.addColorStop(1, 'rgba(10,24,17,0)');
      x.fillStyle = q; x.fillRect(0, 0, w, h);
      sprShade = c;
    }
    // Grain.
    {
      const [c, x] = makeCanvas(192, 192);
      const r = rng(77);
      const id = x.createImageData(192, 192);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = r() < 0.5 ? 255 : 0;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = r() * 11;
      }
      x.putImageData(id, 0, 0);
      sprGrain = s.g.createPattern(c, 'repeat');
    }
    // Cylinder shading for pins, in unit width.
    {
      const x = s.g;
      pinGrad = x.createLinearGradient(-1, 0, 1, 0);
      pinGrad.addColorStop(0, '#5d5840'); pinGrad.addColorStop(0.3, '#d6d1a6'); pinGrad.addColorStop(0.55, '#a89f74'); pinGrad.addColorStop(1, '#4c4833');
    }
    if (!fontsReady && document.fonts?.load) {
      document.fonts.load('700 13px "Public Sans"').then(() => { fontsReady = true; }).catch(() => {});
    }
  },

  draw(s) {
    const { g, t, p } = s;
    if (!sprBrass) return;
    const reduced = s.reduced;
    // ---- view: yaw, elevation and anchor, with rest breathing and the scroll tilt
    const dep = easeInOut(p);
    const breathe = reduced ? 0 : Math.sin(t * 0.52) * 0.012;
    const psi = PSI0 + breathe + (s.px - 0.5) * 0.07 + (PORT ? 0 : dep * -0.1);
    const el = lerp(0.62, 0.075, dep) + (s.py - 0.5) * 0.03;
    vS = LS * lerp(1, PORT ? 0.78 : 0.7, dep);
    vcY = Math.cos(psi); vsY = Math.sin(psi); vK = Math.sin(el); vZ = Math.cos(el);
    const tx = lerp(BASE_TX, PORT ? W * 0.5 : W * 0.5, dep);
    const ty = lerp(BASE_TY, H * 0.82, dep);
    {
      const rx = PLATE.cx * vcY - PLATE.cy * vsY, ry = PLATE.cx * vsY + PLATE.cy * vcY;
      vcx = tx - vS * rx; vcy = ty - vS * ry * vK;
    }

    // ---- motion state
    const T0 = 4.65;                           // motor on
    const w1 = 0.46, boost = 1.35;
    let th1 = 0;
    if (t > T0) {
      const q = t - T0, R = 1.4;
      th1 = w1 * (q < R ? q * q / (2 * R) : q - R / 2);
      const u = seg(t, T0, T0 + 3.4);
      th1 += boost * (u * 3.4 / 2 - Math.sin(2 * Math.PI * u) * 3.4 / (4 * Math.PI));
    }
    th1 += 0.3;
    const th2 = a12 + Math.PI - Math.PI / N2 - (a12 - th1) * N1 / N2;
    const th3 = a23 + Math.PI - Math.PI / N3 - (a23 - th2) * N2 / N3;

    // part explode state
    const zOf = ST.z, alOf = ST.al, exOf = ST.ex, agOf = ST.age;
    partStates(t, zOf, alOf, exOf, agOf);

    // ---- backdrop
    g.fillStyle = GROUND; g.fillRect(0, 0, W, H);
    const lamp = LS * 66;
    proj(PLATE.cx, PLATE.cy, 0);
    g.globalAlpha = 1 - 0.0 * dep;
    g.drawImage(sprLamp, SX - lamp, SY - lamp * 0.8, lamp * 2, lamp * 1.6);
    mat(g, t, dep, psi);

    // ---- plate
    const plAl = reduced ? 1 : smooth(seg(t, 0.05, 0.7));
    const plZ = (1 - easeOut(seg(t, 0.05, 0.9))) * -3;
    g.globalAlpha = plAl;
    drawPlate(g, plZ);

    // ---- dotted assembly axes, then spare
    axes(g, t);
    spare(g, t, dep);

    // ---- cam / lever solve
    camBuild(th3);
    const hTop = camSupport();
    const dl = Math.asin(clamp((hTop - H0) / LEVL, -0.5, 0.5));

    // ---- part shadows on the plate
    g.save(); platePath(g, 0, 0); g.clip();
    g.fillStyle = 'rgba(4,12,8,0.30)';
    for (let i = 0; i < NP; i++) {
      const q = P[i]; if (q.k === 'pin') continue;
      const z = Math.max(0, zOf[i] - 0);
      const sh = z * 0.5 + 0.35;
      g.globalAlpha = alOf[i] * Math.max(0.18, 0.62 - z * 0.014);
      shadowOf(g, i, q, th1, th2, th3, dl, sh, sh * 0.62);
    }
    g.restore();

    // ---- parts, painter's order
    for (let i = 0; i < NP; i++) {
      const q = P[i];
      g.globalAlpha = alOf[i];
      if (alOf[i] <= 0.003) continue;
      const z = zOf[i];
      switch (q.k) {
        case 'pin': drawPin(g, q, z); break;
        case 'ring': case 'collar': case 'cap': drawRing(g, q, z, exOf[i], i); drawStub(g, q, z + (q.z1 - q.z0)); break;
        case 'gear': {
          const th = q.N === N1 ? th1 : q.N === N2 ? th2 : th3;
          drawGear(g, q, z, th, i); drawStub(g, q, z + (q.z1 - q.z0)); break;
        }
        case 'cam': drawCam(g, q, z); drawStub(g, q, z + (q.z1 - q.z0)); break;
        case 'lever': drawLever(g, q, z, dl); break;
        default: break;
      }
      // Seating ticks.
      if (q.k !== 'pin' && q.k !== 'ring' && agOf[i] > 0 && agOf[i] < 0.34) seatTicks(g, q, agOf[i], z);
    }
    g.globalAlpha = 1;

    // ---- letters and leaders
    callouts(g, t, exOf, zOf);

    // ---- atmosphere
    g.globalAlpha = 1;
    g.drawImage(sprShade, 0, 0, W, H);
    g.globalAlpha = 1;
    g.fillStyle = sprGrain; g.fillRect(0, 0, W, H);

    // ---- depart: the mat melts into the page ground
    const fade = smooth(seg(p, 0.5, 0.98));
    if (fade > 0) { g.globalAlpha = fade; g.fillStyle = GROUND; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (p >= 0.995) { g.fillStyle = GROUND; g.fillRect(0, 0, W, H); }
  },
};

// ---------------------------------------------------------------- part state
const ST = { intro: new Float32Array(NP), z: new Float32Array(NP), al: new Float32Array(NP), ex: new Float32Array(NP), age: new Float32Array(NP) };
const TS = 0.3, FALLPOW = 2.1, SEAT_AT = 0.78;
function fallRemain(u) { if (u <= 0) return 1; if (u >= 1) return 0; return 1 - Math.pow(clamp(u / SEAT_AT), FALLPOW); }
function bounceOf(u) { if (u <= SEAT_AT || u >= 1) return 0; const v = (u - SEAT_AT) / (1 - SEAT_AT); return 0.34 * Math.sin(Math.PI * v) * (1 - v); }
const CYC = 12, CYC0 = 9.4, LIFT = 0.22;

function partStates(t, z, al, ex, age) {
  const ph = t >= CYC0 ? (t - CYC0) % CYC : -1;
  for (let i = 0; i < NP; i++) {
    const q = P[i];
    const u = (t - q.ts - TS) / FALL;
    let rem = fallRemain(u);
    let b = bounceOf(u);
    let ag = -1;
    if (u >= SEAT_AT) ag = (u - SEAT_AT) * FALL;
    let e = rem;
    if (ph >= 0) {
      const rank = i;
      const upT = ph - rank * 0.02;
      const lift = smooth(upT / 0.95);
      const dT = (ph - (2.0 + rank * 0.07)) / 0.5;
      let amt = ph < 2.0 ? lift : (1 - fallRemain(dT) * 0 - (dT <= 0 ? 0 : 1 - fallRemain(dT)));
      // amt: 1 while lifted, falling to 0 on re-seat
      if (ph >= 2.0 + rank * 0.07) amt = fallRemain(dT);
      else amt = lift;
      if (ph >= 2.0 + rank * 0.07) { b += bounceOf(dT); if (dT >= SEAT_AT) ag = (dT - SEAT_AT) * 0.5; }
      e = Math.max(e, amt * LIFT);
    }
    ex[i] = e;
    ST.intro[i] = rem;
    age[i] = ag;
    const bob = e > 0.001 ? 0.3 * Math.sin(1.9 * t + i * 1.31) * Math.min(1, e * 5) : 0;
    const appear = smooth(seg(t, 0.2 + i * 0.07, 0.75 + i * 0.07));
    al[i] = appear;
    z[i] = q.z0 + q.d * EXPL * e + b + bob + (1 - appear) * 4;
  }
}

// ---------------------------------------------------------------- mat
const GRID = [[2.5, 0.05, 0.6], [10, 0.1, 0.8], [50, 0.2, 1.1]];
function mat(g, t, dep, psi) {
  const reveal = smooth(seg(t, 0.0, 1.4));
  const EX = 190;
  for (let gi = 0; gi < 3; gi++) {
    const [step, a, lw] = GRID[gi];
    g.beginPath();
    for (let v = -EX; v <= EX + 0.01; v += step) {
      if (gi < 2 && gi === 0 && Math.abs(v % 10) < 0.01) continue;
      if (gi === 1 && Math.abs(v % 50) < 0.01) continue;
      proj(v, -EX, 0); g.moveTo(SX, SY); proj(v, EX, 0); g.lineTo(SX, SY);
      proj(-EX, v, 0); g.moveTo(SX, SY); proj(EX, v, 0); g.lineTo(SX, SY);
    }
    g.strokeStyle = `rgba(233,240,229,${a * reveal})`;
    g.lineWidth = lw; g.stroke();
  }
  // protractor arcs and a 45 degree line, printed on the mat like the real thing
  g.strokeStyle = `rgba(233,240,229,${0.16 * reveal})`; g.lineWidth = 0.9;
  for (let k = 0; k < 2; k++) {
    const R = k ? 118 : 104;
    g.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI / 2 + Math.PI; proj(-26 + R * Math.cos(a) * -1, 62 + R * Math.sin(a), 0);
      if (i) g.lineTo(SX, SY); else g.moveTo(SX, SY);
    }
    g.stroke();
  }
  g.beginPath();
  for (let i = 0; i <= 90; i += 2) {
    const a = (i / 90) * Math.PI / 2 + Math.PI;
    const c = Math.cos(a), s = Math.sin(a);
    proj(-26 - 104 * c, 62 + 104 * s, 0); g.moveTo(SX, SY);
    const len = i % 10 === 0 ? 8 : 4;
    proj(-26 - (104 + len) * c, 62 + (104 + len) * s, 0); g.lineTo(SX, SY);
  }
  g.stroke();
}

// ---------------------------------------------------------------- plate
function rr(g, x0, y0, x1, y1, r, z) {
  const seg2 = 5;
  const corners = [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]];
  let first = true;
  for (let c = 0; c < 4; c++) {
    const [cx, cy, a0] = corners[c];
    for (let i = 0; i <= seg2; i++) {
      const a = a0 + (i / seg2) * Math.PI / 2;
      proj(cx + r * Math.cos(a), cy + r * Math.sin(a), z);
      if (first) { g.moveTo(SX, SY); first = false; } else g.lineTo(SX, SY);
    }
  }
  g.closePath();
}
function circ(g, cx, cy, r, z, n = 16) {
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU; proj(cx + r * Math.cos(a), cy + r * Math.sin(a), z);
    if (i) g.lineTo(SX, SY); else g.moveTo(SX, SY);
  }
  g.closePath();
}
const PLATE_HOLES = [[-13, -24], [66, -24], [-13, 27], [66, 27]];
function platePath(g, z, dz) {
  g.beginPath();
  rr(g, PLATE.x0, PLATE.y0, PLATE.x1, PLATE.y1, PLATE.r, z);
  for (let i = 0; i < 4; i++) circ(g, PLATE_HOLES[i][0], PLATE_HOLES[i][1], 1.35, z);
}
function drawPlate(g, lift) {
  // shadow on the mat
  g.save();
  g.fillStyle = 'rgba(3,10,7,0.5)';
  g.beginPath(); rr(g, PLATE.x0 + 2.5, PLATE.y0 + 2.2, PLATE.x1 + 3.5, PLATE.y1 + 3.2, PLATE.r, -1.4 + lift); g.fill();
  g.restore();
  const top = lift, bot = -2.4 + lift;
  const n = 4;
  for (let i = 0; i < n; i++) {
    const z = lerp(bot, top, i / n);
    platePath(g, z); g.fillStyle = i === 0 ? '#0b1610' : '#14231b'; g.fill('evenodd');
  }
  platePath(g, bot); g.strokeStyle = 'rgba(233,240,229,0.34)'; g.lineWidth = 0.9; g.stroke();
  platePath(g, top);
  g.save(); g.clip('evenodd');
  proj(PLATE.cx, PLATE.cy, top); const ax = SX; const ay = SY;
  const wpx = (PLATE.x1 - PLATE.x0) * vS, hpx = (PLATE.y1 - PLATE.y0) * vS * vK;
  g.drawImage(sprPlate, ax - wpx * 0.65, ay - hpx * 0.8, wpx * 1.3, hpx * 1.6);
  // silkscreened border and registration marks
  g.strokeStyle = 'rgba(233,240,229,0.24)'; g.lineWidth = 0.9;
  g.beginPath(); rr(g, PLATE.x0 + 2.6, PLATE.y0 + 2.6, PLATE.x1 - 2.6, PLATE.y1 - 2.6, 1.8, top); g.stroke();
  g.beginPath();
  for (const [hx, hy] of PLATE_HOLES) {
    proj(hx - 2.8, hy, top); g.moveTo(SX, SY); proj(hx + 2.8, hy, top); g.lineTo(SX, SY);
    proj(hx, hy - 2.8, top); g.moveTo(SX, SY); proj(hx, hy + 2.8, top); g.lineTo(SX, SY);
  }
  g.stroke();
  // pitch-circle ghosts: where the gears will sit
  g.strokeStyle = 'rgba(233,240,229,0.14)'; g.setLineDash(DASH_FINE);
  g.beginPath(); circ(g, A.x, A.y, R1, top, 40); circ(g, B.x, B.y, R2, top, 28); circ(g, C.x, C.y, R3, top, 56); g.stroke();
  g.setLineDash(DASH_NONE);
  g.restore();
  platePath(g, top); g.strokeStyle = 'rgba(233,240,229,0.9)'; g.lineWidth = 1.2; g.stroke();
  // slotted holes show the mat through
  void ax; void ay;
}
const DASH_FINE = [2, 4], DASH_NONE = [], DASH_CL = [14, 3, 2, 3];

// ---------------------------------------------------------------- cylinders
function cylSide(g, x, y, r, za, zb, fill) {
  proj(x, y, za); const x0 = SX, y0 = SY;
  proj(x, y, zb); const y1 = SY;
  const rs = r * vS;
  g.beginPath();
  g.moveTo(x0 - rs, y0); g.lineTo(x0 - rs, y1);
  g.ellipse(x0, y1, rs, rs * vK, 0, Math.PI, 0, true);
  g.lineTo(x0 + rs, y0);
  g.ellipse(x0, y0, rs, rs * vK, 0, 0, Math.PI, false);
  g.closePath();
  g.fillStyle = fill; g.fill();
  return rs;
}
function drawPin(g, q, z) {
  proj(q.x, q.y, 0); const x0 = SX, y0 = SY;
  proj(q.x, q.y, q.z1 - q.z0 + z - q.z0 + 0); // z is the exploded base
  const ytop = SY - 0;
  const base = z; // exploded bottom z
  proj(q.x, q.y, base); const yb = SY;
  proj(q.x, q.y, base + (q.z1 - q.z0)); const yt = SY;
  const rs = q.r * vS;
  g.save();
  g.translate(x0, yb); g.scale(rs, 1);
  g.fillStyle = pinGrad; g.fillRect(-1, yt - yb, 2, yb - yt);
  g.restore();
  g.beginPath(); g.ellipse(x0, yb, rs, rs * vK, 0, 0, Math.PI); g.fillStyle = '#5a553b'; g.fill();
  g.beginPath(); g.ellipse(x0, yt, rs, rs * vK, 0, 0, TAU); g.fillStyle = '#d7d2a8'; g.fill();
  g.strokeStyle = 'rgba(233,240,229,0.85)'; g.lineWidth = 1; g.stroke();
  g.beginPath(); g.moveTo(x0 - rs, yt); g.lineTo(x0 - rs, yb); g.moveTo(x0 + rs, yt); g.lineTo(x0 + rs, yb);
  g.strokeStyle = 'rgba(233,240,229,0.55)'; g.stroke();
  void ytop; void y0;
}
// The part of a pin that stands proud of a seated part.
function drawStub(g, q, zTop) {
  const pin = P[q.pin]; if (!pin || q.pin === undefined) return;
  const pinTop = ST.z[q.pin] + (pin.z1 - pin.z0);
  if (zTop >= pinTop - 0.05) return;
  const rs = pin.r * vS;
  proj(pin.x, pin.y, zTop); const x0 = SX, yb = SY;
  proj(pin.x, pin.y, pinTop); const yt = SY;
  g.save(); g.translate(x0, yb); g.scale(rs, 1);
  g.fillStyle = pinGrad; g.fillRect(-1, yt - yb, 2, yb - yt); g.restore();
  g.beginPath(); g.ellipse(x0, yt, rs, rs * vK, 0, 0, TAU); g.fillStyle = '#d7d2a8'; g.fill();
  g.strokeStyle = 'rgba(233,240,229,0.85)'; g.lineWidth = 1; g.stroke();
}
function drawRing(g, q, z, ex, i) {
  const th = q.z1 - q.z0;
  const cap = q.k === 'cap';
  const rs0 = q.r * vS;
  cylSide(g, q.x, q.y, q.r, z, z + th, cap ? '#6f6947' : '#6a6446');
  proj(q.x, q.y, z + th); const x0 = SX, y0 = SY;
  g.beginPath(); g.ellipse(x0, y0, rs0, rs0 * vK, 0, 0, TAU);
  g.fillStyle = cap ? '#c9c395' : '#b8b087'; g.fill();
  g.strokeStyle = 'rgba(233,240,229,0.9)'; g.lineWidth = 1.1; g.stroke();
  const ri = q.ri * vS;
  g.beginPath(); g.ellipse(x0, y0, ri, ri * vK, 0, 0, TAU);
  g.fillStyle = `rgba(14,26,20,${clamp(ex * 6, 0, 0.85)})`; g.fill();
  g.strokeStyle = 'rgba(233,240,229,0.55)'; g.lineWidth = 0.9; g.stroke();
  if (cap) { // the little split of a retaining ring
    g.beginPath(); g.moveTo(x0 + rs0 * 0.3, y0 - rs0 * vK * 0.93); g.lineTo(x0 + rs0 * 0.62, y0 - rs0 * vK * 0.78);
    g.strokeStyle = 'rgba(14,26,20,0.6)'; g.lineWidth = 1.1; g.stroke();
  }
  void i;
}

// ---------------------------------------------------------------- gears and cam
function gearBuild(xs, ys, q, th) {
  const p = TAU / q.N, rr0 = q.rp - 1.25, rt = q.rp + 1;
  let n = 0;
  for (let i = 0; i < q.N; i++) {
    const c = th + i * p;
    for (let j = 0; j < 7; j++) {
      const a = c + TA[j] * p, r = TR[j] === 0 ? rr0 : TR[j] === 1 ? q.rp : rt;
      xs[n] = q.x + r * Math.cos(a); ys[n] = q.y + r * Math.sin(a); n++;
    }
  }
  return n;
}
function gearArrays(q) { return q.N === N1 ? [buf.g1x, buf.g1y] : q.N === N2 ? [buf.g2x, buf.g2y] : [buf.g3x, buf.g3y]; }
function polyPath(g, xs, ys, n, z) {
  for (let i = 0; i < n; i++) { proj(xs[i], ys[i], z); if (i) g.lineTo(SX, SY); else g.moveTo(SX, SY); }
  g.closePath();
}
function gearPath(g, q, xs, ys, n, z, th) {
  g.beginPath();
  polyPath(g, xs, ys, n, z);
  circ(g, q.x, q.y, 1.5, z, 14);
  for (let h = 0; h < q.holes; h++) {
    const a = th + (h + 0.5) * TAU / q.holes;
    circ(g, q.x + q.hd * Math.cos(a), q.y + q.hd * Math.sin(a), q.hr, z, 14);
  }
}
function layers(th, zs) { return clamp(Math.round(th * vZ * vS / 1.6), 2, 9); }
function drawGear(g, q, z, th, idx) {
  const [xs, ys] = gearArrays(q);
  const n = gearBuild(xs, ys, q, th);
  const t = q.z1 - q.z0, nl = layers(t);
  for (let l = 0; l < nl; l++) {
    gearPath(g, q, xs, ys, n, z + (t * l) / nl, th);
    g.fillStyle = l === 0 ? '#3c3a29' : '#5f5a3e'; g.fill('evenodd');
  }
  gearPath(g, q, xs, ys, n, z, th); g.strokeStyle = 'rgba(233,240,229,0.3)'; g.lineWidth = 0.8; g.stroke();
  gearPath(g, q, xs, ys, n, z + t, th);
  g.fillStyle = '#9d946a'; g.fill('evenodd');
  g.save(); g.clip('evenodd');
  const rs = (q.rp + 1.2) * vS;
  proj(q.x, q.y, z + t);
  g.drawImage(sprBrass, SX - rs, SY - rs * vK, rs * 2, rs * 2 * vK);
  // hub boss ring and pitch circle, engraved
  g.beginPath(); circ(g, q.x, q.y, 3.0, z + t, 20);
  g.strokeStyle = 'rgba(14,26,20,0.35)'; g.lineWidth = 1; g.stroke();
  g.beginPath(); circ(g, q.x, q.y, q.rp - 0.4, z + t, 48);
  g.strokeStyle = 'rgba(14,26,20,0.16)'; g.lineWidth = 0.8; g.stroke();
  g.restore();
  gearPath(g, q, xs, ys, n, z + t, th);
  g.strokeStyle = 'rgba(233,240,229,0.92)'; g.lineWidth = 1.15; g.lineJoin = 'round'; g.stroke();
  // centre mark, dash-dot, the way a drafter marks an axis
  g.save(); g.setLineDash(DASH_CL); g.strokeStyle = 'rgba(255,106,31,0.7)'; g.lineWidth = 0.9;
  g.beginPath();
  const cl = q.rp * 0.62 + 2;
  proj(q.x - cl * Math.cos(th * 0), q.y, z + t + 0.01); g.moveTo(SX, SY);
  proj(q.x + cl, q.y, z + t + 0.01); g.lineTo(SX, SY);
  proj(q.x, q.y - cl, z + t + 0.01); g.moveTo(SX, SY);
  proj(q.x, q.y + cl, z + t + 0.01); g.lineTo(SX, SY);
  g.stroke(); g.restore();
  void idx;
}
function camBuild(th) {
  for (let i = 0; i < camPts; i++) {
    const phi = (i / camPts) * TAU;
    const b = Math.pow((1 + Math.cos(phi)) / 2, 3);
    const r = 5.8 + 6.4 * b;
    const a = th + phi;
    buf.cx[i] = C.x + r * Math.cos(a); buf.cy[i] = C.y + r * Math.sin(a);
  }
}
function camSupport() {
  let m = -1e9;
  for (let i = 0; i < camPts; i++) { const d = (buf.cx[i] - C.x) * UX + (buf.cy[i] - C.y) * UY; if (d > m) m = d; }
  return m;
}
function camPath(g, z) { g.beginPath(); polyPath(g, buf.cx, buf.cy, camPts, z); circ(g, C.x, C.y, 1.5, z, 14); }
function drawCam(g, q, z) {
  const t = q.z1 - q.z0, nl = layers(t);
  for (let l = 0; l < nl; l++) { camPath(g, z + (t * l) / nl); g.fillStyle = l === 0 ? '#3c3a29' : '#5f5a3e'; g.fill('evenodd'); }
  camPath(g, z); g.strokeStyle = 'rgba(233,240,229,0.3)'; g.lineWidth = 0.8; g.stroke();
  camPath(g, z + t); g.fillStyle = '#9d946a'; g.fill('evenodd');
  g.save(); g.clip('evenodd');
  const rs = 14 * vS; proj(C.x, C.y, z + t);
  g.drawImage(sprBrassDk, SX - rs, SY - rs * vK, rs * 2, rs * 2 * vK);
  g.restore();
  camPath(g, z + t); g.strokeStyle = 'rgba(233,240,229,0.92)'; g.lineWidth = 1.15; g.stroke();
}
// ---------------------------------------------------------------- lever
function leverBuild(dl, ox, oy) {
  // local axis from pivot towards the tip: -v rotated by dl about the pivot
  const dx = -VX * Math.cos(dl) + UX * Math.sin(dl), dy = -VY * Math.cos(dl) + UY * Math.sin(dl);
  const nx = -dy, ny = dx;
  const x0 = -10, r0 = 2.3, x1 = LEVL - 1.6, r1 = 2.5;
  let n = 0;
  const put = (lx, ly) => { buf.lx[n] = ox + dx * lx + nx * ly; buf.ly[n] = oy + dy * lx + ny * ly; n++; };
  put(x0, -r0 * 0.9); put(x0 * 0.2, -2.0); put(LEVL * 0.7, -2.1);
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI; put(x1 + r1 * Math.cos(a) * 0.8, r1 * Math.sin(a)); }
  put(LEVL * 0.7, 2.1); put(x0 * 0.2, 2.0);
  for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 + (i / 8) * Math.PI; put(x0 + r0 * Math.cos(a), r0 * Math.sin(a)); }
  return { n, dx, dy };
}
function drawLever(g, q, z, dl) {
  const { n, dx, dy } = leverBuild(dl, D.x, D.y);
  const tipx = D.x + dx * LEVL, tipy = D.y + dy * LEVL;
  const rollZ = z - 1.8; // the roller hangs under the tip, level with the cam
  // roller
  cylSide(g, tipx, tipy, ROLL, rollZ, rollZ + 1.8, '#5f5a3e');
  proj(tipx, tipy, rollZ + 1.8);
  g.beginPath(); g.ellipse(SX, SY, ROLL * vS, ROLL * vS * vK, 0, 0, TAU); g.fillStyle = '#b4ac82'; g.fill();
  g.strokeStyle = 'rgba(233,240,229,0.9)'; g.lineWidth = 1; g.stroke();
  const t = q.z1 - q.z0, nl = layers(t);
  const path = (zz) => { g.beginPath(); polyPath(g, buf.lx, buf.ly, n, zz); circ(g, D.x, D.y, 1.4, zz, 12); circ(g, tipx, tipy, 1.0, zz, 10); };
  for (let l = 0; l < nl; l++) { path(z + (t * l) / nl); g.fillStyle = l === 0 ? '#7a2c08' : '#a43a0b'; g.fill('evenodd'); }
  path(z); g.strokeStyle = 'rgba(233,240,229,0.25)'; g.lineWidth = 0.8; g.stroke();
  path(z + t); g.fillStyle = '#ff6a1f'; g.fill('evenodd');
  g.save(); g.clip('evenodd');
  proj(D.x - dx * 6, D.y - dy * 6, z + t);
  g.drawImage(sprOrange, SX - 20 * vS, SY - 14 * vS * vK - 6, 40 * vS, 28 * vS * vK + 12);
  g.restore();
  path(z + t); g.strokeStyle = 'rgba(233,240,229,0.92)'; g.lineWidth = 1.15; g.stroke();
  drawStub(g, q, z + t);
}

// ---------------------------------------------------------------- shadows
function shadowOf(g, i, q, th1, th2, th3, dl, dx, dy) {
  const z = 0;
  const shiftPath = (xs, ys, n, ox, oy) => {
    g.beginPath();
    for (let k = 0; k < n; k++) { proj(xs[k] + ox, ys[k] + oy, z); if (k) g.lineTo(SX, SY); else g.moveTo(SX, SY); }
    g.closePath(); g.fill();
  };
  if (q.k === 'gear') { const [xs, ys] = gearArrays(q); const th = q.N === N1 ? th1 : q.N === N2 ? th2 : th3; const n = gearBuild(xs, ys, q, th); shiftPath(xs, ys, n, dx, dy); }
  else if (q.k === 'cam') shiftPath(buf.cx, buf.cy, camPts, dx, dy);
  else if (q.k === 'lever') { const { n } = leverBuild(dl, D.x, D.y); shiftPath(buf.lx, buf.ly, n, dx, dy); }
  else { g.beginPath(); circ(g, q.x + dx, q.y + dy, q.r, z, 14); g.fill(); }
  void i;
}

// ---------------------------------------------------------------- assembly axes
const AXES = [A, B, C, D];
function axes(g, t) {
  g.save();
  g.lineCap = 'round'; g.setLineDash([0.1, 6.5]);
  g.lineWidth = 1.7;
  for (let a = 0; a < 4; a++) {
    // strongest explode state among the parts on this axis
    let top = 0, al = 0;
    for (let i = 0; i < NP; i++) { const q = P[i]; if (q.x !== AXES[a].x || q.y !== AXES[a].y) continue; top = Math.max(top, ST.z[i] + (q.z1 - q.z0)); al = Math.max(al, ST.ex[i]); }
    const draw = smooth(seg(t, 0.55 + a * 0.12, 1.5 + a * 0.12));
    const vis = smooth(al / 0.07) * draw;
    if (vis <= 0.01) continue;
    g.strokeStyle = `rgba(233,240,229,${0.62 * vis})`;
    proj(AXES[a].x, AXES[a].y, 0); const x0 = SX, y0 = SY;
    proj(AXES[a].x, AXES[a].y, top + 3.5); const y1 = SY;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, lerp(y0, y1, draw)); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- tick marks where a part seats
function seatTicks(g, q, age, z) {
  const k = easeOut(age / 0.34), al = 1 - k;
  proj(q.x, q.y, z + (q.z1 - q.z0));
  const x0 = SX, y0 = SY;
  const r0 = ((q.r || q.rp || 8) + 1.2) * vS;
  g.strokeStyle = `rgba(233,240,229,${0.8 * al})`; g.lineWidth = 1.2; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.95 + (i / 4) * Math.PI * 0.9;
    const c = Math.cos(a), s = Math.sin(a);
    g.moveTo(x0 + c * (r0 + 3 + k * 6), y0 + s * (r0 + 3 + k * 6) * vK);
    g.lineTo(x0 + c * (r0 + 8 + k * 10), y0 + s * (r0 + 8 + k * 10) * vK);
  }
  g.stroke();
}

// ---------------------------------------------------------------- spare screw
function spare(g, t, dep) {
  const tl = 4.9, du = 0.9;
  const u = (t - tl) / du;
  if (u <= 0) return;
  const fall = u >= 1 ? 0 : 1 - Math.pow(clamp(u), 2);
  const bounce = u >= 1 ? 0 : Math.abs(Math.sin(u * Math.PI * 2.4)) * (1 - u) * 1.4;
  let z = fall * 24 + bounce;
  let roll = (1 - easeOut(u * 0.9)) * 1.4;
  // when the bench lifts apart the spare shuffles, as if it knows
  if (t >= CYC0) {
    const ph = (t - CYC0) % CYC;
    const k = smooth(seg(ph, 0.9, 1.4)) * (1 - smooth(seg(ph, 2.3, 2.9)));
    z += k * 0.0 + Math.abs(Math.sin(ph * 7)) * 0.5 * k;
    roll += Math.sin(ph * 5) * 0.16 * k;
  }
  const ang = 0.55 + roll;
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const x = SPARE.x, y = SPARE.y;
  const len = 7.4, hw = 1.35, hh = 2.5, hl = 1.8;
  // shadow
  g.fillStyle = 'rgba(3,10,7,0.45)';
  g.beginPath();
  const sx0 = z * 0.5 + 0.5, sy0 = z * 0.3 + 0.4;
  proj(x - dx * hl + sx0, y - dy * hl + sy0 + hh * 0.2, 0);
  g.moveTo(SX, SY);
  proj(x + dx * len + sx0 + nx * hw, y + dy * len + sy0 + ny * hw, 0); g.lineTo(SX, SY);
  proj(x + dx * len + sx0 - nx * hw, y + dy * len + sy0 - ny * hw, 0); g.lineTo(SX, SY);
  proj(x - dx * hl + sx0 - nx * hh, y - dy * hl + sy0 - ny * hh, 0); g.lineTo(SX, SY);
  proj(x - dx * hl + sx0 + nx * hh, y - dy * hl + sy0 + ny * hh, 0); g.lineTo(SX, SY);
  g.closePath(); g.fill();
  const zc = z + hw;
  // shank
  const quad = (a0, a1, w) => {
    g.beginPath();
    proj(x + dx * a0 + nx * w, y + dy * a0 + ny * w, zc); g.moveTo(SX, SY);
    proj(x + dx * a1 + nx * w, y + dy * a1 + ny * w, zc); g.lineTo(SX, SY);
    proj(x + dx * a1 - nx * w, y + dy * a1 - ny * w, zc); g.lineTo(SX, SY);
    proj(x + dx * a0 - nx * w, y + dy * a0 - ny * w, zc); g.lineTo(SX, SY);
    g.closePath();
  };
  quad(0, len, hw); g.fillStyle = '#9a916a'; g.fill(); g.strokeStyle = 'rgba(233,240,229,0.9)'; g.lineWidth = 1.1; g.stroke();
  g.beginPath();
  for (let k = 1; k < 7; k++) {
    const a = k * len / 7;
    proj(x + dx * a + nx * hw, y + dy * a + ny * hw, zc); g.moveTo(SX, SY);
    proj(x + dx * (a - 0.35) - nx * hw, y + dy * (a - 0.35) - ny * hw, zc); g.lineTo(SX, SY);
  }
  g.strokeStyle = 'rgba(233,240,229,0.5)'; g.lineWidth = 0.9; g.stroke();
  // head: a short fat disc with a slot
  quad(-hl, 0, hh); g.fillStyle = '#c4bd90'; g.fill(); g.strokeStyle = 'rgba(233,240,229,0.95)'; g.lineWidth = 1.1; g.stroke();
  g.beginPath();
  proj(x - dx * hl * 0.5 + nx * hh * 0.9, y - dy * hl * 0.5 + ny * hh * 0.9, zc); g.moveTo(SX, SY);
  proj(x - dx * hl * 0.5 - nx * hh * 0.9, y - dy * hl * 0.5 - ny * hh * 0.9, zc); g.lineTo(SX, SY);
  g.strokeStyle = 'rgba(14,26,20,0.65)'; g.lineWidth = 1.4; g.stroke();
  SPARE.sx = 0;
  proj(x + dx * len * 0.5, y + dy * len * 0.5, zc); SPARE.sx = SX; SPARE.sy = SY;
}

// ---------------------------------------------------------------- callouts
function callouts(g, t, ex, zOf) {
  const mr = PORT ? 9 : 11.5;
  const f = (PORT ? 0.62 : 1) * LS;
  g.font = `700 ${PORT ? 11 : 13}px "Public Sans", system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let c = 0; c < CALL.length + 1; c++) {
    const spare = c === CALL.length;
    let ax, ay, mx, my, vis, letter, ptr;
    if (spare) {
      const u = smooth(seg(t, 5.6, 6.0));
      vis = u; if (vis <= 0.01 || SPARE.sx === undefined) continue;
      letter = 'K'; ax = SPARE.sx; ay = SPARE.sy;
      mx = ax + (PORT ? 4.6 : 6.2) * f * 0.9; my = ay + (PORT ? 3.4 : 3.8) * f * 0.9;
      if (!PORT && false) mx = ax;
      ptr = 1;
    } else {
      const d = CALL[c];
      const pop = smooth(seg(t, 0.9 + d.at * 0.22, 1.3 + d.at * 0.22));
      let e, z;
      if (d.i < 0) {
        proj(PLATE.cx + 8, PLATE.y1 - 4, 0); ax = SX; ay = SY;
        vis = pop * (1 - seg(t, 4.2, 4.9));
      } else {
        const q = P[d.i]; e = ex[d.i];
        proj(q.x, q.y, zOf[d.i] + (q.z1 - q.z0)); ax = SX; ay = SY;
        vis = pop * smooth(ST.intro[d.i] / 0.07);
      }
      if (vis <= 0.01) continue;
      letter = d.l;
      const o = PORT ? d.offp : d.off;
      mx = ax + o[0] * f; my = ay + o[1] * f;
      if (!PORT) mx = Math.max(mx, W * 0.5);
      if (PORT) mx = clamp(mx, 22, W - 22);
      ptr = pop;
    }
    // pulse on the spare so it is read as the joke
    const pulse = spare ? 0.5 + 0.5 * Math.sin(t * 2.2) : 0;
    g.globalAlpha = vis;
    g.strokeStyle = 'rgba(233,240,229,0.85)'; g.lineWidth = 1;
    const dxl = mx - ax, dyl = my - ay, dl = Math.hypot(dxl, dyl) || 1;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(mx - dxl / dl * mr, my - dyl / dl * mr); g.stroke();
    g.beginPath(); g.arc(ax, ay, 2.2, 0, TAU); g.fillStyle = CHALK; g.fill();
    if (spare) {
      g.beginPath(); g.arc(mx, my, mr + 3 + pulse * 3, 0, TAU); g.strokeStyle = `rgba(255,106,31,${0.55 * (1 - pulse)})`; g.lineWidth = 1.3; g.stroke();
    }
    const sc = ptr < 1 ? easeOutB(ptr) : 1;
    g.beginPath(); g.arc(mx, my, mr * sc, 0, TAU); g.fillStyle = ORANGE; g.fill();
    g.fillStyle = INK; g.fillText(letter, mx, my + 0.5);
  }
  g.globalAlpha = 1;
}
const easeOutB = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
