/*
 * SD Forest arrival scene (intro). WebGPURenderer (WebGPU, or its WebGL2
 * backend) + TSL, local Three.js runtime, real rock_09 glTF + forrest_ground_01
 * PBR maps + waternormals.
 *
 * SAME-STONE GATE. There is ONE InstancedMesh of the 2,400-triangle rock_09 LOD
 * with 28 instances ("IntroStones"). Every instance owns a rest transform (a
 * fallen block on the island), a scatter transform, an arced approach and a
 * gate target transform. The gate IS those 28 stones: 3 footing stones, 2 x 5
 * pillar stones, 15 radially oriented voussoirs (the middle one is the
 * keystone). There is no separate arch geometry in the scene (info.introArch is
 * 'not rendered').
 *
 * Every stone transform, glow value, dust puff, portal and water reveal is a
 * PURE function of the scalar p in [0,1] (plus constant seeded layout). The
 * per-instance SCALE VECTOR is constant over the whole timeline: a stone never
 * grows or shrinks, it only moves and turns. No physics, no morph targets.
 */
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import {
  assetURL, clamp, lerp, smooth01, easeOutCubic, makeRng, createRenderer, fitRenderer,
  loadTexture, tslFbm3, coldColorNode, setBodyData
} from '../shared/sdf-core.js';
import { loadGLTFLite } from '../shared/gltf-lite.js';
import { createGlowPipeline } from '../shared/glow-pipeline.js';
import { createWaterMesh } from '../shared/water-tsl.js';

// ---- tunables ----------------------------------------------------------
export const CAPTURE_SECONDS = 6.0;
const CFG = {
  fov: 36,
  eye: [0, 2.9, 12.6],
  look: [0, 1.7, 0],
  stoneCount: 28,
  rubbleCount: 12,
  seed: 0x5df0e57,
  gate: { rm: 1.8, springY: 2.5, footH: 0.5, pillarH: 0.46, voussoirs: 15, pillars: 5 },
  portal: { cx: 0, cy: 2.38, cz: -0.12, w: 2.9, h: 4.5 },
  portalLight: 9,
  waterY: -0.14,
  waterResolutionScale: 0.5
};
const FOG = 0x04080e;
const MOON_DIR = new THREE.Vector3(-0.42, 0.55, -0.72).normalize();

/** The frozen phase table (p ranges). Per-stone windows are staggered inside these. */
export const TIMELINE = Object.freeze([
  Object.freeze({ name: 'rest', start: 0.0, end: 0.08 }),
  Object.freeze({ name: 'detach-scatter', start: 0.08, end: 0.28 }),
  Object.freeze({ name: 'vortex', start: 0.25, end: 0.56 }),
  Object.freeze({ name: 'approach', start: 0.50, end: 0.82 }),
  Object.freeze({ name: 'settle', start: 0.58, end: 0.86 }),
  Object.freeze({ name: 'reveal', start: 0.84, end: 1.0 })
]);

/** Tuning hook for captures: ?exposure=1.4 (finite numbers only). */
function queryNumber(name, fallback) {
  try {
    const v = Number(new URLSearchParams(window.location.search).get(name));
    return Number.isFinite(v) && v > 0 && v < 8 ? v : fallback;
  } catch (_) { return fallback; }
}

function tslHelpers() {
  const need = ['uniform', 'uv', 'vec2', 'vec3', 'vec4', 'float', 'length', 'cos', 'sin', 'pow', 'mix', 'smoothstep', 'clamp', 'max', 'exp', 'dot', 'texture', 'abs'];
  const missing = need.filter((n) => TSL[n] === undefined);
  if (missing.length) throw new Error(`TSL missing: ${missing.join(', ')}`);
  return TSL;
}

// ---- deterministic ground relief + water carve --------------------------
const sstep = (a, b, x) => smooth01((x - a) / (b - a));

/**
 * Signed "water depth" field d(x,z): > 0 inside the moat. A front pond, two stream arms
 * that run back beside the island, and a closed rear so the gate stands on an island.
 */
function waterField(x, z) {
  const bankF = 2.05 + 0.5 * Math.sin(x * 0.5 + 0.8) + 0.28 * Math.sin(x * 1.3 + 2.1);
  const dFront = z - bankF;
  const ax = Math.abs(x);
  const armIn = 5.0 + 0.55 * Math.sin(z * 0.6 + 1.0 + (x < 0 ? 1.7 : 0)) + 0.25 * Math.sin(z * 1.4);
  const armOut = 8.6 + 0.8 * Math.sin(z * 0.45 + 2.0);
  const rear = -8.6 + 0.6 * Math.sin(x * 0.7);
  const dArm = Math.min(ax - armIn, armOut - ax, z - rear);
  return Math.max(dFront, dArm);
}

function groundHeight(x, z) {
  const r = Math.hypot(x * 0.85, z * 1.0);
  const flat = sstep(3.2, 11.0, r);
  const n = Math.sin(x * 0.31 + 1.7) * Math.cos(z * 0.27 - 0.4) * 0.22 + Math.sin(x * 0.83 + z * 0.61) * 0.07 + Math.sin(z * 0.19 - x * 0.11) * 0.3;
  const relief = 0.02 + n * flat + 0.05 * Math.sin(x * 2.1 + z * 1.7) * flat;
  const d = waterField(x, z);
  const w = sstep(-0.45, 0.55, d);
  return lerp(relief, -0.62, w);
}
const wetness = (x, z) => sstep(-1.6, 0.25, waterField(x, z));

// ---- rotation helpers ---------------------------------------------------
const _e = new THREE.Euler();
const quatEuler = (x, y, z) => new THREE.Quaternion().setFromEuler(_e.set(x, y, z));

