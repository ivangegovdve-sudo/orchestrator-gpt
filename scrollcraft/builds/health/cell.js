// Health pool entrance: a living eukaryotic cell, drawn in code (three.js, vendored).
// A glossy sphere with its upper-front quarter cut away (y > 0 and z > 0 removed),
// cream cytoplasm on the two cut faces, and organelles that drift, morph and stream.
// Everything moves by explicit functions of time and scroll, so nothing is invented
// frame to frame. Reduced motion renders one still frame.
import * as THREE from '/web/vendor/three/three.module.min.js';

const slot = document.querySelector('[data-cell-slot]');
const act = document.querySelector('.cell-act');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function boot() {
  const canvas = document.createElement('canvas');
  canvas.className = 'cell-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    slot.classList.add('cell-slot--static');
    return;
  }
  slot.append(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the cream warm; ACES greyed it
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);

  // Soft studio reflections without an HDR file: a few bright panels baked through PMREM.
  {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Scene();
    room.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x1b3a33, side: THREE.BackSide })));
    const panel = (w, h, pos, intensity) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity) }));
      m.position.copy(pos); m.lookAt(0, 0, 0); room.add(m);
    };
    panel(5, 3, new THREE.Vector3(-3, 4, 3), 6);
    panel(3, 3, new THREE.Vector3(4, 2, 2), 2.5);
    panel(6, 2, new THREE.Vector3(0, -4, 1), 0.8);
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
  }
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x0d3b4f, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-2.5, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fe8ff, 1.2); rim.position.set(3, 1.5, -3); scene.add(rim);

  const cell = new THREE.Group();
  scene.add(cell);

  // Quarter cutaway: clip where y > c AND z > c.
  const cut = (c = 0) => [new THREE.Plane(new THREE.Vector3(0, -1, 0), c), new THREE.Plane(new THREE.Vector3(0, 0, -1), c)];

  // Exterior membrane texture: a blue body with darker irregular patches, as in the reference.
  const skin = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#5cc7f2'); grad.addColorStop(1, '#2b8fd0');
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) {
      const x = rnd() * 1024, y = 60 + rnd() * 392, r = 6 + rnd() * 16;
      g.fillStyle = `rgba(22,96,168,${0.55 + rnd() * 0.3})`;
      g.beginPath();
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, rr = r * (0.6 + rnd() * 0.7); g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();

  const membrane = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 96),
    new THREE.MeshPhysicalMaterial({ map: skin, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 0.4, sheenColor: new THREE.Color(0xbfefff), clippingPlanes: cut(), clipIntersection: true }),
  );
  cell.add(membrane);

  // Cut faces: cream cytoplasm with a lighter membrane rim, one half-disc per plane.
  const cream = new THREE.MeshPhysicalMaterial({ color: 0xf7ddb0, roughness: 0.6, clearcoat: 0.15, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const rimMat = new THREE.MeshPhysicalMaterial({ color: 0xfbf1e1, roughness: 0.4, side: THREE.DoubleSide });
  const faces = new THREE.Group();
  const floor = new THREE.Group(); floor.rotation.x = Math.PI / 2;   // XY half-disc (y>0) -> XZ half (z>0)
  const wall = new THREE.Group();                                   // XY half-disc (y>0), plane z = 0
  for (const g of [floor, wall]) {
    g.add(new THREE.Mesh(new THREE.CircleGeometry(0.955, 96, 0, Math.PI), cream));
    g.add(new THREE.Mesh(new THREE.RingGeometry(0.955, 1.0, 96, 1, 0, Math.PI), rimMat));
    faces.add(g);
  }
  cell.add(faces);

  // Helpers to place things on a cut face. Floor: (u, v) -> (u, 0, v). Wall: (u, v) -> (u, v, 0).
  const onFloor = (u, v, lift = 0) => new THREE.Vector3(u, lift, v);
  const onWall = (u, v, lift = 0) => new THREE.Vector3(u, v, lift);
  const glossy = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.2, ...extra });

  // Nucleus: magenta, with its own quarter cut a little proud of the faces, so it reads as a dome.
  const NC = 0.1;
  const nucleus = new THREE.Group(); nucleus.position.set(0.02, 0, 0);
  const nucShell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 96, 64), glossy(0xd8315f, { clippingPlanes: cut(NC), clipIntersection: true }));
  nucleus.add(nucShell);
  const nucInner = new THREE.MeshPhysicalMaterial({ color: 0xf08aa6, roughness: 0.45, side: THREE.DoubleSide });
  const segment = (R, c) => { // circle of radius R in a plane, keeping the part where the in-plane v > c
    const a0 = Math.asin(Math.min(1, c / R));
    const s = new THREE.Shape();
    const n = 64;
    for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI - 2 * a0) * (i / n); const p = [Math.cos(a) * R, Math.sin(a) * R]; i ? s.lineTo(...p) : s.moveTo(...p); }
    s.closePath(); return new THREE.ShapeGeometry(s, 32);
  };
  const Rn = Math.sqrt(0.4 * 0.4 - NC * NC);
  const nFloor = new THREE.Mesh(segment(Rn, NC), nucInner); nFloor.rotation.x = Math.PI / 2; nFloor.position.y = NC;
  const nWall = new THREE.Mesh(segment(Rn, NC), nucInner); nWall.position.z = NC;
  nucleus.add(nFloor, nWall);
  const nucleolus = new THREE.Mesh(new THREE.SphereGeometry(0.12, 48, 32), glossy(0x9d1e45, { emissive: 0x2a0512 }));
  nucleolus.position.set(0.02, NC, NC);
  nucleus.add(nucleolus);
  cell.add(nucleus);

  // Organelles live on the faces. Each carries a base spot, a drift phase and a morph phase.
  const live = [];
  const add = (mesh, face, u, v, opts = {}) => {
    mesh.userData = { face, u, v, ph: Math.random() * 6.28, sp: 0.35 + Math.random() * 0.4, amp: opts.amp ?? 0.035, spin: opts.spin ?? 0.12, morph: opts.morph ?? 0.08, lift: opts.lift ?? 0, base: mesh.scale.clone(), rot: opts.rot ?? Math.random() * 6.28 };
    cell.add(mesh); live.push(mesh);
  };
  const capsule = new THREE.CapsuleGeometry(0.05, 0.19, 8, 24);
  const green = glossy(0x3cae3f);
  for (const [f, u, v, r] of [['floor', -0.62, 0.42, 0.4], ['floor', 0.62, 0.3, 2.0], ['floor', 0.2, 0.74, 1.2], ['wall', -0.5, 0.62, 0.3], ['wall', 0.66, 0.4, 1.4], ['wall', 0.1, 0.8, 1.9]]) {
    const m = new THREE.Mesh(capsule, green); m.scale.set(1, 1, 0.8); add(m, f, u, v, { rot: r, morph: 0.1 });
  }
  // Golgi: stacked, flattened arcs in front of the nucleus.
  const golgiMat = glossy(0xc58b4c, { roughness: 0.4 });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Mesh(new THREE.TorusGeometry(0.1 + i * 0.035, 0.014, 8, 48, 2.4), golgiMat);
    add(g, 'floor', 0.05, 0.5, { rot: 0.3, spin: 0.05, amp: 0.012, morph: 0.05 });
  }
  // Rough ER: folded ribbons beside the nucleus.
  const erMat = glossy(0xa45a44, { roughness: 0.5 });
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i < 9; i++) pts.push(new THREE.Vector3((i % 2 ? 0.06 : -0.06) + k * 0.05, i * 0.045, 0)); // local XY; the floor rotation lays it flat
    const er = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.012, 8), erMat);
    add(er, 'floor', -0.42 + k * 0.02, 0.1, { rot: 0.9, spin: 0.03, amp: 0.01, morph: 0.06 });
  }
  // Vesicles and lysosomes: small green beads, tan lentils, dark crescents.
  const bead = new THREE.SphereGeometry(0.035, 24, 16);
  for (const [f, u, v] of [['floor', -0.25, 0.8], ['floor', 0.45, 0.62], ['wall', -0.72, 0.3], ['wall', 0.35, 0.68], ['floor', 0.78, 0.12]]) add(new THREE.Mesh(bead, glossy(0x7cc24a)), f, u, v, { amp: 0.05 });
  const lentil = new THREE.SphereGeometry(0.05, 24, 16);
  for (const [f, u, v] of [['floor', -0.75, 0.2], ['wall', 0.5, 0.12], ['floor', 0.36, 0.1]]) { const m = new THREE.Mesh(lentil, glossy(0xc9a468)); m.scale.set(1.3, 0.45, 0.9); add(m, f, u, v); }
  const crescent = new THREE.TorusGeometry(0.07, 0.014, 8, 32, Math.PI);
  for (const [f, u, v] of [['floor', -0.1, 0.9], ['wall', -0.25, 0.85], ['wall', 0.75, 0.2], ['floor', 0.7, 0.55]]) add(new THREE.Mesh(crescent, glossy(0x5b1e40)), f, u, v, { spin: 0.2 });
  // Centrioles: small ribbed barrels.
  const centMat = glossy(0xe39a4f, { roughness: 0.45 });
  for (const [u, v, r] of [[0.52, 0.8, 0.2], [0.62, 0.72, 1.6]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 9), centMat); add(m, 'floor', u, v, { rot: r, amp: 0.015 }); }

  // Ribosomes: tiny beads streaming around the nucleus on both faces.
  const RIBO = 180;
  const ribo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf0a73a, roughness: 0.5 }), RIBO);
  const riboData = Array.from({ length: RIBO }, (_, i) => ({ face: i % 2 ? 'floor' : 'wall', r: 0.46 + Math.random() * 0.46, a: Math.random() * Math.PI, w: (0.05 + Math.random() * 0.08) * (Math.random() < 0.5 ? 1 : -1), s: 0.55 + Math.random() * 0.9 }));
  cell.add(ribo);

  // Contact shadow under the cell.
  const shadow = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = -1.08; return m;
  })();
  scene.add(shadow);

  const tmp = new THREE.Object3D();
  const place = (obj, face, u, v, lift) => {
    const p = face === 'floor' ? onFloor(u, v, lift) : onWall(u, v, lift);
    obj.position.copy(p);
  };
  // Keep a drifting organelle inside its half-disc and outside the nucleus.
  const clampSpot = (u, v) => {
    const r = Math.hypot(u, v), max = 0.86, min = 0.47;
    if (r > max) { u *= max / r; v *= max / r; }
    if (r < min) { const k = min / Math.max(r, 1e-3); u *= k; v *= k; }
    return [u, Math.max(0.06, v)];
  };

  let t0 = performance.now(), progress = 0, px = 0, py = 0;
  function frame(now) {
    const t = reduce ? 4 : (now - t0) / 1000;
    const breathe = 1 + Math.sin(t * 0.9) * 0.008;
    membrane.scale.setScalar(breathe);
    faces.scale.setScalar(breathe);
    nucleus.scale.setScalar(1 + Math.sin(t * 0.7 + 1) * 0.018);
    nucleolus.position.x = 0.02 + Math.sin(t * 0.5) * 0.02;

    for (const m of live) {
      const d = m.userData;
      let u = d.u + Math.sin(t * d.sp + d.ph) * d.amp;
      let v = d.v + Math.cos(t * d.sp * 0.8 + d.ph) * d.amp;
      [u, v] = clampSpot(u, v);
      place(m, d.face, u, v, d.lift);
      // Morph: a slow squash and stretch around the organelle's own axes.
      const s = Math.sin(t * d.sp * 1.3 + d.ph) * d.morph;
      m.scale.set(d.base.x * (1 + s), d.base.y * (1 - s * 0.6), d.base.z * (1 + s * 0.4));
      const spin = d.rot + Math.sin(t * 0.3 + d.ph) * d.spin * 3;
      if (d.face === 'floor') m.rotation.set(Math.PI / 2, 0, spin); else m.rotation.set(0, 0, spin);
    }
    // Cytoplasmic streaming: ribosomes circle the nucleus, each on its own lane and speed.
    for (let i = 0; i < RIBO; i++) {
      const r = riboData[i];
      const a = (r.a + t * r.w) % Math.PI;
      const ang = a < 0 ? a + Math.PI : a;
      const u = Math.cos(ang) * r.r, v = Math.max(0.02, Math.sin(ang) * r.r);
      tmp.position.copy(r.face === 'floor' ? onFloor(u, v, 0.004) : onWall(u, v, 0.004));
      tmp.scale.setScalar(r.s);
      tmp.updateMatrix(); ribo.setMatrixAt(i, tmp.matrix);
    }
    ribo.instanceMatrix.needsUpdate = true;

    // Scroll: the camera dollies from the whole cell into the cutaway. Pointer adds a little parallax.
    // The copy has faded out by p = 0.5 (its cue), so the zoom only starts there:
    // the interior never passes under readable text.
    const z = reduce ? 0 : Math.min(1, Math.max(0, (progress - 0.5) / 0.5));
    const p = z * z * (3 - 2 * z);
    const cx = frameA.cx + (0.5 - frameA.cx) * p, cy = frameA.cy + (0.5 - frameA.cy) * p;
    const rpx = frameA.r + (frameA.big - frameA.r) * p;
    const dist = 1.04 * (H / 2) / (rpx * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    const az = 0.62 + p * 0.25 + px * 0.08;
    const el = 0.5 - p * 0.1 + py * 0.05;
    const tx = 0.05 * p, ty = -0.02 + 0.1 * p, tz = 0.24 * p;
    camera.position.set(tx + Math.sin(az) * Math.cos(el) * dist, ty + Math.sin(el) * dist, tz + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(tx, ty, tz);
    camera.setViewOffset(W, H, (0.5 - cx) * W, (0.5 - cy) * H, W, H);
    renderer.render(scene, camera);
  }

  // Where the cell sits before the zoom: the free space beside (desktop) or above (phone) the copy.
  let W = 1, H = 1;
  const frameA = { cx: 0.7, cy: 0.5, r: 200, big: 900 };
  const copy = document.querySelector('.cell-copy');
  function resize() {
    W = slot.clientWidth; H = slot.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = 30;
    const box = slot.getBoundingClientRect(), c = copy.getBoundingClientRect();
    // On phones the redesign notice sits top-right; start the cell's space below it.
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

  const readProgress = () => {
    const v = parseFloat(getComputedStyle(act).getPropertyValue('--sc-p'));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
  };
  if (reduce) return;
  addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });
  let visible = true, raf = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(slot);
  function loop(now) {
    raf = 0;
    if (!visible) return;
    progress = readProgress();
    frame(now);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
}

if (slot && act) boot();
