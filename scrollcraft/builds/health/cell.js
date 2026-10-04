// Health pool entrance: a living eukaryotic cell, drawn in code (three.js r180, vendored).
// A spherical cell with its upper-front quarter cut away (y > 0 and z > 0 removed).
// Rendering: image-based soft-box light, a membrane with a real lipid-bilayer lip, a Fresnel
// translucent skin, a granular satin cytoplasm with cavity shading, contact shadows,
// depth fog and a restrained bloom + grade. Organelles are modelled after their anatomy:
// double-membrane mitochondria with cristae, a pored double-envelope nucleus with chromatin,
// curved Golgi cisternae that bud vesicles, and folded rough ER studded with ribosomes.
// Everything moves by explicit functions of time and scroll. Reduced motion renders one still frame.
import * as THREE from '/web/vendor/three/three.module.min.js';

const slot = document.querySelector('[data-cell-slot]');
const act = document.querySelector('.cell-act');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// ?cell=lite: no post-processing, half pixel ratio. For software-rendered verification, where the full pipeline starves the main thread.
const lite = /[?&]cell=lite\b/.test(location.search);

const NCXr = 0.02;
// ---------- deterministic randomness and procedural noise ----------
let seed = 20260929;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rr = (a, b) => a + (b - a) * rnd();
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
};
const fbm = (x, y, o = 4) => { let a = 0.5, s = 0, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function canvasTex(w, h, paint, { srgb = true, repeat = false, aniso = 4 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); paint(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso; return t;
}
function pixelTex(w, h, fn, opts) {
  return canvasTex(w, h, (g) => {
    const im = g.createImageData(w, h), d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3] ?? 255; }
    g.putImageData(im, 0, 0);
  }, opts);
}