// ---- stone layout --------------------------------------------------------
function buildLayout(rng, rock) {
  const N = CFG.stoneCount;
  const G = CFG.gate;
  const half = new THREE.Vector3(rock.size.x / 2, rock.size.y / 2, rock.size.z / 2);

  // 1) gate targets (role, position, quaternion, constant scale vector)
  const targets = [];
  const jq = (a) => quatEuler((rng() - 0.5) * a, (rng() - 0.5) * a, (rng() - 0.5) * a);
  const sj = (v, f = 0.05) => v * (1 + (rng() - 0.5) * 2 * f);
  // footing stones: the largest blocks, partly sunk into the ground under each pillar
  let footTop = 0;
  for (const side of [-1, 1]) {
    const sc = new THREE.Vector3(sj(14.5, 0.03), sj(16.5, 0.03), sj(10.2, 0.03));
    const hh = sc.y * rock.size.y * 0.5;
    const yy = hh * 0.6; // ~40% of the half-height below the ground line
    footTop += (yy + hh * 0.88) / 2;
    targets.push({ role: 'footing', pos: new THREE.Vector3(side * (G.rm + (rng() - 0.5) * 0.04), yy, (rng() - 0.5) * 0.06), quat: quatEuler(0, side < 0 ? 0 : Math.PI, 0).multiply(jq(0.05)), scale: sc, course: -1, side });
  }
  // threshold stone, long axis along the gate width, partly sunk
  {
    const sc = new THREE.Vector3(sj(9.0), sj(8.0), sj(9.0));
    targets.push({ role: 'threshold', pos: new THREE.Vector3(0.02, sc.y * rock.size.y * 0.5 - 0.17, 0.12), quat: quatEuler(0, Math.PI / 2, 0).multiply(jq(0.05)), scale: sc, course: -1, side: 0 });
  }
  // pillar stones: real stacking. Each course sits on the one below using its own scaled half-height
  // (effective half = 0.88 of the bbox half: the rock is irregular, so courses slightly interpenetrate).
  const EFF = 0.88;
  let springSum = 0;
  for (const side of [-1, 1]) {
    let top = footTop - 0.03;
    for (let c = 0; c < G.pillars; c += 1) {
      const sc = new THREE.Vector3(sj(10.5), sj(14.4), sj(8.4));
      const e = sc.y * rock.size.y * 0.5 * EFF;
      const yy = top + e;
      top = yy + e;
      targets.push({
        role: 'pillar', pos: new THREE.Vector3(side * (G.rm + (rng() - 0.5) * 0.05), yy, (rng() - 0.5) * 0.06),
        quat: quatEuler(0, ((c + (side > 0 ? 1 : 0)) % 2) * Math.PI, 0).multiply(jq(0.05)), scale: sc, course: c, side
      });
    }
    springSum += top;
  }
  G.springY = springSum / 2 - 0.03;
  // voussoirs: radial. rock X -> radial, rock Y (thin) -> tangential, rock Z (long) -> depth
  const nv = G.voussoirs;
  for (let k = 0; k < nv; k += 1) {
    const th = ((k + 0.5) * Math.PI) / nv;
    const key = k === (nv - 1) / 2;
    const sc = key ? new THREE.Vector3(sj(12.4, 0.03), sj(16.0, 0.03), sj(9.2, 0.03)) : new THREE.Vector3(sj(10.5), sj(14.0), sj(8.6));
    const rr = G.rm + (key ? 0.06 : 0);
    const m = Math.min(k, nv - 1 - k);
    targets.push({
      role: key ? 'keystone' : 'voussoir', pos: new THREE.Vector3(Math.cos(th) * rr, G.springY + Math.sin(th) * rr, (rng() - 0.5) * 0.07),
      quat: quatEuler(0, 0, th).multiply(jq(0.08)), scale: sc, course: m, side: k < (nv - 1) / 2 ? 1 : (key ? 0 : -1), k
    });
  }
  if (targets.length !== N) throw new Error(`gate layout has ${targets.length} targets, expected ${N}`);

  // masonry landing times: footings, pillar courses upward, voussoirs from both springers to the crown, keystone last
  for (const t of targets) {
    const lr = (rng() - 0.5) * 0.006;
    if (t.role === 'footing') t.land = 0.60 + (t.side > 0 ? 0.012 : 0) + lr;
    else if (t.role === 'threshold') t.land = 0.625 + lr;
    else if (t.role === 'pillar') t.land = 0.645 + t.course * 0.026 + (t.side > 0 ? 0.005 : 0) + lr;
    else if (t.role === 'voussoir') t.land = 0.758 + t.course * 0.0125 + (t.side > 0 ? 0.003 : 0) + lr;
    else t.land = 0.846;
  }

  // 2) rest placements: fallen blocks on the island, block-sized (same scale as the gate stones)
  const rest = [];
  const clearOfGate = (x, z) => !(Math.abs(x) < 2.5 && z > -0.95 && z < 1.05);
  const zones = [
    { n: 9, gen: () => [(rng() < 0.5 ? -1 : 1) * (2.4 + rng() * 2.1), -2.0 + rng() * 3.8] },     // flanks beside the gate
    { n: 11, gen: () => [(rng() - 0.5) * 8.6, -1.5 - rng() * 4.0] },                              // rear of the island
    { n: 8, gen: () => [(rng() - 0.5) * 8.4, 1.0 + rng() * 1.3] }                                 // near bank
  ];
  for (const zn of zones) {
    let placed = 0; let guard = 0;
    while (placed < zn.n && guard < 4000 && rest.length < N) {
      guard += 1;
      const [x, z] = zn.gen();
      if (!clearOfGate(x, z)) continue;
      if (waterField(x, z) > -0.35) continue;
      if (rest.some((r) => Math.hypot(r.x - x, r.z - z) < 1.05)) continue;
      rest.push({ x, z }); placed += 1;
    }
  }
  { let guard = 0;
    while (rest.length < N && guard < 8000) {
      guard += 1;
      const x = (rng() - 0.5) * 9.4; const z = -1.6 - rng() * 6.4;
      if (!clearOfGate(x, z) || waterField(x, z) > -0.35) continue;
      if (rest.some((r) => Math.hypot(r.x - x, r.z - z) < 0.9)) continue;
      rest.push({ x, z });
    } }
  if (rest.length < N) throw new Error('rest layout could not place all stones');

  // 3) assign stones to targets: nearest-ish stone first, in landing order (far stones land last)
  const order = targets.map((t, i) => i).sort((a, b) => targets[a].land - targets[b].land);
  const free = rest.map((r, i) => i);
  const assign = new Array(N);
  for (const ti of order) {
    const t = targets[ti];
    free.sort((a, b) => Math.hypot(rest[a].x - t.pos.x, rest[a].z - t.pos.z) - Math.hypot(rest[b].x - t.pos.x, rest[b].z - t.pos.z));
    const pick = Math.min(free.length - 1, Math.floor(rng() * Math.min(3, free.length)));
    assign[ti] = free.splice(pick, 1)[0];
  }

  const L = {
    N, springY: G.springY,
    role: new Array(N), side: new Int8Array(N), land: new Float32Array(N), seat: new Float32Array(N),
    scale: new Float32Array(N * 3),
    restPos: new Float32Array(N * 3), restQuat: new Float32Array(N * 4), restBase: new Float32Array(N * 3),
    scPos: new Float32Array(N * 3), scQuat: new Float32Array(N * 4),
    vortexPos: new Float32Array(N * 3), vortexQuat: new Float32Array(N * 4),
    hoverPos: new Float32Array(N * 3), hoverQuat: new Float32Array(N * 4),
    ctrl: new Float32Array(N * 3),
    tgtPos: new Float32Array(N * 3), tgtQuat: new Float32Array(N * 4),
    spinAxis: new Float32Array(N * 3), spinA: new Float32Array(N), spinB: new Float32Array(N),
    s0: new Float32Array(N), s1: new Float32Array(N), v0: new Float32Array(N), v1: new Float32Array(N), a0: new Float32Array(N), a1: new Float32Array(N),
    phase: new Float32Array(N), seam: new Float32Array(N), dustBase: new Float32Array(N * 3), halfY: new Float32Array(N),
    restYaw: new Float32Array(N)
  };
  const v = new THREE.Vector3(); const q = new THREE.Quaternion(); const m4 = new THREE.Matrix4(); const sv = new THREE.Vector3();
  for (let ti = 0; ti < N; ti += 1) {
    const t = targets[ti];
    const i = ti; // instance index = target index; the stone's REST spot comes from the assignment
    L.role[i] = t.role; L.side[i] = t.side; L.land[i] = t.land;
    L.scale.set([t.scale.x, t.scale.y, t.scale.z], i * 3);
    L.tgtPos.set([t.pos.x, t.pos.y, t.pos.z], i * 3);
    L.tgtQuat.set([t.quat.x, t.quat.y, t.quat.z, t.quat.w], i * 4);

    // rest orientation: lying blocks, some canted onto an edge; centre set so the rotated box sits on the ground
    const r = rest[assign[ti]];
    const yaw = rng() * Math.PI * 2;
    const canted = rng() < 0.28;
    const tiltA = canted ? (rng() < 0.5 ? -1 : 1) * (0.28 + rng() * 0.4) : (rng() - 0.5) * 0.16;
    const tiltB = (rng() - 0.5) * (canted ? 0.5 : 0.16);
    const rq = quatEuler(tiltB, yaw, tiltA);
    m4.makeRotationFromQuaternion(rq);
    const e = m4.elements; // column-major: row 1 (world y) = e[1], e[5], e[9]
    const hs = [half.x * t.scale.x, half.y * t.scale.y, half.z * t.scale.z];
    const halfH = Math.abs(e[1]) * hs[0] + Math.abs(e[5]) * hs[1] + Math.abs(e[9]) * hs[2];
    const gy = groundHeight(r.x, r.z);
    L.restPos.set([r.x, gy + halfH * 0.86, r.z], i * 3);
    L.restQuat.set([rq.x, rq.y, rq.z, rq.w], i * 4);
    L.restBase.set([r.x, gy + 0.035, r.z], i * 3);
    L.restYaw[i] = yaw;
    L.halfY[i] = hs[1];

    // scatter: outward and up, loosely tumbled
    const cx = 0; const cz = 0;
    const ox = r.x - cx; const oz = r.z - cz; const ol = Math.hypot(ox, oz) || 1;
    const out = 0.5 + rng() * 1.1;
    const sx = r.x + (ox / ol) * out + (rng() - 0.5) * 0.8;
    const sz = r.z + (oz / ol) * out * 0.7 + (rng() - 0.5) * 0.8;
    const sy = 1.7 + rng() * 2.4 + Math.max(0, gy);
    L.scPos.set([sx, sy, sz], i * 3);
    q.setFromEuler(_e.set((rng() - 0.5) * 2.4, rng() * 6.28, (rng() - 0.5) * 2.4));
    L.scQuat.set([q.x, q.y, q.z, q.w], i * 4);

    // Vortex pose: a vertical, slightly irregular ring around the portal. This is
    // the scrubbable circular gate formation between the fallen field and the
    // approved arch targets. Depth variation keeps it from reading as a flat UI ring.
    const vortexAngle = (i / N) * Math.PI * 2 + (rng() - 0.5) * 0.12;
    const vortexRadius = 2.05 + rng() * 0.22;
    const vortexDepth = Math.sin(vortexAngle * 2.0 + rng() * 2.0) * 0.16;
    const vx = CFG.portal.cx + Math.cos(vortexAngle) * vortexRadius;
    const vy = CFG.portal.cy + Math.sin(vortexAngle) * vortexRadius * 0.9;
    const vz = CFG.portal.cz - 0.48 + vortexDepth;
    L.vortexPos.set([vx, vy, vz], i * 3);
    q.setFromEuler(_e.set((rng() - 0.5) * 0.26, (rng() - 0.5) * 0.22, vortexAngle + Math.PI / 2));
    L.vortexQuat.set([q.x, q.y, q.z, q.w], i * 4);

    // hover pose just above + slightly outside the target, slightly canted: the final move is a seat
    const hoverH = 0.34 + rng() * 0.1;
    const outSign = t.pos.x === 0 ? 0 : Math.sign(t.pos.x);
    const hx = t.pos.x + outSign * (0.08 + rng() * 0.06);
    const hy = t.pos.y + hoverH;
    const hz = t.pos.z + 0.1 + rng() * 0.12;
    L.hoverPos.set([hx, hy, hz], i * 3);
    q.copy(t.quat).multiply(quatEuler((rng() - 0.5) * 0.28, (rng() - 0.5) * 0.28, (rng() - 0.5) * 0.28));
    L.hoverQuat.set([q.x, q.y, q.z, q.w], i * 4);

    // quadratic Bézier control: the vortex-to-hover leg arcs high above and outside the gate
    const mx = (vx + hx) * 0.5; const my = (vy + hy) * 0.5; const mz = (vz + hz) * 0.5;
    v.set(mx + (outSign || (rng() - 0.5)) * (0.6 + rng() * 0.9), Math.max(my, hy) + 1.0 + rng() * 1.6, mz + 0.6 + rng() * 1.0);
    L.ctrl.set([v.x, v.y, v.z], i * 3);

    v.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
    L.spinAxis.set([v.x, v.y, v.z], i * 3);
    L.spinA[i] = (rng() < 0.5 ? -1 : 1) * (0.9 + rng() * 1.4);
    L.spinB[i] = (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 1.0);

    // per-stone windows (p)
    // Give the final seat a readable scroll window. The old 0.04 range made the
    // last move look like a snap even though the pose was technically continuous.
    const seatDur = 0.10;
    L.seat[i] = seatDur;
    L.s0[i] = 0.08 + rng() * 0.05;
    L.s1[i] = L.s0[i] + 0.15 + rng() * 0.02;           // <= 0.30
    L.v0[i] = 0.24 + rng() * 0.03;
    L.v1[i] = L.v0[i] + 0.12 + rng() * 0.02;
    L.a1[i] = t.land - seatDur;
    const dur = 0.24 + rng() * 0.07;
    // Hold the circular gate long enough to read as a formation before any
    // stone begins the final arch approach. This keeps the scroll stage
    // scrubbable in both directions instead of visually blending the ring
    // into the approved target too early.
    // The approach hands off to a hover before the longer seat window begins.
    // Keep the handoff inside the authored approach phase so every stone has
    // room to flow into its target instead of jumping at the boundary.
    L.a0[i] = Math.max(0.50, L.v1[i] + 0.012, L.a1[i] - dur);
    L.phase[i] = rng() * Math.PI * 2;
    L.seam[i] = rng();
    // dust contact point: bottom of the stone at its target
    L.dustBase.set([t.pos.x, t.role === 'pillar' || t.role === 'footing' || t.role === 'threshold' ? t.pos.y - hs[1] * 0.9 : t.pos.y - 0.05, t.pos.z + 0.35], i * 3);
  }
  void sv;
  return L;
}