async function boot() {
  const canvas = document.createElement('canvas');
  canvas.className = 'cell-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch {
    slot.classList.add('cell-slot--static');
    return;
  }
  slot.append(canvas);
  const maxPR = Math.min(devicePixelRatio || 1, 2);
  let pr = lite ? 0.5 : maxPR;
  renderer.setPixelRatio(pr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  scene.fog = new THREE.Fog(0x0a2a26, 3, 8);

  // ---------- light: soft boxes baked through PMREM, plus a gentle key ----------
  {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Scene();
    room.add(new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({ color: 0x143a35, side: THREE.BackSide })));
    const box = (w, h, pos, c, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide }));
      m.position.copy(pos); m.lookAt(0, 0, 0); room.add(m);
    };
    box(8, 5, new THREE.Vector3(-4, 5, 4), 0xfff1de, 3.2);   // large warm key softbox
    box(5, 5, new THREE.Vector3(6, 2, 3), 0xbfe9ff, 1.1);    // cool fill
    box(9, 2, new THREE.Vector3(0, -5, 2), 0x3fa597, 0.7);   // teal bounce from below
    box(4, 8, new THREE.Vector3(3, 2, -6), 0x9ff0ff, 2.0);   // back rim strip
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
  }
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x0f4a52, 0.5));
  const key = new THREE.DirectionalLight(0xfff3e4, 1.5); key.position.set(-2.5, 4, 3); scene.add(key);
  const rimL = new THREE.DirectionalLight(0x8fe6ff, 0.9); rimL.position.set(3, 1.5, -3); scene.add(rimL);

  // Page-matching backdrop (the canvas is opaque so bloom behaves): rebuilt on resize.
  const bgTex = new THREE.CanvasTexture(document.createElement('canvas')); bgTex.colorSpace = THREE.SRGBColorSpace; scene.background = bgTex;
  const paintBg = (W, H) => {
    const c = bgTex.image, w = 320, h = Math.max(64, Math.round(320 * H / W)); c.width = w; c.height = h;
    const g = c.getContext('2d'), cx = 0.68 * w, cy = 0.45 * h, R = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, '#183f32'); gr.addColorStop(0.68, '#07100e'); gr.addColorStop(1, '#07100e');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); bgTex.needsUpdate = true;
  };

  const cell = new THREE.Group();
  scene.add(cell);
  const cut = (c = 0) => [new THREE.Plane(new THREE.Vector3(0, -1, 0), c), new THREE.Plane(new THREE.Vector3(0, 0, -1), c)];

  // Fresnel translucency: adds a view-angle glow so surfaces read as thin, wet and lit from within.
  const rimGlow = (mat, color, power = 2.6, strength = 0.8, key = 'rim') => {
    const col = new THREE.Color(color);
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.rimColor = { value: col };
      sh.fragmentShader = 'uniform vec3 rimColor;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
        `float fr = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), ${power.toFixed(2)});
         outgoingLight += rimColor * fr * ${strength.toFixed(2)};
         #include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => `${key}${power}${strength}`;
    return mat;
  };
  const satin = (color, extra = {}, rim = null) => {
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.1, clearcoatRoughness: 0.5, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5), ...extra });
    return rim ? rimGlow(m, rim.color, rim.power, rim.strength, rim.color) : m;
  };

  // ---------- membrane: textured skin + a bilayer lip along the cut ----------
  const skin = canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#a6d8cf'); gr.addColorStop(0.55, '#5f9f98'); gr.addColorStop(1, '#2f6a6a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const im = g.getImageData(0, 0, w, h), d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, n = fbm(x / 70, y / 70, 4) - 0.5, f = fbm(x / 9, y / 9, 2) - 0.5;
      const k = 1 + n * 0.28 + f * 0.1;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    }
    g.putImageData(im, 0, 0);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = 50 + rnd() * (h - 100), r = 10 + rnd() * 26;
      const p = g.createRadialGradient(x, y, r * 0.2, x, y, r * 1.5);
      p.addColorStop(0, `rgba(18,62,64,${0.45 + rnd() * 0.25})`); p.addColorStop(0.7, 'rgba(34,88,88,0.25)'); p.addColorStop(1, 'rgba(34,88,88,0)');
      g.fillStyle = p; g.beginPath(); g.ellipse(x, y, r * 1.7, r, rnd() * 3, 0, 6.3); g.fill();
    }
  }, { repeat: true, aniso });
  skin.wrapT = THREE.ClampToEdgeWrapping;
  const bump = canvasTex(512, 256, (g, w, h) => {
    const im = g.createImageData(w, h), d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = Math.round(255 * (0.35 + 0.65 * fbm(x / 6, y / 6, 3))); const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(im, 0, 0);
  }, { srgb: false, repeat: true, aniso });
  const membrane = new THREE.Mesh(
    new THREE.SphereGeometry(1, 160, 112),
    rimGlow(new THREE.MeshPhysicalMaterial({ map: skin, bumpMap: bump, bumpScale: 2.2, roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4, sheen: 0.8, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xd2efe6), emissiveMap: skin, emissive: new THREE.Color(0x1f5552), emissiveIntensity: 0.16, clippingPlanes: cut(), clipIntersection: true }), 0xc4f2e2, 2.6, 0.7, 'skin'),
  );
  cell.add(membrane);

  // Cytoplasm: warm satin, fine granules, an ink-blue cortex under the membrane, cavity shading at the crease.
  const cytoTex = pixelTex(1024, 512, (px, py) => {
    const x = px / 512 - 1, y = 1 - py / 512, r = Math.hypot(x, y);
    const warm = mix3([0.93, 0.85, 0.69], [0.78, 0.66, 0.50], sstep(0.15, 0.95, r));
    const m = fbm(px / 60, py / 60, 4) - 0.5, g = hash(px, py) - 0.5, g2 = fbm(px / 5, py / 5, 2) - 0.5;
    let k = 1 + m * 0.3 + g * 0.06 + g2 * 0.1;
    k *= 1 - 0.34 * Math.exp(-y / 0.1);             // cavity shading along the crease where the two faces meet
    k *= 1 - 0.18 * sstep(0.72, 0.945, r);          // darker towards the membrane
    let c = warm.map((v) => v * k);
    const cortex = sstep(0.925, 0.945, r) * (1 - sstep(0.958, 0.97, r));
    c = mix3(c, [0.36, 0.55, 0.52], cortex * 0.85);
    const inner = sstep(0.958, 0.966, r);           // pale outer lip line
    c = mix3(c, [0.80, 0.90, 0.86], inner * 0.9);
    return [Math.min(255, c[0] * 255), Math.min(255, c[1] * 255), Math.min(255, c[2] * 255), 255];
  }, { aniso });
  const grains = (scale, a) => pixelTex(256, 256, (px, py) => {
    const n = fbm(px / scale, py / scale, 3), s = hash(px >> 1, py >> 1);
    const dark = n > 0.62 ? (n - 0.62) * 3 : 0, light = s > 0.9 ? 0.5 : 0;
    return [dark > 0 ? 120 : 255, dark > 0 ? 70 : 245, dark > 0 ? 40 : 225, Math.min(255, (dark * 160 + light * 130) * a)];
  }, { repeat: true, aniso });
  const grainA = grains(14, 1), grainB = grains(6, 0.8);
  grainA.repeat.set(4, 2); grainB.repeat.set(7, 3.5);
  const cytoMat = new THREE.MeshStandardMaterial({ map: cytoTex, roughness: 0.72, metalness: 0, emissive: 0xffffff, emissiveMap: cytoTex, emissiveIntensity: 0.14, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
  const grainMat = (t) => new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, fog: false });
  const halfDisc = (r) => {
    const g = new THREE.CircleGeometry(r, 128, 0, Math.PI), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) / 0.955 + 1) / 2, p.getY(i) / 0.955);
    return g;
  };
  const lipMat = satin(0xd3e9e2, { roughness: 0.38, clearcoat: 0.3 }, { color: 0xc4f2e2, power: 2.2, strength: 0.55 });
  const lip2Mat = satin(0x5e9e98, { roughness: 0.45 });

  // Face frame: local x = u, local y = v along the face, local z = outward normal, for both cut faces.
  const mkFrame = (face) => { const g = new THREE.Group(); if (face === 'floor') { g.rotation.x = Math.PI / 2; g.scale.z = -1; } return g; };
  const faces = new THREE.Group(); cell.add(faces);
  const faceFrames = { floor: mkFrame('floor'), wall: mkFrame('wall') };
  for (const f of ['floor', 'wall']) {
    const g = faceFrames[f]; faces.add(g);
    g.add(new THREE.Mesh(halfDisc(0.955), cytoMat));
    const gA = new THREE.Mesh(halfDisc(0.955), grainMat(grainA)); gA.position.z = 0.0016; g.add(gA);
    const gB = new THREE.Mesh(halfDisc(0.955), grainMat(grainB)); gB.position.z = 0.0028; g.add(gB);
    g.userData.layers = [grainA, grainB];
    // The bilayer lip: two rounded beads, outer pale, inner blue, so the membrane has real thickness.
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.972, 0.034, 20, 160, Math.PI), lipMat); g.add(lip);
    const lip2 = new THREE.Mesh(new THREE.TorusGeometry(0.936, 0.013, 12, 160, Math.PI), lip2Mat); g.add(lip2);
    // Floor/wall flip: tori are drawn in local xy with arc 0..PI, which lands on y>0 / v>0 in both frames.
  }

  // Contact shadows: soft dark discs under things, a cheap stand-in for ambient occlusion.
  const shadowTex = canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(24,10,0,0.55)'); r.addColorStop(0.5, 'rgba(24,10,0,0.24)'); r.addColorStop(1, 'rgba(24,10,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0.5, polygonOffsetUnits: 0.5, fog: false });
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const addShadow = (face, u, v, size, op = 1) => {
    const s = new THREE.Mesh(shadowGeo, shadowMat.clone()); s.material.opacity = op;
    s.scale.setScalar(size); s.position.set(u, v, 0.0042); s.renderOrder = 2; faceFrames[face].add(s); return s;
  };

  // ---------- nucleus: pored double envelope, chromatin, nucleolus ----------
  const NC = 0.1, NR = 0.4;
  const nucleus = new THREE.Group(); nucleus.position.set(0.02, 0, 0);
  const nucBump = canvasTex(512, 256, (g, w, h) => {
    const im = g.createImageData(w, h), d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = Math.round(255 * (0.3 + 0.7 * fbm(x / 20, y / 20, 4))); const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(im, 0, 0);
  }, { srgb: false, repeat: true, aniso });
  const nucShell = new THREE.Mesh(new THREE.SphereGeometry(NR, 128, 88),
    satin(0x8a3a5c, { roughness: 0.5, bumpMap: nucBump, bumpScale: 1.1, sheen: 0.9, sheenColor: new THREE.Color(0xe2a9bf), clippingPlanes: cut(NC), clipIntersection: true }, { color: 0xe7aec4, power: 2.4, strength: 0.55 }));
  nucleus.add(nucShell);
  // Nuclear pores: small rings on the outer envelope, placed on a golden spiral and kept off the removed quarter.
  {
    const pores = [], N = 150, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i + 0.5) / N * 2, rad = Math.sqrt(1 - y * y), th = i * ga;
      const n = new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
      if (n.y * NR > NC && n.z * NR > NC) continue;
      pores.push(n);
    }
    const geo = new THREE.TorusGeometry(0.0125, 0.0042, 8, 20);
    const pm = new THREE.InstancedMesh(geo, satin(0x4a1a31, { roughness: 0.6, clearcoat: 0 }), pores.length);
    const o = new THREE.Object3D(), up = new THREE.Vector3(0, 0, 1);
    pores.forEach((n, i) => { o.position.copy(n).multiplyScalar(NR + 0.001); o.quaternion.setFromUnitVectors(up, n); o.scale.setScalar(rr(0.8, 1.25)); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); });
    nucleus.add(pm);
  }
  const Rn = Math.sqrt(NR * NR - NC * NC);
  const chroTex = pixelTex(512, 512, (px, py) => {
    const x = px / 256 - 1, y = py / 256 - 1, r = Math.hypot(x, y);
    const n = fbm(px / 15 + 3, py / 15, 5), n2 = fbm(px / 4, py / 4, 2);
    const hetero = sstep(0.5, 0.72, n) * (0.35 + 0.65 * sstep(0.35, 0.95, r)); // dense clumps hug the envelope
    let c = mix3([0.82, 0.62, 0.66], [0.50, 0.22, 0.34], hetero);
    c = c.map((v) => v * (0.94 + n2 * 0.1));
    const env1 = sstep(0.925, 0.945, r), gap = sstep(0.955, 0.965, r), env2 = sstep(0.975, 0.985, r);
    c = mix3(c, [0.40, 0.14, 0.26], env1 * (1 - gap));        // inner envelope
    c = mix3(c, [0.90, 0.78, 0.80], gap * (1 - env2) * 0.9);   // perinuclear space
    c = mix3(c, [0.48, 0.16, 0.30], env2);                    // outer envelope
    return [c[0] * 255, c[1] * 255, c[2] * 255, 255];
  }, { aniso });
  const nucInner = new THREE.MeshStandardMaterial({ map: chroTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: chroTex, emissiveIntensity: 0.16, side: THREE.DoubleSide });
  const segment = () => {
    const a0 = Math.asin(Math.min(1, NC / Rn)); const s = new THREE.Shape(); const n = 80;
    for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI - 2 * a0) * (i / n); const p = [Math.cos(a) * Rn, Math.sin(a) * Rn]; i ? s.lineTo(...p) : s.moveTo(...p); }
    s.closePath(); const g = new THREE.ShapeGeometry(s, 40), pp = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pp.count; i++) uv.setXY(i, (pp.getX(i) / Rn + 1) / 2, 1 - (pp.getY(i) / Rn + 1) / 2);
    return g;
  };
  const nFloor = new THREE.Mesh(segment(), nucInner); nFloor.rotation.x = Math.PI / 2; nFloor.position.y = NC;
  const nWall = new THREE.Mesh(segment(), nucInner); nWall.position.z = NC;
  nucleus.add(nFloor, nWall);
  const nucleolusTex = pixelTex(256, 256, (px, py) => {
    const n = fbm(px / 9, py / 9, 4), s = hash(px, py);
    const c = mix3([0.30, 0.08, 0.17], [0.52, 0.18, 0.30], n);
    return [c[0] * 255 * (0.9 + s * 0.14), c[1] * 255, c[2] * 255, 255];
  }, { repeat: true, aniso });
  const nucleolus = new THREE.Mesh(new THREE.SphereGeometry(0.115, 64, 48), satin(0xffffff, { map: nucleolusTex, roughness: 0.6, clearcoat: 0.1 }, { color: 0xb06a88, power: 2.4, strength: 0.35 }));
  nucleolus.position.set(0.02, NC, NC);
  nucleus.add(nucleolus);
  cell.add(nucleus);
  addShadow('floor', 0.02, 0.3, 1.25, 0.8); addShadow('wall', 0.02, 0.3, 1.25, 0.8);

  // ---------- organelles ----------
  const live = [];
  const addOrg = (body, face, u, v, o = {}) => {
    const holder = new THREE.Group(); holder.add(body); faceFrames[face].add(holder);
    const sh = o.shadow === 0 ? null : addShadow(face, u, v, o.shadow ?? 0.2, o.shadowOp ?? 0.9);
    const d = { holder, body, sh, u, v, ph: rnd() * 6.28, sp: rr(0.3, 0.65), amp: o.amp ?? 0.03, spin: o.spin ?? 0.1, morph: o.morph ?? 0.07, base: body.scale.clone(), rot: o.rot ?? rnd() * 6.28, min: o.min ?? 0.5 };
    live.push(d); return d;
  };
  const faceFor = (i) => (i % 2 ? 'floor' : 'wall');

  // Mitochondrion: outer membrane, inner membrane, and cristae folds that reach in alternately from each side.
  const sphereG = new THREE.SphereGeometry(1, 40, 28);
  const outerM = satin(0xe0927a, { transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.4, clearcoat: 0.2 }, { color: 0xffd6c2, power: 2.0, strength: 0.55 });
  const innerM = satin(0xa8483a, { transparent: true, opacity: 0.8, depthWrite: false, roughness: 0.5, clearcoat: 0 }, { color: 0xf0a28a, power: 2.2, strength: 0.4 });
  const cristaM = satin(0xf2c4a2, { roughness: 0.5, clearcoat: 0, emissive: 0x5a2414, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const cristaG = new THREE.CylinderGeometry(1, 1, 0.005, 20);
  const mito = (len, rad) => {
    const g = new THREE.Group();
    const o = new THREE.Mesh(sphereG, outerM); o.scale.set(len, rad, rad * 0.95); g.add(o);
    const i = new THREE.Mesh(sphereG, innerM); i.scale.set(len * 0.9, rad * 0.78, rad * 0.74); g.add(i);
    const n = Math.max(5, Math.round(len / 0.02)), cr = new THREE.InstancedMesh(cristaG, cristaM, n), t = new THREE.Object3D();
    for (let k = 0; k < n; k++) {
      const x = ((k + 0.5) / n * 2 - 1) * len * 0.8, e = Math.sqrt(Math.max(0.05, 1 - (x / (len * 0.9)) ** 2)), side = k % 2 ? 1 : -1;
      t.position.set(x, side * rad * 0.2, 0); t.rotation.set(0, 0, Math.PI / 2);
      t.scale.set(rad * 0.7 * e, 1, rad * 0.62 * e); t.updateMatrix(); cr.setMatrixAt(k, t.matrix);
    }
    g.add(cr); return g;
  };
  [['floor', -0.62, 0.42, 0.4, 1.05], ['floor', 0.64, 0.3, 2.0, 0.9], ['floor', 0.28, 0.8, 1.2, 0.8], ['wall', -0.52, 0.62, 0.3, 1.0], ['wall', 0.66, 0.4, 1.4, 1.1], ['wall', 0.16, 0.8, 1.9, 0.85], ['floor', -0.22, 0.9, 0.2, 0.6], ['wall', -0.78, 0.22, 2.7, 0.7]]
    .forEach(([f, u, v, r, s]) => addOrg((() => { const b = mito(0.15 * s, 0.062 * s); return b; })(), f, u, v, { rot: r, morph: 0.09, shadow: 0.42 * s, min: 0.52 }));

  // Golgi: nested curved cisternae (cis pale and convex towards the nucleus, trans warmer) with budding vesicles.
  const golgiStacks = [];
  const golgi = (face, u, v) => {
    const g = new THREE.Group(), n = 6;
    for (let i = 0; i < n; i++) {
      const r0 = 0.1 - i * 0.017, th = (1.0 - i * 0.045), t = 0.0062;
      const s = new THREE.Shape();
      s.absarc(0, 0, r0 + t, -th, th, false); s.absarc(0, 0, r0 - t, th, -th, true); s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.0045, bevelThickness: 0.006, bevelSegments: 3, curveSegments: 28 });
      geo.translate(0, 0, -0.012);
      const k = i / (n - 1), col = new THREE.Color(0xe6d3a6).lerp(new THREE.Color(0xc49a5c), k);
      g.add(new THREE.Mesh(geo, satin(col, { roughness: 0.42, clearcoat: 0.35 }, { color: 0xffe3a8, power: 2.4, strength: 0.4 })));
    }
    const vs = [];
    for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(sphereG, satin(0xf6e0a4, { roughness: 0.35 }, { color: 0xfff1c4, power: 2, strength: 0.5 })); m.userData = { ph: j / 4, ang: rr(-0.7, 0.7) }; g.add(m); vs.push(m); }
    const d = addOrg(g, face, u, v, { rot: Math.atan2(-v, -(u - 0.02)), spin: 0.03, amp: 0.012, morph: 0.03, shadow: 0.34, min: 0.6 });
    d.fixedRot = true; d.vs = vs; golgiStacks.push(d);
  };
  golgi('floor', 0.5, 0.62); golgi('wall', -0.42, 0.68);

  // Rough ER: pleated, stacked cisternae wrapping the nucleus, studded with ribosomes.
  const erM = satin(0xc9a48a, { roughness: 0.6, clearcoat: 0.08, side: THREE.DoubleSide }, { color: 0xf0d2bc, power: 2.2, strength: 0.35 });
  const riboM = new THREE.MeshStandardMaterial({ color: 0xc68a5a, roughness: 0.6, emissive: 0x3a1c08, emissiveIntensity: 0.3 });
  const riboG = new THREE.SphereGeometry(0.0048, 8, 6);
  const NCX = 0.02;
  const erGroups = [];
  const erBundle = (face, a0, a1, R, layers) => {
    const g = new THREE.Group(), pts = [];
    for (let L = 0; L < layers; L++) {
      const r0 = R + L * 0.034, amp = rr(0.012, 0.02), k = rr(5, 7), ph = rnd() * 6.28, H = rr(0.045, 0.06);
      const nS = Math.ceil((a1 - a0) * r0 / 0.009), nZ = 3, pos = [], idx = [];
      const at = (i, z) => { const f = i / nS, a = a0 + (a1 - a0) * f, r = r0 + amp * Math.sin(f * k * 6.283 + ph), tp = Math.pow(Math.sin(Math.PI * f), 0.45); return [NCX + Math.cos(a) * r, Math.sin(a) * r, -0.008 + z * H * tp, a, tp]; };
      for (let i = 0; i <= nS; i++) for (let j = 0; j <= nZ; j++) { const p = at(i, j / nZ); pos.push(p[0], p[1], p[2]); }
      for (let i = 0; i < nS; i++) for (let j = 0; j < nZ; j++) { const a = i * (nZ + 1) + j, b = a + nZ + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, erM));
      const cnt = Math.round(nS * 0.9);
      for (let q = 0; q < cnt; q++) {
        const p = at(rnd() * nS, rnd()), side = rnd() < 0.5 ? -1 : 1, rad = 0.0045 * side;
        pts.push([p[0] + Math.cos(p[3]) * rad, p[1] + Math.sin(p[3]) * rad, Math.max(-0.002, p[2]) + 0.002, rr(0.7, 1.25)]);
      }
    }
    const im = new THREE.InstancedMesh(riboG, riboM, pts.length), o = new THREE.Object3D();
    pts.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.scale.setScalar(p[3]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    g.add(im);
    const pivot = new THREE.Group(); pivot.position.set(NCX, 0, 0); g.position.set(-NCX, 0, 0); pivot.add(g);
    faceFrames[face].add(pivot); erGroups.push({ pivot, ph: rnd() * 6.28 });
  };
  erBundle('floor', 0.52 * Math.PI, 0.97 * Math.PI, 0.5, 3);
  erBundle('floor', 0.04 * Math.PI, 0.3 * Math.PI, 0.52, 3);
  erBundle('wall', 0.08 * Math.PI, 0.46 * Math.PI, 0.5, 3);
  erBundle('wall', 0.62 * Math.PI, 0.94 * Math.PI, 0.53, 3);

  // Vesicles, peroxisomes, lysosomes and a centriole pair.
  const vesM = [satin(0xc6e2dc, { transparent: true, opacity: 0.78, roughness: 0.3, clearcoat: 0.3 }, { color: 0xffffff, power: 2, strength: 0.6 }), satin(0xb9c9a0, { roughness: 0.45 }, { color: 0xe6f0d4, power: 2, strength: 0.4 })];
  [['floor', -0.25, 0.8], ['floor', 0.45, 0.78], ['wall', -0.72, 0.3], ['wall', 0.35, 0.68], ['floor', 0.8, 0.14], ['wall', 0.8, 0.62], ['floor', -0.76, 0.5], ['wall', -0.18, 0.5]].forEach(([f, u, v], i) => {
    const m = new THREE.Mesh(sphereG, vesM[i % 2]); m.scale.setScalar(rr(0.022, 0.044)); addOrg(m, f, u, v, { amp: 0.045, shadow: 0.12, morph: 0.12 });
  });
  const perox = satin(0xd2ad6c, { roughness: 0.5 }, { color: 0xffe2a0, power: 2, strength: 0.4 }), crystal = satin(0x4a2a14, { roughness: 0.7, clearcoat: 0 });
  [['floor', -0.74, 0.2], ['wall', 0.52, 0.14], ['floor', 0.36, 0.1], ['wall', -0.36, 0.3]].forEach(([f, u, v]) => {
    const g = new THREE.Group(); const a = new THREE.Mesh(sphereG, perox); a.scale.set(0.052, 0.046, 0.04); const b = new THREE.Mesh(sphereG, crystal); b.scale.set(0.02, 0.016, 0.012); b.position.z = 0.006; g.add(a, b);
    addOrg(g, f, u, v, { shadow: 0.16, morph: 0.08 });
  });
  const lyso = satin(0x5e2a44, { roughness: 0.45 }, { color: 0xc98aa6, power: 2, strength: 0.4 });
  [['floor', -0.1, 0.9], ['wall', -0.25, 0.85], ['wall', 0.75, 0.2], ['floor', 0.72, 0.52]].forEach(([f, u, v]) => {
    const m = new THREE.Mesh(sphereG, lyso); m.scale.set(0.045, 0.045, 0.04); addOrg(m, f, u, v, { shadow: 0.13, morph: 0.1 });
  });
  const cent = () => {
    const g = new THREE.Group(), m = satin(0xe7a05a, { roughness: 0.45 }, { color: 0xffd9a0, power: 2, strength: 0.4 }), tg = new THREE.CylinderGeometry(0.0075, 0.0075, 0.1, 8);
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, t = new THREE.Mesh(tg, m); t.rotation.z = Math.PI / 2; t.position.set(0, Math.cos(a) * 0.026, Math.sin(a) * 0.026 + 0.02); g.add(t); }
    const w = new THREE.Group(); w.add(g); return w;
  };
  addOrg(cent(), 'floor', 0.66, 0.78, { amp: 0.02, shadow: 0.14, rot: 0.2 });
  const cent2 = cent(); cent2.rotation.z = Math.PI / 2; addOrg(cent2, 'floor', 0.72, 0.7, { amp: 0.02, shadow: 0.12, rot: 1.6 });

  // Cytoplasmic streaming: free ribosomes in three sizes follow lanes around the nucleus, inner lanes faster.
  const RIBO = 420;
  const ribo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0048, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, emissive: 0x2a1806, emissiveIntensity: 0.2 }), RIBO);
  const palette = [0xd6a272, 0xc58a5c, 0xe4c294, 0xb47a52].map((c) => new THREE.Color(c));
  const riboData = Array.from({ length: RIBO }, (_, i) => { const r = 0.46 + Math.pow(rnd(), 0.8) * 0.46; ribo.setColorAt(i, palette[i % 4]); return { face: faceFor(i), r, a: rnd() * Math.PI, w: (0.1 / (0.6 + r)) * rr(0.6, 1.3) * (i % 7 ? 1 : -0.6), s: rr(0.5, 1.5), ph: rnd() * 6.28, lift: rr(0.003, 0.014) }; });
  ribo.instanceColor.needsUpdate = true;
  cell.add(ribo);

  // Atmosphere: a soft halo behind the cell, a contact shadow below, and a few drifting motes for parallax.
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(70,200,190,0.5)'); r.addColorStop(0.45, 'rgba(40,150,150,0.16)'); r.addColorStop(1, 'rgba(20,90,100,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.55 }));
  halo.position.set(0, 0, -2.4); scene.add(halo);
  const groundShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,.5)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, fog: false }));
  groundShadow.rotation.x = -Math.PI / 2; groundShadow.position.y = -1.12; scene.add(groundShadow);
  const MOTES = 110, motePos = new Float32Array(MOTES * 3), moteBase = [];
  for (let i = 0; i < MOTES; i++) { const a = rnd() * 6.283, b = Math.acos(rr(-1, 1)), r = rr(1.5, 3.6); moteBase.push({ x: Math.sin(b) * Math.cos(a) * r, y: Math.cos(b) * r * 0.8, z: Math.sin(b) * Math.sin(a) * r, ph: rnd() * 6.28, sp: rr(0.1, 0.3) }); }
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ size: 0.028, map: canvasTex(32, 32, (g) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); }), color: 0x9fe8dc, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  motes.frustumCulled = false; scene.add(motes);

  // ---------- post: restrained bloom, tone map, grade ----------
  let composer = null, bloom = null, grade = null;
  if (!lite) try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
      import('/web/vendor/three/addons/EffectComposer.js'), import('/web/vendor/three/addons/RenderPass.js'),
      import('/web/vendor/three/addons/UnrealBloomPass.js'), import('/web/vendor/three/addons/OutputPass.js'), import('/web/vendor/three/addons/ShaderPass.js'),
    ]);
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.55, 0.92);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, 1.08);
          c += vec3(-0.004, 0.006, 0.009) * (1.0 - smoothstep(0.0, 0.4, l));
          c *= mix(vec3(1.0), vec3(1.03, 1.0, 0.95), smoothstep(0.55, 1.0, l));
          c *= 1.0 - 0.3 * smoothstep(0.35, 0.95, length((vUv - 0.5) * vec2(1.0, 0.9)));
          c += (h(vUv * vec2(1731.0, 1137.0) + fract(time) * 91.0) - 0.5) * 0.016;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    composer.addPass(grade);
  } catch (e) { composer = null; }

  // ---------- frame ----------
  const tmp = new THREE.Object3D();
  const clampSpot = (u, v, min) => {
    const r = Math.hypot(u - 0.02, v), max = 0.86;
    if (r > max) { u = 0.02 + (u - 0.02) * max / r; v *= max / r; }
    if (r < min) { const k = min / Math.max(r, 1e-3); u = 0.02 + (u - 0.02) * k; v *= k; }
    return [u, Math.max(0.06, v)];
  };
  let t0 = performance.now(), progress = 0, px = 0, py = 0, W = 1, H = 1;
  const frameA = { cx: 0.7, cy: 0.5, r: 200, big: 900 };

  function frame(now) {
    const t = reduce ? 4 : (now - t0) / 1000;
    const breathe = 1 + Math.sin(t * 0.9) * 0.008;
    membrane.scale.setScalar(breathe);
    faces.scale.setScalar(breathe);
    nucleus.scale.setScalar(1 + Math.sin(t * 0.7 + 1) * 0.018);
    nucleolus.position.x = 0.02 + Math.sin(t * 0.5) * 0.02;
    // Cytoplasm slowly streams: two granule layers slide at different speeds.
    grainA.offset.set((t * 0.006) % 1, (t * 0.002) % 1); grainB.offset.set((-t * 0.011) % 1, (t * 0.004) % 1);

    for (const d of live) {
      let u = d.u + Math.sin(t * d.sp + d.ph) * d.amp, v = d.v + Math.cos(t * d.sp * 0.8 + d.ph) * d.amp;
      [u, v] = clampSpot(u, v, d.min);
      d.holder.position.set(u, v, 0.0);
      const s = Math.sin(t * d.sp * 1.3 + d.ph) * d.morph;
      d.body.scale.set(d.base.x * (1 + s), d.base.y * (1 - s * 0.6), d.base.z * (1 + s * 0.4));
      d.body.rotation.z = d.rot + (d.fixedRot ? 0 : Math.sin(t * 0.3 + d.ph) * d.spin * 3);
      if (d.sh) { d.sh.position.set(u + 0.012, v - 0.01, 0.0042); }
    }
    for (const gs of golgiStacks) for (const m of gs.vs) {
      const c = (t * 0.12 + m.userData.ph) % 1, e = sstep(0, 0.2, c) * (1 - sstep(0.8, 1, c));
      const x = -0.03 - c * 0.2, y = Math.sin(m.userData.ang) * (0.03 + c * 0.06);
      m.position.set(x, y, 0.012); m.scale.setScalar(0.0095 + 0.015 * e);
    }
    for (const e of erGroups) { e.pivot.rotation.z = Math.sin(t * 0.25 + e.ph) * 0.018; e.pivot.scale.setScalar(1 + Math.sin(t * 0.6 + e.ph) * 0.012); }

    for (let i = 0; i < RIBO; i++) {
      const r = riboData[i];
      let a = (r.a + t * r.w) % Math.PI; if (a < 0) a += Math.PI;
      const rad = r.r + Math.sin(t * 0.5 + r.ph) * 0.012;
      const u = NCXr + Math.cos(a) * rad, v = Math.max(0.02, Math.sin(a) * rad);
      tmp.position.set(u, r.face === 'floor' ? r.lift : v, r.face === 'floor' ? v : r.lift);
      tmp.scale.setScalar(r.s); tmp.updateMatrix(); ribo.setMatrixAt(i, tmp.matrix);
    }
    ribo.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < MOTES; i++) { const m = moteBase[i]; motePos[i * 3] = m.x + Math.sin(t * m.sp + m.ph) * 0.12; motePos[i * 3 + 1] = m.y + Math.cos(t * m.sp * 0.8 + m.ph) * 0.1; motePos[i * 3 + 2] = m.z; }
    moteGeo.attributes.position.needsUpdate = true;

    // Scroll: the camera dollies from the whole cell into the cutaway (copy is gone by p = 0.5).
    const z = reduce ? 0 : Math.min(1, Math.max(0, (progress - 0.5) / 0.5));
    const p = z * z * (3 - 2 * z);
    const cx = frameA.cx + (0.5 - frameA.cx) * p, cy = frameA.cy + (0.5 - frameA.cy) * p;
    const rpx = frameA.r + (frameA.big - frameA.r) * p;
    const dist = 1.04 * (H / 2) / (rpx * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    const az = 0.62 + p * 0.25 + px * 0.08, el = 0.5 - p * 0.1 + py * 0.05;
    const tx = 0.05 * p, ty = -0.02 + 0.1 * p, tz = 0.24 * p;
    camera.position.set(tx + Math.sin(az) * Math.cos(el) * dist, ty + Math.sin(el) * dist, tz + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(tx, ty, tz);
    camera.setViewOffset(W, H, (0.5 - cx) * W, (0.5 - cy) * H, W, H);
    scene.fog.near = dist - 0.5; scene.fog.far = dist + 2.6;
    halo.position.set(tx * 0.5, ty * 0.5, -2.4 + p * 1.2); halo.lookAt(camera.position);
    groundShadow.material.opacity = 1 - p;
    if (grade) grade.uniforms.time.value = t;
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  // Where the cell sits before the zoom: the free space beside (desktop) or above (phone) the copy.
  const copy = document.querySelector('.cell-copy');
  function resize() {
    W = slot.clientWidth; H = slot.clientHeight;
    if (!W || !H) return;
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); }
    paintBg(W, H);
    camera.aspect = W / H; camera.fov = 30;
    const box = slot.getBoundingClientRect(), c = copy.getBoundingClientRect();
    const note = document.querySelector('.redesign-note')?.getBoundingClientRect();
    const top = W < 700 && note ? Math.max(64, note.bottom - box.top + 10) : 64, gap = 24;
    if (W >= 700) {
      const x0 = c.right - box.left + gap, x1 = W - gap;
      frameA.cx = (x0 + x1) / 2 / W; frameA.cy = (top + H) / 2 / H;
      frameA.r = 0.47 * Math.min(x1 - x0, H - top);
    } else {
      const y1 = c.top - box.top - 12;
      frameA.cx = 0.5; frameA.cy = (top + y1) / 2 / H;
      frameA.r = 0.46 * Math.min(W, y1 - top);
    }
    frameA.big = 0.72 * Math.max(W, H);
    camera.updateProjectionMatrix();
    frame(performance.now());
  }
  document.fonts?.ready.then(resize);
  new ResizeObserver(resize).observe(slot);
  resize();
  window.__cellPerf = { frames: [], tier: 'full', pr: () => pr };

  const readProgress = () => {
    const v = parseFloat(getComputedStyle(act).getPropertyValue('--sc-p'));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
  };
  if (reduce) return;
  addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });
  let visible = true, raf = 0, last = 0, slow = 0, stage = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { last = 0; raf = requestAnimationFrame(loop); } }).observe(slot);
  // Adaptive quality: if frames run long, drop bloom first, then pixel ratio. Reported in __cellPerf.
  function adapt(dt) {
    const perf = window.__cellPerf; if (perf.frames.length < 600) perf.frames.push(dt);
    if (dt > 26) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 24 && stage < 3) {
      slow = 0; stage++;
      if (stage === 1 && bloom) bloom.enabled = false;
      else { pr = Math.max(1, pr - 0.5); resize(); }
      perf.tier = `degraded-${stage}`;
    }
  }
  function loop(now) {
    raf = 0;
    if (!visible) return;
    if (last) adapt(now - last);
    last = now;
    progress = readProgress();
    frame(now);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
}

if (slot && act) boot();