// ---- main ----------------------------------------------------------------
export async function createIntroScene({ canvas, reduced = false, capture = false }) {
  tslHelpers();
  const failures = [];
  const { renderer, backend } = await createRenderer(canvas, {
    toneMapping: THREE.ACESFilmicToneMapping, exposure: queryNumber('exposure', 1.0), clearColor: FOG
  });
  setBodyData('renderer', backend);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.FogExp2(FOG, 0.034);

  const camera = new THREE.PerspectiveCamera(CFG.fov, 1, 0.1, 160);
  camera.position.set(...CFG.eye);
  camera.lookAt(...CFG.look);
  const lookTarget = new THREE.Vector3(...CFG.look);

  // --- assets (each failure degrades, none blanks the page) ---
  const aniso = (() => { try { return Math.min(8, renderer.getMaxAnisotropy()); } catch (_) { return 4; } })();
  const [rockResult, groundDiff, groundNor, groundRough, waterNormals] = await Promise.all([
    loadGLTFLite(assetURL('models/rock_09/rock_09_lod1.gltf'), { maxAnisotropy: aniso, failures }).catch((err) => { failures.push(`rock_09 glTF: ${err.message}`); return null; }),
    loadTexture(renderer, assetURL('textures/forrest_ground_01_diff_2k.jpg'), { srgb: true }, failures),
    loadTexture(renderer, assetURL('textures/forrest_ground_01_nor_gl_2k.jpg'), {}, failures),
    loadTexture(renderer, assetURL('textures/forrest_ground_01_rough_2k.jpg'), {}, failures),
    loadTexture(renderer, assetURL('textures/waternormals.jpg'), { anisotropy: 4 }, failures)
  ]);

  // rock geometry: re-centre so stones turn about their middle
  let rockGeo; let rockSource = 'rock_09 glTF';
  if (rockResult) {
    rockGeo = rockResult.geometry.clone();
    const bb = rockResult.boundingBox;
    const c = bb.getCenter(new THREE.Vector3());
    rockGeo.translate(-c.x, -c.y, -c.z);
    rockGeo.computeBoundingBox(); rockGeo.computeBoundingSphere();
  } else {
    rockSource = 'procedural fallback (rock_09 failed to load)';
    rockGeo = new THREE.BoxGeometry(0.074, 0.032, 0.145, 2, 1, 3);
    rockGeo.computeBoundingBox(); rockGeo.computeBoundingSphere();
  }
  const rockSize = new THREE.Vector3(); rockGeo.boundingBox.getSize(rockSize);
  const rock = { halfHeight: rockSize.y / 2, size: rockSize };
  const rockTris = rockGeo.index ? rockGeo.index.count / 3 : rockGeo.attributes.position.count / 3;
  const rockMap = rockResult && rockResult.textures.map;

  // --- lights: one coherent cool moon (back-left, high), a dim sky fill from the camera side, cool hemisphere ---
  scene.add(new THREE.HemisphereLight(0x8fa6c4, 0x0a120f, 1.5));
  const moon = new THREE.DirectionalLight(0xbdd0ee, 4.2);
  moon.position.copy(MOON_DIR).multiplyScalar(30); moon.target.position.set(0, 1.5, 0);
  scene.add(moon, moon.target);
  const fill = new THREE.DirectionalLight(0x93a6c2, 3.6);
  fill.position.set(-5, 6.5, 14); fill.target.position.set(0, 1.8, 0);
  scene.add(fill, fill.target);
  const portalLight = new THREE.PointLight(0x6f90f0, 0, 9, 2);
  portalLight.position.set(CFG.portal.cx, CFG.portal.cy, CFG.portal.cz + 0.85);
  scene.add(portalLight);

  const TS = TSL;
  const uTime = TS.uniform(0.0);

  // --- ground (graded grid: fine near the gate, coarse far away) with the moat carved into it ---
  const GN = 100; const GEXT = 42; const GPOW = 1.8;
  const groundGeo = new THREE.BufferGeometry();
  {
    const pos = new Float32Array((GN + 1) * (GN + 1) * 3);
    const uvs = new Float32Array((GN + 1) * (GN + 1) * 2);
    const col = new Float32Array((GN + 1) * (GN + 1) * 3);
    const wet = new Float32Array((GN + 1) * (GN + 1));
    const idx = new Uint32Array(GN * GN * 6);
    const wp = (u) => Math.sign(u) * Math.pow(Math.abs(u), GPOW) * GEXT;
    for (let j = 0; j <= GN; j += 1) {
      for (let i = 0; i <= GN; i += 1) {
        const k = j * (GN + 1) + i;
        const x = wp((i / GN) * 2 - 1); const z = wp((j / GN) * 2 - 1);
        pos[k * 3] = x; pos[k * 3 + 1] = groundHeight(x, z); pos[k * 3 + 2] = z;
        uvs[k * 2] = x / 3.4; uvs[k * 2 + 1] = z / 3.4;
        const w = wetness(x, z);
        wet[k] = w;
        const shade = lerp(1.0, 0.42, w);
        const mv = 0.5 + 0.5 * Math.sin(x * 0.7 + 1.3) * Math.cos(z * 0.55 - 0.4) + 0.25 * Math.sin(x * 2.3 + z * 1.9); // moss / bare-soil patches
        const moss = clamp(mv, 0, 1);
        col[k * 3] = shade * lerp(1.05, 0.7, moss); col[k * 3 + 1] = shade * lerp(0.95, 1.15, moss); col[k * 3 + 2] = shade * lerp(0.95, 0.8, moss) * lerp(1.0, 1.06, w);
      }
    }
    let t = 0;
    for (let j = 0; j < GN; j += 1) {
      for (let i = 0; i < GN; i += 1) {
        const a = j * (GN + 1) + i; const b = a + 1; const c = a + GN + 1; const d = c + 1;
        idx[t++] = a; idx[t++] = c; idx[t++] = b; idx[t++] = b; idx[t++] = c; idx[t++] = d;
      }
    }
    groundGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    groundGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    groundGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    groundGeo.setAttribute('aWet', new THREE.BufferAttribute(wet, 1));
    groundGeo.setIndex(new THREE.BufferAttribute(idx, 1));
    groundGeo.computeVertexNormals();
    groundGeo.computeBoundingSphere();
  }
  const groundMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0, vertexColors: true });
  if (groundDiff) groundMat.colorNode = coldColorNode(groundDiff, { tint: [0.62, 0.62, 0.46], saturation: 0.8, gain: 0.3 });
  else groundMat.color = new THREE.Color(0x10161a);
  if (groundNor) { groundMat.normalMap = groundNor; groundMat.normalScale = new THREE.Vector2(1.3, 1.3); }
  if (groundRough && typeof TS.attribute === 'function') {
    // damp ground: lower roughness toward the water
    const wetAttr = TS.attribute('aWet', 'float');
    groundMat.roughnessNode = TS.texture(groundRough).g.mul(TS.float(1.0).sub(wetAttr.mul(0.3))).mul(0.98);
  } else if (groundRough) groundMat.roughnessMap = groundRough;
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'IntroGround';
  scene.add(ground);
  const groundTris = groundGeo.index.count / 3;

  // --- water: shallow dark moat, TSL Water.js port with a planar reflector ---
  let water = null;
  let waterMode = 'flat';
  const waterNotes = [];
  {
    const wGeo = new THREE.PlaneGeometry(96, 56, 1, 1);
    wGeo.translate(0, -12, 0); // after the -PI/2 X rotation: z in [-16, 40]
    if (waterNormals) {
      water = createWaterMesh(wGeo, {
        waterNormals, size: 3.2, alpha: 1, sunDirection: MOON_DIR, sunColor: 0x46566c, waterColor: 0x0b1c24, skyTint: 0x16222c,
        distortionScale: 0.3, resolutionScale: CFG.waterResolutionScale, reflectionGain: 3.4, fog: true
      });
      water.mesh.position.y = CFG.waterY;
      scene.add(water.mesh);
      waterMode = water.reflectionMode;
      waterNotes.push(...water.notes);
    } else {
      failures.push('waternormals.jpg missing: moat drawn as flat colour');
      const flat = new THREE.Mesh(wGeo, new THREE.MeshBasicMaterial({ color: 0x0b1a22 }));
      flat.rotation.x = -Math.PI / 2; flat.position.y = CFG.waterY;
      scene.add(flat);
    }
  }
  setBodyData('water-reflection', waterMode);

  // --- stone field: ONE InstancedMesh, 28 instances of the rock_09 LOD ---
  const rng = makeRng(CFG.seed);
  const L = buildLayout(rng, rock);
  const N = L.N;
  const stoneGeo = rockGeo.clone();
  const seamAttr = new THREE.InstancedBufferAttribute(L.seam, 1);
  const glowArr = new Float32Array(N);
  const glowAttr = new THREE.InstancedBufferAttribute(glowArr, 1);
  glowAttr.setUsage(THREE.DynamicDrawUsage);
  stoneGeo.setAttribute('aSeam', seamAttr);
  stoneGeo.setAttribute('aGlow', glowAttr);

  const instNode = (attr, name) => (typeof TS.instancedBufferAttribute === 'function' ? TS.instancedBufferAttribute(attr)
    : (typeof TS.attribute === 'function' ? TS.attribute(name, 'float') : null));
  const seamNode = instNode(seamAttr, 'aSeam');
  const glowNode = instNode(glowAttr, 'aGlow');

  // Real rock_09 maps, lit MeshStandardNodeMaterial, FrontSide (the LOD is closed + manifold), metalness 0, no tinting colorNode.
  const stoneMat = new THREE.MeshStandardNodeMaterial({ roughness: 1.0, metalness: 0 });
  stoneMat.side = THREE.FrontSide;
  if (rockMap) stoneMat.map = rockMap; else stoneMat.color = new THREE.Color(0x4a4a46);
  if (rockResult) {
    if (rockResult.textures.normalMap) { stoneMat.normalMap = rockResult.textures.normalMap; stoneMat.normalScale = new THREE.Vector2(1.2, 1.2); }
    if (rockResult.textures.roughnessMap) stoneMat.roughnessMap = rockResult.textures.roughnessMap;
  }
  {
    // Cold emissive seams, driven ONLY by the per-instance aGlow (0 at rest). Crevice texels + a faint rim.
    const seam = seamNode || TS.float(0.5);
    const gl = glowNode || TS.float(0.0);
    const viewDir = TS.positionViewDirection || (TS.positionView ? TS.normalize(TS.positionView.negate()) : null);
    const colA = TS.uniform(new THREE.Color(0x66b4ff));
    const colB = TS.uniform(new THREE.Color(0x7fa0ff));
    const lum = rockMap ? TS.dot(TS.texture(rockMap).rgb, TS.vec3(0.299, 0.587, 0.114)) : TS.float(0.2);
    const crack = TS.float(1.0).sub(TS.smoothstep(0.014, 0.027, lum));
    const rim = (viewDir && TS.normalView) ? TS.pow(TS.float(1.0).sub(TS.clamp(TS.dot(TS.normalView, viewDir), 0.0, 1.0)), 3.0) : TS.float(0.0);
    const mask = crack.mul(1.0).add(rim.mul(0.3));
    stoneMat.emissiveNode = TS.mix(colA, colB, seam).mul(mask).mul(gl).mul(1.6);
  }
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, N);
  stones.name = 'IntroStones';
  stones.frustumCulled = false;
  stones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(stones);

  // One raycast on pointer movement identifies the hovered instance. The
  // 28-entry hover buffer is then eased in the render loop, so the material
  // and existing bloom pipeline get a smooth lift/fade without per-frame
  // raycasting or a second stone mesh.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // --- static grounded rubble (set dressing only; never part of the gate) ---
  const rubbleMat = new THREE.MeshStandardNodeMaterial({ roughness: 1.0, metalness: 0 });
  rubbleMat.side = THREE.FrontSide;
  if (rockMap) rubbleMat.map = rockMap; else rubbleMat.color = new THREE.Color(0x3c3c3a);
  if (rockResult) {
    if (rockResult.textures.normalMap) rubbleMat.normalMap = rockResult.textures.normalMap;
    if (rockResult.textures.roughnessMap) rubbleMat.roughnessMap = rockResult.textures.roughnessMap;
  }
  const rubble = new THREE.InstancedMesh(rockGeo, rubbleMat, CFG.rubbleCount);
  rubble.name = 'IntroRubble';
  {
    const rr = makeRng(CFG.seed ^ 0x77);
    const m = new THREE.Matrix4(); const vp = new THREE.Vector3(); const vs = new THREE.Vector3();
    const spots = [[-6.1, -3.2, 6], [6.0, -2.4, 8], [-5.6, 1.0, 5], [5.7, 1.3, 5], [-3.4, -7.2, 7], [3.9, -7.0, 6],
      [-7.6, -4.2, 4], [7.2, -5.0, 4.5], [-1.2, 2.6, 3.5], [2.6, 2.7, 3.2], [-2.2, -6.0, 4], [1.2, -8.0, 7]];
    for (let i = 0; i < CFG.rubbleCount; i += 1) {
      const [x, z, s] = spots[i];
      const qq = quatEuler((rr() - 0.5) * 0.4, rr() * 6.28, (rr() - 0.5) * 0.4);
      vs.set(s * (0.9 + rr() * 0.3), s * (0.9 + rr() * 0.3), s * (0.9 + rr() * 0.3));
      vp.set(x, groundHeight(x, z) + rock.halfHeight * vs.y * 0.55, z);
      m.compose(vp, qq, vs); rubble.setMatrixAt(i, m);
    }
    rubble.instanceMatrix.needsUpdate = true;
    rubble.frustumCulled = false;
  }
  scene.add(rubble);

  // --- low procedural vegetation: lit blade tufts + fern fronds, dark green-grey (no textures) ---
  const vegRng = makeRng(CFG.seed ^ 0x6e6e);
  const restSpots = Array.from({ length: N }, (_, i) => [L.restBase[i * 3], L.restBase[i * 3 + 2]]);
  const tuftPlacements = [];
  const fernPlacements = [];
  {
    let tries = 0;
    while ((tuftPlacements.length < 260 || fernPlacements.length < 34) && tries < 20000) {
      tries += 1;
      const x = (vegRng() - 0.5) * 38; const z = -22 + vegRng() * 30;
      const gy = groundHeight(x, z);
      if (gy < CFG.waterY + 0.1) continue;
      if (Math.abs(x) < 2.7 && z > -1.3 && z < 1.4) continue;
      if (restSpots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 0.75)) continue;
      const near = Math.hypot(x, z) < 14;
      if (!near && vegRng() < 0.55) continue;
      const wet = wetness(x, z);
      if (vegRng() < 0.2 && fernPlacements.length < 34) fernPlacements.push([x, gy, z, 0.7 + vegRng() * 0.7, vegRng() * 6.28]);
      else if (tuftPlacements.length < 260) tuftPlacements.push([x, gy - 0.01, z, (0.6 + vegRng() * 0.9) * (1.0 + wet * 0.5), vegRng() * 6.28]);
    }
  }
  const bladeGeo = (() => {
    const pos = []; const col = []; const idx = [];
    const r = makeRng(CFG.seed ^ 0xb1ade);
    const blades = 5;
    for (let b = 0; b < blades; b += 1) {
      const a = r() * Math.PI * 2; const dist = r() * 0.07; const h = 0.14 + r() * 0.2; const w = 0.012 + r() * 0.01; const lean = 0.05 + r() * 0.14;
      const dx = Math.cos(a); const dz = Math.sin(a); const px = -dz; const pz = dx;
      const segs = 2; const base = pos.length / 3;
      for (let s = 0; s <= segs; s += 1) {
        const t = s / segs; const ww = w * (1 - t * 0.92);
        const bx = dx * dist + dx * lean * t * t * h * 2; const bz = dz * dist + dz * lean * t * t * h * 2;
        pos.push(bx - px * ww, h * t, bz - pz * ww, bx + px * ww, h * t, bz + pz * ww);
        const g = lerp(0.35, 1.0, t);
        col.push(0.05 * g, 0.085 * g, 0.07 * g, 0.05 * g, 0.085 * g, 0.07 * g);
      }
      for (let s = 0; s < segs; s += 1) {
        const o = base + s * 2;
        idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();
  const frondGeo = (() => {
    const pos = []; const col = []; const idx = [];
    const fronds = 5; const r = makeRng(CFG.seed ^ 0xfe12);
    for (let f = 0; f < fronds; f += 1) {
      const a = (f / fronds) * Math.PI * 2 + r() * 0.5; const L0 = 0.38 + r() * 0.2; const rise = 0.5 + r() * 0.25;
      const dx = Math.cos(a); const dz = Math.sin(a); const px = -dz; const pz = dx;
      const leaflets = 7;
      const spine = (t) => [dx * L0 * t, 0.06 + Math.sin(t * Math.PI * 0.62) * L0 * rise * 0.9, dz * L0 * t];
      const base = pos.length / 3;
      pos.push(...spine(0)); col.push(0.04, 0.07, 0.06);
      for (let l = 1; l <= leaflets; l += 1) {
        const t = l / leaflets; const s = spine(t); const wlen = 0.11 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.025;
        const droop = 0.04 * t;
        const k = pos.length / 3;
        pos.push(...s);
        pos.push(s[0] + px * wlen + dx * 0.03, s[1] - droop, s[2] + pz * wlen + dz * 0.03);
        pos.push(s[0] - px * wlen + dx * 0.03, s[1] - droop, s[2] - pz * wlen + dz * 0.03);
        col.push(0.05, 0.09, 0.07, 0.07, 0.115, 0.09, 0.07, 0.115, 0.09);
        // leaflet triangle (centre of spine -> side tips) + stem link
        idx.push(k, k + 1, k + 2);
        const prev = l === 1 ? base : k - 3;
        idx.push(prev, k, k + 1);
        idx.push(prev, k + 2, k);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();
  const vegMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.8, metalness: 0, vertexColors: true, side: THREE.DoubleSide });
  if (typeof TS.instanceIndex !== 'undefined' && TS.positionLocal) {
    const sway = TS.sin(uTime.mul(1.1).add(TS.float(TS.instanceIndex).mul(1.7))).mul(0.035).mul(TS.positionLocal.y.mul(2.2));
    vegMat.positionNode = TS.positionLocal.add(TS.vec3(sway, 0.0, sway.mul(0.6)));
  }
  const vegMatrices = (placements, mesh) => {
    const m = new THREE.Matrix4(); const qq = new THREE.Quaternion(); const yA = new THREE.Vector3(0, 1, 0);
    placements.forEach((pl, i) => {
      qq.setFromAxisAngle(yA, pl[4]);
      m.compose(new THREE.Vector3(pl[0], pl[1], pl[2]), qq, new THREE.Vector3(pl[3], pl[3] * (0.8 + (i % 5) * 0.08), pl[3]));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false;
  };
  const tufts = new THREE.InstancedMesh(bladeGeo, vegMat, Math.max(1, tuftPlacements.length));
  tufts.name = 'IntroTufts'; tufts.count = tuftPlacements.length; vegMatrices(tuftPlacements, tufts);
  const ferns = new THREE.InstancedMesh(frondGeo, vegMat, Math.max(1, fernPlacements.length));
  ferns.name = 'IntroFerns'; ferns.count = fernPlacements.length; vegMatrices(fernPlacements, ferns);
  scene.add(tufts, ferns);
  const vegTris = tuftPlacements.length * (bladeGeo.index.count / 3) + fernPlacements.length * (frondGeo.index.count / 3);

  // --- faint trunk silhouettes in the fog ---
  const TRUNKS = 18;
  // fog-aware dark blue-grey bark: base dissolves into low mist (world-height gradient) and distance fog does the rest
  const trunkMat = new THREE.MeshBasicNodeMaterial();
  trunkMat.colorNode = TS.vec4(TS.mix(TS.vec3(0.022, 0.034, 0.055), TS.vec3(0.04, 0.056, 0.082), TS.smoothstep(1.0, 9.0, TS.positionWorld.y)), 1.0);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.34, 1, 7, 1, true), trunkMat, TRUNKS);
  trunks.name = 'IntroTrunks';
  {
    const tr = makeRng(CFG.seed ^ 0x7aa);
    const m = new THREE.Matrix4(); const qq = new THREE.Quaternion();
    for (let i = 0; i < TRUNKS; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (4.2 + tr() * 16) + (tr() - 0.5) * 2; const z = -16 - tr() * 26;
      const h = 16 + tr() * 8; const rr = 0.35 + Math.pow(tr(), 1.6) * 1.1;
      qq.setFromEuler(_e.set((tr() - 0.5) * 0.06, 0, (tr() - 0.5) * 0.06));
      m.compose(new THREE.Vector3(x, h / 2 - 0.5, z), qq, new THREE.Vector3(rr, h, rr));
      trunks.setMatrixAt(i, m);
    }
    trunks.instanceMatrix.needsUpdate = true; trunks.frustumCulled = false;
  }
  scene.add(trunks);

  // --- contact shadows: gate footing + one soft blob per resting stone ---
  const blobAlpha = (inner) => {
    const p = TS.uv().sub(0.5).mul(2.0);
    const r = TS.length(p);
    return TS.float(1.0).sub(TS.smoothstep(inner, 1.0, r));
  };
  const uFoot = TS.uniform(0.0);
  const footMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  footMat.colorNode = TS.vec4(0.0, 0.0, 0.0, blobAlpha(0.3).mul(0.85).mul(uFoot));
  footMat.fog = false;
  const foot = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.0), footMat);
  foot.rotation.x = -Math.PI / 2; foot.position.set(0, 0.012, 0.1); foot.renderOrder = 1;
  scene.add(foot);

  const blobMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  blobMat.colorNode = TS.vec4(0.0, 0.0, 0.0, blobAlpha(0.12).mul(0.8));
  blobMat.fog = false;
  const blobGeo = new THREE.PlaneGeometry(1, 1);
  blobGeo.rotateX(-Math.PI / 2);
  const blobs = new THREE.InstancedMesh(blobGeo, blobMat, N);
  blobs.frustumCulled = false; blobs.renderOrder = 1;
  blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(blobs);

  // --- atmosphere: back haze, a faint moon shaft, low drifting mist layers, motes ---
  const hazeMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  hazeMat.colorNode = TS.vec4(0.07, 0.12, 0.22, blobAlpha(0.0).mul(0.14));
  hazeMat.fog = false;
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(60, 22), hazeMat);
  haze.position.set(0, 4.0, -22); haze.renderOrder = -1;
  scene.add(haze);

  const shaftMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const u = TS.uv();
    const across = TS.float(1.0).sub(TS.abs(u.x.sub(0.5)).mul(2.0));
    const a = TS.pow(TS.clamp(across, 0.0, 1.0), 2.2).mul(TS.pow(u.y, 1.4)).mul(0.06);
    shaftMat.colorNode = TS.vec4(0.36, 0.5, 0.78, a);
    shaftMat.fog = false;
  }
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 13), shaftMat);
  shaft.position.set(-4.4, 5.2, -4.2); shaft.rotation.z = -0.3; shaft.renderOrder = 2;
  scene.add(shaft);

  const mistLayers = [];
  for (let i = 0; i < 3; i += 1) {
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const off = i * 7.3;
    const dir = i % 2 === 0 ? 1 : -1;
    const wp = TS.positionWorld;
    const q = TS.vec2(wp.x.mul(0.16).add(uTime.mul(0.012 * dir)).add(off), wp.z.mul(0.2).sub(uTime.mul(0.008)).add(off * 0.5));
    const n = tslFbm3(q);
    const dist = TS.length(wp.sub(TS.cameraPosition));
    const near = TS.smoothstep(1.5, 5.0, dist);
    const far = TS.float(1.0).sub(TS.smoothstep(16.0, 34.0, dist));
    const a = TS.smoothstep(0.38, 0.8, n).mul(near).mul(far).mul(0.1 - i * 0.015);
    mat.colorNode = TS.vec4(0.32, 0.42, 0.54, a);
    mat.fog = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 50).rotateX(-Math.PI / 2), mat);
    mesh.position.set(0, 0.3 + i * 0.32, -10); mesh.renderOrder = 3 + i;
    scene.add(mesh); mistLayers.push(mesh);
  }

  const MOTES = 64;
  const moteMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  moteMat.colorNode = TS.vec4(0.42, 0.6, 0.85, 0.5);
  moteMat.fog = false;
  const motes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.014, 0), moteMat, MOTES);
  motes.frustumCulled = false; motes.renderOrder = 6;
  motes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const moteSeed = [];
  {
    const mr = makeRng(CFG.seed ^ 0xBEE);
    for (let i = 0; i < MOTES; i += 1) moteSeed.push([(mr() - 0.5) * 14, 0.25 + mr() * 4.6, -6 + mr() * 14, mr() * 6.28, 0.4 + mr() * 0.8]);
  }
  scene.add(motes);

  // --- settle dust puffs: 6 per stone, positions are a pure function of p ---
  const DUST_PER = 6;
  const dustMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const vd = TS.positionViewDirection || (TS.positionView ? TS.normalize(TS.positionView.negate()) : null);
    const soft = (vd && TS.normalView) ? TS.pow(TS.clamp(TS.dot(TS.normalView, vd), 0.0, 1.0), 1.6) : TS.float(0.6);
    dustMat.colorNode = TS.vec4(0.34, 0.4, 0.5, soft.mul(0.34)); // soft-edged puff (alpha falls off toward the silhouette)
  }
  dustMat.fog = false;
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), dustMat, N * DUST_PER);
  dust.frustumCulled = false; dust.renderOrder = 7;
  dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(dust);
  const dustDir = Array.from({ length: N * DUST_PER }, (_, k) => { const r = makeRng(CFG.seed ^ (k * 2654435761)); return [r() * 6.28, 0.6 + r() * 0.8, r()]; });

  // --- portal vortex disc (adapted TSL vortex), sized to the arch opening ---
  const uT = TS.uniform(0.0);
  const uReveal = TS.uniform(0.0);
  const uVortex = TS.uniform(0.0);
  // Restrained veil masked to the arch's intrados: straight sides below the spring line, a semicircle above,
  // inner radius = voussoir inner radius minus a small margin, feathered at the edge.
  const gateInner = CFG.gate.rm - 0.5 * L.scale[(2 + 1 + 10) * 3] * rock.size.x; // radial half-thickness of a voussoir
  const PORTAL = { ri: gateInner - 0.07, spring: L.springY, bottom: 0.12 };
  PORTAL.top = PORTAL.spring + PORTAL.ri;
  PORTAL.w = 2 * (PORTAL.ri + 0.2);
  PORTAL.h = PORTAL.top + 0.2 - PORTAL.bottom;
  PORTAL.cy = PORTAL.bottom + PORTAL.h / 2;
  const vortexMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  {
    const { uv, vec2, vec3, vec4, float, length, cos, sin, pow, mix, smoothstep, clamp, max, abs } = TS;
    const u = uv();
    const x = u.x.sub(0.5).mul(PORTAL.w);
    const y = u.y.sub(0.5).mul(PORTAL.h).add(PORTAL.cy);
    const dy = y.sub(PORTAL.spring);
    const d = length(vec2(x, max(dy, 0.0))).sub(PORTAL.ri);            // signed distance to the intrados (<0 inside)
    const mask = float(1.0).sub(smoothstep(-0.16, -0.015, d)).mul(smoothstep(PORTAL.bottom, PORTAL.bottom + 0.55, y));
    // Dense, material swirl: two scales of fbm in a rotating frame. The
    // dedicated uVortex envelope makes this read during the mid-scroll ring,
    // while uReveal remains reserved for the later smoky gate opening.
    const cen = vec2(x, dy.sub(0.25));
    const rr = length(cen);
    const ang = pow(clamp(float(1.0).sub(rr.div(PORTAL.ri)), 0.0, 1.0), 1.2).mul(2.35).sub(uT.mul(0.18));
    const ca = cos(ang); const sa = sin(ang);
    const q = vec2(cen.x.mul(ca).sub(cen.y.mul(sa)), cen.x.mul(sa).add(cen.y.mul(ca)));
    const coarse = tslFbm3(q.mul(1.35).add(vec2(uT.mul(0.06), uT.mul(0.08))));
    const detailed = tslFbm3(q.mul(5.4).add(vec2(uT.mul(-0.14), uT.mul(0.11))));
    const n = clamp(coarse.mul(0.62).add(detailed.mul(0.38)), 0.0, 1.0);
    const filaments = pow(clamp(detailed.mul(1.55).sub(0.32), 0.0, 1.0), 0.72);
    const edge = pow(smoothstep(-0.58, -0.015, d), 1.45);
    const depthCol = vec3(0.006, 0.018, 0.065)
      .add(vec3(0.03, 0.12, 0.38).mul(pow(n, 1.35)).mul(0.95))
      .add(vec3(0.08, 0.055, 0.24).mul(filaments).mul(0.65))
      .add(vec3(0.08, 0.24, 0.62).mul(edge).mul(0.62));                // cool rim toward the stones
    const alpha = mask.mul(n.mul(0.32).add(filaments.mul(0.34)).add(0.18)).mul(uVortex).mul(1.18)
      .add(mask.mul(edge).mul(uReveal).mul(0.22));
    vortexMat.colorNode = vec4(depthCol, alpha);
    vortexMat.fog = false;
    vortexMat.blending = THREE.AdditiveBlending;
    vortexMat.toneMapped = false;
  }
  const vortex = new THREE.Mesh(new THREE.PlaneGeometry(PORTAL.w, PORTAL.h), vortexMat);
  vortex.position.set(0, PORTAL.cy, CFG.portal.cz);
  vortex.renderOrder = 4;
  scene.add(vortex);
  portalLight.position.set(0, PORTAL.spring - 0.1, 0.12);

  // --- post: ONE authored bloom, guarded ---
  let glow = null;
  let bloomLabel = 'off';
  try {
    glow = createGlowPipeline(renderer, scene, camera, { strength: 0.0, threshold: 0.9 });
    bloomLabel = glow.label;
  } catch (err) {
    glow = null;
    bloomLabel = `off (${err && err.message ? err.message : err})`;
  }
  let pipelineFailed = false;
  setBodyData('bloom', glow ? 'pipeline' : 'off');

  // --- per-frame state ---
  const hoverGlow = new Float32Array(N);
  const state = { p: 0, target: 0, time: 0, running: false, raf: 0, last: 0, w: 1, h: 1, frozenTime: 3.2, capture, rendered: 0, hoveredStone: -1, hoverPeak: 0 };
  const tmpM = new THREE.Matrix4(); const tmpQ = new THREE.Quaternion(); const tmpQ2 = new THREE.Quaternion(); const tmpQ3 = new THREE.Quaternion();
  const tmpP = new THREE.Vector3(); const tmpS = new THREE.Vector3(); const tmpAxis = new THREE.Vector3();
  const qa = new THREE.Quaternion(); const qb = new THREE.Quaternion();
  const portalC = new THREE.Vector3(0, PORTAL.spring - 0.3, CFG.portal.cz);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
  const prog = (p, a, b) => clamp((p - a) / Math.max(1e-6, b - a), 0, 1);

  let settledCount = 0;
  let footLevel = 0;

  function setHoveredStone(index) {
    const next = Number.isInteger(index) && index >= 0 && index < N ? index : -1;
    if (next === state.hoveredStone) return;
    state.hoveredStone = next;
    setBodyData('hover-stone', next >= 0 ? String(next) : 'none');
    if (reduced) {
      hoverGlow.fill(0);
      if (next >= 0) hoverGlow[next] = 1;
      if (!state.running && typeof api !== 'undefined') api.renderStatic(false);
    }
  }

  function pickStone(event) {
    if (capture) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(stones, false).find((item) => item.instanceId !== undefined);
    setHoveredStone(hit ? hit.instanceId : -1);
  }

  function updateHover(dt) {
    const rate = reduced ? 1 : 1 - Math.exp(-Math.min(0.1, Math.max(0, dt)) * 14);
    for (let i = 0; i < N; i += 1) {
      const goal = i === state.hoveredStone ? 1 : 0;
      hoverGlow[i] += (goal - hoverGlow[i]) * rate;
      if (Math.abs(goal - hoverGlow[i]) < 0.0005) hoverGlow[i] = goal;
    }
  }

  function updateStones(time, p) {
    settledCount = 0;
    let footing = 0;
    for (let i = 0; i < N; i += 1) {
      const i3 = i * 3; const i4 = i * 4;
      const E1 = easeOutCubic(prog(p, L.s0[i], L.s1[i]));
      const rawV = prog(p, L.v0[i], L.v1[i]);
      const EV = easeInOutSine(rawV);
      const rawH = prog(p, L.v1[i], L.a0[i]);
      const EH = easeInOutSine(rawH);
      const rawA = prog(p, L.a0[i], L.a1[i]);
      const E2 = easeInOutSine(rawA);
      const rawS = prog(p, L.a1[i], L.land[i]);
      // Ease into and out of the seat so the final gate assembly flows across
      // the scroll range instead of arriving with a hard landing.
      const ES = easeInOutSine(rawS);

      // --- position (piecewise, continuous) ---
      let x; let y; let z;
      if (p < L.s0[i]) {
        x = L.restPos[i3];
        y = L.restPos[i3 + 1];
        z = L.restPos[i3 + 2];
      } else if (p < L.s1[i]) {
        x = L.restPos[i3] + (L.scPos[i3] - L.restPos[i3]) * E1;
        y = L.restPos[i3 + 1] + (L.scPos[i3 + 1] - L.restPos[i3 + 1]) * E1;
        z = L.restPos[i3 + 2] + (L.scPos[i3 + 2] - L.restPos[i3 + 2]) * E1;
      } else if (p < L.v0[i]) {
        x = L.scPos[i3];
        y = L.scPos[i3 + 1];
        z = L.scPos[i3 + 2];
      } else if (p < L.v1[i]) {
        x = L.scPos[i3] + (L.vortexPos[i3] - L.scPos[i3]) * EV;
        y = L.scPos[i3 + 1] + (L.vortexPos[i3 + 1] - L.scPos[i3 + 1]) * EV;
        z = L.scPos[i3 + 2] + (L.vortexPos[i3 + 2] - L.scPos[i3 + 2]) * EV;
      } else if (p < L.a0[i]) {
        const u = EH; const w = 1 - u;
        x = w * w * L.vortexPos[i3] + 2 * w * u * L.ctrl[i3] + u * u * L.hoverPos[i3];
        y = w * w * L.vortexPos[i3 + 1] + 2 * w * u * L.ctrl[i3 + 1] + u * u * L.hoverPos[i3 + 1];
        z = w * w * L.vortexPos[i3 + 2] + 2 * w * u * L.ctrl[i3 + 2] + u * u * L.hoverPos[i3 + 2];
      } else {
        x = L.hoverPos[i3] + (L.tgtPos[i3] - L.hoverPos[i3]) * ES;
        y = L.hoverPos[i3 + 1] + (L.tgtPos[i3 + 1] - L.hoverPos[i3 + 1]) * ES;
        z = L.hoverPos[i3 + 2] + (L.tgtPos[i3 + 2] - L.hoverPos[i3 + 2]) * ES;
      }
      // gentle float while airborne (zero at rest and once seated)
      const air = smooth01((p - L.s0[i]) / 0.06) * (1 - smooth01((p - (L.a1[i] - 0.01)) / 0.012));
      if (air > 0.0001) {
        const bt = p * 26 + L.phase[i];
        x += Math.sin(bt) * 0.05 * air; y += Math.sin(bt * 0.8 + 1.3) * 0.07 * air; z += Math.cos(bt * 0.7) * 0.05 * air;
      }
      // a small seating hop right after landing
      const hop = prog(p, L.land[i], L.land[i] + 0.035);
      if (hop > 0 && hop < 1) y += 0.028 * Math.sin(Math.PI * hop) * (1 - hop);

      // --- rotation: rest -> scatter -> hover -> target, with tumble that vanishes at every joint ---
      qa.set(L.restQuat[i4], L.restQuat[i4 + 1], L.restQuat[i4 + 2], L.restQuat[i4 + 3]);
      qb.set(L.scQuat[i4], L.scQuat[i4 + 1], L.scQuat[i4 + 2], L.scQuat[i4 + 3]);
      tmpQ.copy(qa).slerp(qb, E1);
      tmpQ2.set(L.vortexQuat[i4], L.vortexQuat[i4 + 1], L.vortexQuat[i4 + 2], L.vortexQuat[i4 + 3]);
      tmpQ.slerp(tmpQ2, EV);
      tmpQ2.set(L.hoverQuat[i4], L.hoverQuat[i4 + 1], L.hoverQuat[i4 + 2], L.hoverQuat[i4 + 3]);
      tmpQ.slerp(tmpQ2, EH);
      tmpQ2.set(L.tgtQuat[i4], L.tgtQuat[i4 + 1], L.tgtQuat[i4 + 2], L.tgtQuat[i4 + 3]);
      tmpQ.slerp(tmpQ2, ES);
      tmpAxis.set(L.spinAxis[i3], L.spinAxis[i3 + 1], L.spinAxis[i3 + 2]);
      const ang = L.spinA[i] * Math.sin(Math.PI * E1) + L.spinB[i] * Math.sin(Math.PI * EV) + 0.35 * L.spinB[i] * Math.sin(Math.PI * EH);
      if (Math.abs(ang) > 1e-4) { tmpQ3.setFromAxisAngle(tmpAxis, ang); tmpQ.premultiply(tmpQ3); }

      tmpP.set(x, y, z); tmpS.set(L.scale[i3], L.scale[i3 + 1], L.scale[i3 + 2]); // CONSTANT scale vector
      tmpM.compose(tmpP, tmpQ, tmpS);
      stones.setMatrixAt(i, tmpM);

      // --- seam glow: 0 at rest, restrained in flight, accent at the settle, subtle once complete ---
      const flight = smooth01((p - L.s0[i]) / 0.08) * (1 - smooth01((p - (L.land[i] - 0.015)) / 0.02));
      const dl = p - L.land[i];
      const accent = dl > -0.004 ? Math.exp(-(dl * dl) / (2 * 0.02 * 0.02)) : 0;
      const done = smooth01(dl / 0.08);
      glowArr[i] = 0.16 * flight + 0.75 * accent * smooth01((dl + 0.004) / 0.004) + 0.07 * done + 0.95 * hoverGlow[i];
      state.hoverPeak = Math.max(state.hoverPeak, hoverGlow[i]);
      if (p >= L.land[i]) settledCount += 1;
      if ((L.role[i] === 'footing' || L.role[i] === 'pillar') && L.land[i] <= p) footing += 1;

      // contact blob follows the resting stone and dies as it lifts
      const live = 1 - smooth01((p - L.s0[i]) / 0.05);
      tmpP.set(L.restBase[i3], L.restBase[i3 + 1], L.restBase[i3 + 2]);
      tmpS.set(L.scale[i3] * rock.size.x * 1.35 * live + 0.0001, 1, L.scale[i3 + 2] * rock.size.z * 1.15 * live + 0.0001);
      tmpQ3.setFromAxisAngle(yAxis, L.restYaw[i]);
      tmpM.compose(tmpP, tmpQ3, tmpS);
      blobs.setMatrixAt(i, tmpM);

      // dust puff at the settle
      for (let j = 0; j < DUST_PER; j += 1) {
        const k = i * DUST_PER + j; const d = dustDir[k];
        const a = (p - L.land[i]) / 0.075;
        if (a > 0 && a < 1) {
          const rad = (0.06 + 0.5 * easeOutCubic(a)) * d[1];
          const sizeK = 1.4 * Math.sin(Math.PI * Math.sqrt(a)) * (0.6 + 0.6 * d[2]) * (L.role[i] === 'voussoir' || L.role[i] === 'keystone' ? 0.6 : 1.0);
          tmpP.set(L.dustBase[i3] + Math.cos(d[0]) * rad, L.dustBase[i3 + 1] + 0.05 + 0.22 * a * (0.5 + d[2]), L.dustBase[i3 + 2] + Math.sin(d[0]) * rad * 0.6);
          tmpS.setScalar(sizeK + 0.0001);
        } else { tmpP.set(0, -5, 0); tmpS.setScalar(0.0001); }
        tmpM.compose(tmpP, tmpQ.identity(), tmpS);
        dust.setMatrixAt(k, tmpM);
      }
    }
    footLevel = footing / 12;
    stones.instanceMatrix.needsUpdate = true;
    blobs.instanceMatrix.needsUpdate = true;
    dust.instanceMatrix.needsUpdate = true;
    glowAttr.needsUpdate = true;
  }

  function updateMotes(time) {
    for (let i = 0; i < MOTES; i += 1) {
      const m = moteSeed[i];
      const t = time;
      tmpP.set(m[0] + Math.sin(t * 0.12 * m[4] + m[3]) * 0.6, m[1] + Math.sin(t * 0.18 * m[4] + m[3] * 2) * 0.35, m[2] + Math.cos(t * 0.1 * m[4] + m[3]) * 0.5);
      tmpS.setScalar(0.6 + 0.8 * (0.5 + 0.5 * Math.sin(t * 1.1 * m[4] + m[3])));
      tmpM.compose(tmpP, tmpQ.identity(), tmpS);
      motes.setMatrixAt(i, tmpM);
    }
    motes.instanceMatrix.needsUpdate = true;
  }

  function phaseName(p) {
    let name = TIMELINE[0].name;
    for (const ph of TIMELINE) if (p >= ph.start && p < ph.end) name = ph.name;
    if (p >= 1) name = 'reveal';
    return name;
  }

  function applyTimeline(time, p) {
    const reveal = smooth01(prog(p, 0.85, 1.0));
    // The vortex is its own mid-scroll beat. Keeping this envelope separate
    // from the final reveal prevents the ring from disappearing until the gate
    // is already assembled, while the smoke layer still starts at the reveal.
    const vortex = smooth01(prog(p, 0.20, 0.30)) * (1 - smooth01(prog(p, 0.48, 0.70)));
    uReveal.value = reveal;
    uVortex.value = vortex;
    uT.value = time; uTime.value = time;
    if (water) {
      water.update(time * 0.55);
      if (water.uniforms.waterColor && water.uniforms.waterColor.value && water.uniforms.waterColor.value.setRGB) {
        water.uniforms.waterColor.value.setRGB(lerp(0.011, 0.016, reveal), lerp(0.04, 0.062, reveal), lerp(0.055, 0.10, reveal));
      }
    }
    portalLight.intensity = reveal * CFG.portalLight;
    uFoot.value = 0; // set after stones update
    state.hoverPeak = 0;
    updateStones(time, p);
    if (glow) glow.strength.value = Math.max(reveal * 0.35, state.hoverPeak * 0.42);
    uFoot.value = smooth01(footLevel);
  }

  // --- layout / resize ---
  function resize() {
    const { w, h } = fitRenderer(renderer, canvas, 1.5);
    state.w = w; state.h = h;
    const aspect = w / h;
    camera.aspect = aspect;
    const portrait = aspect < 0.9;
    const dist = portrait ? clamp(11.5 / aspect, CFG.eye[2], 28) : CFG.eye[2];
    camera.position.z = dist;
    // hero offset (gate right of the copy) is not applied in capture mode: centred composition
    const shiftX = (portrait || capture) ? 0 : w * 0.1;
    const shiftY = portrait && !capture ? h * 0.14 : 0;
    if (shiftX || shiftY) camera.setViewOffset(w, h, -shiftX, shiftY, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    if (glow) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      glow.setSize(w * dpr, h * dpr);
    }
  }

  function render() {
    if (glow && !pipelineFailed) {
      try { glow.render(); state.rendered += 1; return; } catch (err) {
        pipelineFailed = true;
        setBodyData('bloom', 'off');
        bloomLabel = `off (pipeline threw: ${err && err.message ? err.message : err})`;
      }
    }
    renderer.render(scene, camera);
    state.rendered += 1;
  }

  function placeCamera(time, drift, progress = state.p) {
    // The camera move is part of the same deterministic scroll/capture scalar:
    // a restrained lateral drift plus a small dolly-in as the stones assemble.
    // It is deliberately code-authored so the still storyboard, scroll, and
    // any later approved video all share the same camera track.
    const cp = smooth01(clamp(Number(progress) || 0, 0, 1));
    const idleX = drift ? Math.sin(time * 0.11) * 0.05 : 0;
    const idleY = drift ? Math.sin(time * 0.17) * 0.02 : 0;
    camera.position.x = lerp(CFG.eye[0], -0.34, cp) + idleX;
    camera.position.y = lerp(CFG.eye[1], 2.82, cp) + idleY;
    camera.position.z = lerp(CFG.eye[2], 11.72, cp);
    const aimX = lerp(CFG.look[0], 0.08, cp);
    const aimY = lerp(CFG.look[1], 1.82, cp);
    const aimZ = lerp(CFG.look[2], -0.12, cp);
    camera.lookAt(aimX, aimY, aimZ);
  }

  function frame(now) {
    state.raf = 0;
    if (!state.running) return;
    const dt = Math.min(0.1, Math.max(0, (now - state.last) / 1000));
    state.last = now;
    state.time += dt;
    // ease toward the scroll-driven target (smoothing only; the scene itself is a pure function of state.p)
    const k = 1 - Math.exp(-dt * 7.5);
    state.p += (state.target - state.p) * k;
    if (Math.abs(state.target - state.p) < 0.0004) state.p = state.target;
    placeCamera(state.time, true, state.p);
    updateHover(dt);
    applyTimeline(state.time, state.p);
    updateMotes(state.time);
    render();
    if (typeof api.onFrame === 'function') { try { api.onFrame(state.p); } catch (_) { /* UI hook must never stop the scene */ } }
    state.raf = requestAnimationFrame(frame);
  }

  const nextFrames = (n) => new Promise((resolve) => {
    const step = () => { if (n <= 0) resolve(); else { n -= 1; requestAnimationFrame(step); } };
    step();
  });

  const infoObj = {
    backend, rockSource, rockTriangles: rockTris, stoneInstances: N, gateTargets: N,
    gateLayout: { footing: 2, threshold: 1, pillar: 10, voussoir: 14, keystone: 1 },
    introArch: 'not rendered',
    rubbleInstances: CFG.rubbleCount, rubble: 'static grounded set dressing (not part of the gate)',
    bloom: bloomLabel, seamAttribute: seamNode ? 'per-instance' : 'uniform-only', glowAttribute: glowNode ? 'per-instance' : 'none',
    waterReflection: waterMode, waterNotes, groundTriangles: groundTris, vegetationTriangles: vegTris, failures,
    timeline: TIMELINE,
    hover: 'raycaster instanceId -> eased per-instance emissive/bloom lift',
    vortex: 'scrubbable seeded circular formation before the approved arch targets'
  };

  const api = {
    renderer, backend, scene, camera,
    info: infoObj,
    timeline: TIMELINE,
    get running() { return state.running; },
    get progress() { return state.p; },
    get targetProgress() { return state.target; },
    /** Scroll/target scalar (normal mode eases toward it). */
    setTarget(v) { state.target = clamp(Number(v) || 0, 0, 1); },
    start() {
      if (state.running || capture) return;
      state.running = true; state.last = performance.now();
      state.raf = requestAnimationFrame(frame);
    },
    stop() { state.running = false; if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0; },
    resize() { resize(); if (!state.running) api.renderStatic(state.p >= 0 && reduced); },
    /**
     * Deterministic single frame. time defaults to p*CAPTURE_SECONDS. Resolves after the render call plus two rAF ticks.
     */
    async setProgress(p, opts = {}) {
      const pp = clamp(Number.isFinite(Number(p)) ? Number(p) : 0, 0, 1);
      const time = opts && Number.isFinite(opts.time) ? opts.time : pp * CAPTURE_SECONDS;
      state.p = pp; state.target = pp; state.time = time;
      placeCamera(time, false, pp);
      updateHover(0);
      applyTimeline(time, pp);
      updateMotes(time);
      render();
      await nextFrames(2);
      return { p: pp, time };
    },
    /** Reduced motion / paused: render ONE resolved frame (p=1, frozen time). */
    renderStatic(resolved = reduced) {
      if (resolved) { state.p = 1; state.target = 1; }
      const draw = () => {
        placeCamera(state.frozenTime, false, state.p);
        updateHover(0);
        applyTimeline(state.frozenTime, state.p);
        updateMotes(state.frozenTime);
        render();
      };
      draw();
      // Integration repair (orchestrator): when this runs in the same task as the boot render, the
      // renderer can present the previous instance matrices (attribute uploads are coalesced per
      // animation frame), so the reduced-motion frame showed the stones at rest. Draw once more
      // after two animation frames; still a single static image, no loop.
      nextFrames(2).then(() => { if (!state.running) draw(); });
    },
    getState() {
      return {
        p: state.p, targetProgress: state.target, phase: phaseName(state.p), time: state.time, backend, capture,
        stoneInstances: N, gateTargets: N, rockTriangles: rockTris, waterReflection: waterMode,
        failures: failures.slice(), settled: settledCount, introArch: 'not rendered', renders: state.rendered,
        hoveredStone: state.hoveredStone, hoverPeak: state.hoverPeak
      };
    },
    phaseName,
    /** Screen position of the portal centre as fractions of the canvas. */
    portalScreen() {
      tmpP.copy(portalC).project(camera);
      return { x: (tmpP.x * 0.5 + 0.5), y: (1 - (tmpP.y * 0.5 + 0.5)) };
    },
    /** Read-only projected instance centres used by local browser evidence tooling. */
    stoneScreenPositions() {
      const matrix = new THREE.Matrix4();
      const point = new THREE.Vector3();
      camera.updateMatrixWorld();
      stones.updateMatrixWorld();
      const positions = [];
      for (let i = 0; i < N; i += 1) {
        stones.getMatrixAt(i, matrix);
        point.setFromMatrixPosition(matrix).applyMatrix4(stones.matrixWorld).project(camera);
        positions.push({ i, x: point.x * 0.5 + 0.5, y: 1 - (point.y * 0.5 + 0.5), z: point.z });
      }
      return positions;
    },
    dispose() {
      api.stop();
      canvas.removeEventListener('pointermove', pickStone);
      canvas.removeEventListener('pointerleave', clearHover);
      try { renderer.dispose(); } catch (_) { /* no-op */ }
    }
  };

  function clearHover() { setHoveredStone(-1); }
  if (!capture) {
    canvas.addEventListener('pointermove', pickStone, { passive: true });
    canvas.addEventListener('pointerleave', clearHover, { passive: true });
  }

  resize();
  placeCamera(0, false, 0);
  applyTimeline(0, 0);
  updateMotes(0);
  // compile before first paint when the API exists (never blocks on failure)
  try { if (typeof renderer.compileAsync === 'function') await renderer.compileAsync(scene, camera); } catch (_) { /* compile errors surface at render */ }
  render();
  return api;
}
