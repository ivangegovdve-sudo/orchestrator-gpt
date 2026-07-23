/* SDForest Three.js layer — the crown.
   A side-view tree drawn in light: trunk rising from the forest floor,
   sixteen primary branches (one per project), recursive limbs whose
   angles and thicknesses get progressively more random as they get
   smaller, down to the smallest twigs. Branches know which project
   they belong to: when a slam fires below (shared.slamState.lit) the
   branch wakes into the project's accent color.

   THE LEAVES are a reveal system, not a loop. A canopy of rhomboid
   leaves — squashed squares tilted ~15° — lies scattered invisibly
   across the whole crown area. Each leaf, once triggered, plays its
   life exactly once and then stays:

     invisible
       → its outline strokes itself in            (~200ms)
       → it extrudes out of the page into a
         beveled 3D solid                          (~300ms)
       → one full turn around its axis            (~600ms)
       → the top edge folds back into the page
         first, the rest following, until it
         lies flat again                           (~300ms)
       → a flat, filled rhomboid, permanent.

   Triggers: a staggered wave from the canopy's center outward when
   the crown first scrolls into view, and the pointer — sweeping the
   crown wakes the nearest sleeping leaves early and leaves a warm
   trace over the settled ones.

   Everything is authored in local pixels around the crown-stage rect's
   center and re-anchored to it every frame, so the crown scrolls with
   the page like any other content. */

import * as THREE from '../../vendor/three/three.module.min.js';
import { clamp, lerp, makeAdditive, mulberry32, worldX, worldY, PALETTE } from './util.js';

const MAX_BRANCHES = 16;

/* Leaf life-cycle timing (seconds) — shared by both shaders. */
const LEAF_TIMING = /* glsl */`
  const float T_DRAW = 0.2;
  const float T_EXTRUDE = 0.3;
  const float T_SPIN = 0.6;
  const float T_FOLD = 0.3;
`;

const BRANCH_VERT = /* glsl */`
  attribute float aBranch;
  attribute float aFlex;
  attribute float aShade;
  uniform float uTime;
  uniform float uLit[${MAX_BRANCHES}];
  uniform vec3 uAccent[${MAX_BRANCHES}];
  uniform float uTrunkLit;
  varying vec3 vColor;

  void main() {
    vec3 p = position;
    // Wind: outer, thinner wood sways more; the trunk barely breathes.
    p.x += sin(uTime * 0.7 + position.y * 0.012 + aBranch * 1.7) * aFlex;
    p.y += cos(uTime * 0.55 + position.x * 0.01 + aBranch) * aFlex * 0.35;

    vec3 dim = vec3(0.10, 0.13, 0.10) + vec3(0.055, 0.042, 0.02); // moss + ember bark-light
    vec3 col;
    if (aBranch < 0.0) {
      col = dim * (0.9 + uTrunkLit * 0.5) + vec3(0.30, 0.22, 0.09) * uTrunkLit;
    } else {
      int index = int(aBranch + 0.5);
      float lit = uLit[index];
      col = mix(dim, uAccent[index] * 0.42 + vec3(0.10, 0.075, 0.03), lit);
    }
    vColor = col * aShade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const BRANCH_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vColor;
  void main() { gl_FragColor = vec4(vColor, 1.0); }
`;

/* Shared vertex-shader body for the leaf life cycle: computes the
   transformed vertex and the phase values from (uTime - aBorn).
   position.y spans [-0.62, 0.62] in leaf space; h = 0 at the bottom
   edge, 1 at the top — the fold consumes high h first. */
const LEAF_PHASES = /* glsl */`
  float t = aBorn < 0.0 ? -1.0 : uTime - aBorn;
  float draw = clamp(t / T_DRAW, 0.0, 1.0);
  float ext = smoothstep(0.0, 1.0, clamp((t - T_DRAW) / T_EXTRUDE, 0.0, 1.0));
  float spinT = clamp((t - T_DRAW - T_EXTRUDE) / T_SPIN, 0.0, 1.0);
  float spin = spinT * spinT * (3.0 - 2.0 * spinT) * 6.2831853;
  float fold = clamp((t - T_DRAW - T_EXTRUDE - T_SPIN) / T_FOLD, 0.0, 1.0);

  vec3 p = position * aScale;
  // The fold sweeps down the leaf: the top flattens back into the
  // page first, the bottom follows.
  float h = clamp((position.y + 0.62) / 1.24, 0.0, 1.0);
  float flatten = clamp((fold * 1.5 - (1.0 - h)) / 0.5, 0.0, 1.0);
  float depth = ext * (1.0 - flatten);
  p.z *= depth;
  // A soft pop as it extrudes.
  p *= 0.9 + ext * 0.1 + sin(ext * 3.14159265) * 0.08;
  // One full turn.
  float cs = cos(spin), sn = sin(spin);
  p = vec3(p.x * cs + p.z * sn, p.y, -p.x * sn + p.z * cs);
  // Small per-leaf tilt on top of the baked ~15 degrees.
  float ct = cos(aTilt), st = sin(aTilt);
  p = vec3(p.x * ct - p.y * st, p.x * st + p.y * ct, p.z);

  vec3 world = aOffset + p;
  // Leaves stir only while they are 3D — settled leaves lie still.
  world.x += sin(uTime * 0.8 + aSeed * 41.0) * depth * 2.2;
  world.y += cos(uTime * 0.6 + aSeed * 27.0) * depth * 1.4;
`;

const LEAF_FILL_VERT = /* glsl */`
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aTilt;
  attribute float aBranch;
  attribute float aSeed;
  attribute float aBorn;
  uniform float uTime;
  uniform vec3 uPointer; // xy: canopy-local px, z: pointer presence 0/1
  uniform float uLit[${MAX_BRANCHES}];
  uniform vec3 uAccent[${MAX_BRANCHES}];
  varying vec3 vColor;
  ${LEAF_TIMING}

  void main() {
    ${LEAF_PHASES}

    vec3 n = normal;
    n = vec3(n.x * cs + n.z * sn, n.y, -n.x * sn + n.z * cs);
    n = vec3(n.x * ct - n.y * st, n.x * st + n.y * ct, n.z);
    float glint = 0.5 + 0.5 * abs(dot(normalize(n), normalize(vec3(0.25, 0.4, 0.85))));

    int index = int(aBranch + 0.5);
    vec3 accent = uAccent[index];
    float lit = uLit[index];
    vec3 base = mix(vec3(0.24, 0.36, 0.25), accent * 0.7 + vec3(0.1, 0.08, 0.03), lit * 0.8 + 0.14);
    base *= 0.78 + fract(aSeed * 7.13) * 0.5;

    // The pointer leaves warmth on the canopy it sweeps over.
    float pd = distance(world.xy, uPointer.xy);
    float warm = uPointer.z * exp(-pd / 120.0) * 0.55;

    // Brighter while 3D — the leaf literally comes toward the viewer.
    float presence = ext * (0.55 + depth * 0.65 + warm);
    vColor = base * glint * presence + vec3(0.33, 0.26, 0.11) * warm * ext;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`;

const LEAF_FILL_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vColor;
  void main() { gl_FragColor = vec4(vColor, 1.0); }
`;

const LEAF_RIM_VERT = /* glsl */`
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aTilt;
  attribute float aBranch;
  attribute float aSeed;
  attribute float aBorn;
  attribute float aU; // perimeter parameter 0..1 — the stroke draws along it
  uniform float uTime;
  uniform vec3 uPointer;
  uniform float uLit[${MAX_BRANCHES}];
  uniform vec3 uAccent[${MAX_BRANCHES}];
  varying vec3 vColor;
  ${LEAF_TIMING}

  void main() {
    ${LEAF_PHASES}

    // The outline traces itself in, then settles to a faint rim once
    // the fill has taken over.
    float traced = smoothstep(aU - 0.08, aU, draw);
    float pd = distance(world.xy, uPointer.xy);
    float warm = uPointer.z * exp(-pd / 120.0) * 0.4;
    float strength = mix(traced * 0.9, 0.16 + warm, ext);

    int index = int(aBranch + 0.5);
    vec3 tone = mix(vec3(0.55, 0.72, 0.55), uAccent[index], uLit[index] * 0.6 + 0.1);
    vColor = tone * strength * (t < 0.0 ? 0.0 : 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`;

const LEAF_RIM_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vColor;
  void main() { gl_FragColor = vec4(vColor, 1.0); }
`;

const state = {
  stage: null,
  labelsHost: null,
  group: null,
  branchMesh: null,
  leafFill: null,
  leafRim: null,
  uniforms: null,
  leafUniforms: null,
  labels: [],
  labelLit: [],
  builtFor: '',
  rebuildTimer: 0,
  sections: [],
  // Leaf reveal bookkeeping (CPU side)
  leafMeta: [],          // { x, y, waveDelay, born }
  bornAttrs: [],         // the two instanced aBorn attributes (fill+rim)
  waveStart: -1,
  leavesLive: false,
  pointerClient: { x: -1e5, y: -1e5, seen: false },
  lastRect: null,
};

/* The rhomboid: a squashed square (diagonals 2.0 × 1.24) with the
   site's ~15° tilt baked in, plus front/back apexes for the bevel. */
const RIM_POINTS = (() => {
  const raw = [[1, 0], [0, 0.62], [-1, 0], [0, -0.62]];
  const a = (15 * Math.PI) / 180;
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return raw.map(([x, y]) => [x * cs - y * sn, x * sn + y * cs]);
})();

function leafFillGeometry() {
  const front = [0, 0, 0.42];
  const back = [0, 0, -0.42];
  const positions = [];
  const normals = [];
  for (let i = 0; i < 4; i += 1) {
    const a = [...RIM_POINTS[i], 0];
    const b = [...RIM_POINTS[(i + 1) % 4], 0];
    for (const apex of [front, back]) {
      const first = apex === front ? a : b;
      const second = apex === front ? b : a;
      positions.push(...first, ...second, ...apex);
      const u = [second[0] - first[0], second[1] - first[1], second[2] - first[2]];
      const v = [apex[0] - first[0], apex[1] - first[1], apex[2] - first[2]];
      const n = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      const len = Math.hypot(...n) || 1;
      for (let k = 0; k < 3; k += 1) normals.push(n[0] / len, n[1] / len, n[2] / len);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

function leafRimGeometry() {
  const positions = [];
  const us = [];
  for (let i = 0; i < 4; i += 1) {
    const a = RIM_POINTS[i];
    const b = RIM_POINTS[(i + 1) % 4];
    positions.push(a[0], a[1], 0, b[0], b[1], 0);
    us.push(i / 4, (i + 1) / 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aU', new THREE.Float32BufferAttribute(us, 1));
  return geometry;
}

/* Grow the tree wood. Local space: origin at stage center, +y up, px. */
function growTree(W, H, branchCount, compact) {
  const random = mulberry32(20260723);
  const segments = [];
  const tips = [];
  const maxDepth = compact ? 3 : 4;

  function segment(ax, ay, bx, by, wa, wb, branch, flex, shade) {
    segments.push({ ax, ay, bx, by, wa, wb, branch, flex, shade });
  }

  function grow(x, y, angle, length, width, depth, branch, tip) {
    const steps = 3;
    let cx = x;
    let cy = y;
    let a = angle;
    const shade = clamp(1 - depth * 0.13, 0.35, 1);
    for (let s = 0; s < steps; s += 1) {
      const wobble = (random() - 0.5) * (0.1 + depth * 0.16);
      a += wobble;
      const nx = cx + Math.sin(a) * (length / steps);
      const ny = cy + Math.cos(a) * (length / steps);
      const w0 = width * (1 - (s / steps) * 0.3);
      const w1 = width * (1 - ((s + 1) / steps) * 0.3);
      segment(cx, cy, nx, ny, w0, w1, branch, (depth + 1) ** 1.6 * 0.9, shade);
      cx = nx;
      cy = ny;
    }
    const d2 = (cx - tip.ox) ** 2 + (cy - tip.oy) ** 2;
    if (d2 > tip.d2) { tip.d2 = d2; tip.x = cx; tip.y = cy; }

    if (depth >= maxDepth) {
      const twigs = 1 + (random() < 0.5 ? 1 : 0);
      for (let t = 0; t < twigs; t += 1) {
        const ta = a + (random() - 0.5) * 1.3;
        const tl = 6 + random() * 13;
        segment(cx, cy, cx + Math.sin(ta) * tl, cy + Math.cos(ta) * tl, 1.1, 0.5, branch, (depth + 2) ** 1.6, shade * 0.9);
      }
      return;
    }

    const children = depth === 0
      ? 2 + (random() < 0.4 ? 1 : 0)
      : (random() < 0.78 ? 2 : 1);
    for (let k = 0; k < children; k += 1) {
      const side = children === 1 ? (random() < 0.5 ? -1 : 1) : (k % 2 ? -1 : 1);
      const spread = side * (0.26 + depth * 0.15) * (0.7 + random() * (0.6 + depth * 0.35));
      grow(
        cx, cy,
        a + spread - a * 0.06,
        length * (0.58 + random() * 0.17),
        Math.max(0.8, width * (0.5 + random() * 0.14)),
        depth + 1, branch, tip,
      );
    }
  }

  // Trunk.
  const trunkBase = -H * 0.47;
  const trunkTop = -H * 0.05;
  const trunkSteps = 6;
  let tx = 0;
  let px = 0;
  for (let s = 0; s < trunkSteps; s += 1) {
    const y0 = lerp(trunkBase, trunkTop, s / trunkSteps);
    const y1 = lerp(trunkBase, trunkTop, (s + 1) / trunkSteps);
    tx = px + (random() - 0.5) * 9;
    const w0 = lerp(26, 13, s / trunkSteps) * (0.92 + random() * 0.16);
    const w1 = lerp(26, 13, (s + 1) / trunkSteps);
    segment(px, y0, tx, y1, w0, w1, -1, 0.25, 1);
    px = tx;
  }
  for (let r = 0; r < 5; r += 1) {
    const ra = (r / 4 - 0.5) * 2.4 + (random() - 0.5) * 0.3;
    const rl = 30 + random() * 46;
    segment(0, trunkBase, Math.sin(ra) * rl, trunkBase - Math.abs(Math.cos(ra)) * rl * 0.5 - 6, 9 + random() * 6, 1, -1, 0.2, 0.8);
  }

  // Primary branches — stubs deliberately uneven in thickness and angle.
  for (let i = 0; i < branchCount; i += 1) {
    const t = branchCount === 1 ? 0.5 : i / (branchCount - 1);
    const fan = lerp(-1.32, 1.32, t) + (random() - 0.5) * 0.14;
    const attachY = lerp(trunkTop, trunkTop - H * 0.13, Math.abs(fan) / 1.32) + (random() - 0.5) * H * 0.03;
    const attachX = px * (1 - Math.abs(fan) / 2);
    const length = H * 0.235 * (0.78 + random() * 0.5) * (1 - Math.abs(fan) * 0.12);
    const width = 8.5 + random() * 9;
    const tip = { ox: attachX, oy: attachY, x: attachX, y: attachY, d2: 0 };
    grow(attachX, attachY, fan, length, width, 0, i, tip);
    tips.push(tip);
  }

  // Right-side canopy fill: the sixteen-branch fan reads thin in the
  // +x quadrant, so grow extra limbs at 30°–80° from vertical. They
  // borrow the lit state of the nearest primary branch and add no
  // tips — labels and slam wiring stay one-per-project.
  const fillCount = 5;
  for (let e = 0; e < fillCount; e += 1) {
    const fan = lerp(0.52, 1.40, e / (fillCount - 1)) + (random() - 0.5) * 0.12;
    const attachY = lerp(trunkTop, trunkTop - H * 0.13, Math.min(fan / 1.32, 1)) + (random() - 0.5) * H * 0.03;
    const attachX = px * (1 - fan / 2);
    const length = H * 0.21 * (0.72 + random() * 0.45) * (1 - fan * 0.12);
    const width = 6 + random() * 6.5;
    const litAs = clamp(
      Math.round(((fan / 1.32) * 0.5 + 0.5) * (branchCount - 1)),
      0, branchCount - 1,
    );
    const tip = { ox: attachX, oy: attachY, x: attachX, y: attachY, d2: 0 };
    grow(attachX, attachY, fan, length, width, 0, litAs, tip);
  }

  return { segments, tips };
}

/* Scatter the sleeping canopy across the whole crown area — full page
   width, the canopy band of the stage — densest near the center.
   waveDelay orders the load reveal from the center outward. */
function scatterLeaves(W, H, branchCount, compact) {
  const random = mulberry32(4207);
  const count = compact ? 70 : 130;
  const centerY = H * 0.14;
  const maxR = Math.hypot(W * 0.5, H * 0.32);
  const meta = [];
  for (let i = 0; i < count; i += 1) {
    // Mild center bias: average of two uniforms pulls toward 0.
    const bx = (random() + random() - 1) * 0.5;
    const x = bx * W * 0.94;
    const y = -H * 0.18 + random() * H * 0.62;
    const dist = Math.hypot(x, y - centerY);
    // Angle from vertical of this leaf's radial off the trunk — the
    // same convention the branch fan uses (0 = straight up, +x right).
    const branchAngle = Math.atan2(x, y + H * 0.05);
    meta.push({
      x,
      y,
      born: -1,
      waveDelay: (dist / maxR) * 2.4 + random() * 0.5,
      seed: random(),
      // Point the stem axis (long diagonal, baked 15° CCW off +x)
      // along the branch radial, so leaves grow away from the trunk.
      tilt: Math.PI / 2 - branchAngle - (15 * Math.PI) / 180 + (random() - 0.5) * 0.24,
      scale: 7 + random() * 7.5,
      branch: clamp(
        Math.round(((branchAngle / 1.35) * 0.5 + 0.5) * (branchCount - 1)),
        0, branchCount - 1,
      ),
    });
  }
  return meta;
}

function buildMeshes(shared, W, H) {
  const compact = shared.compact();
  const count = shared.slamState?.count || MAX_BRANCHES;
  const branchCount = Math.min(count, MAX_BRANCHES);
  const { segments, tips } = growTree(W, H, branchCount, compact);

  // Branch wood: two triangles per tapered segment.
  const positions = new Float32Array(segments.length * 6 * 3);
  const branchAttr = new Float32Array(segments.length * 6);
  const flexAttr = new Float32Array(segments.length * 6);
  const shadeAttr = new Float32Array(segments.length * 6);
  segments.forEach((seg, i) => {
    const dx = seg.bx - seg.ax;
    const dy = seg.by - seg.ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const a1 = [seg.ax + nx * seg.wa / 2, seg.ay + ny * seg.wa / 2, 0];
    const a2 = [seg.ax - nx * seg.wa / 2, seg.ay - ny * seg.wa / 2, 0];
    const b1 = [seg.bx + nx * seg.wb / 2, seg.by + ny * seg.wb / 2, 0];
    const b2 = [seg.bx - nx * seg.wb / 2, seg.by - ny * seg.wb / 2, 0];
    positions.set([...a1, ...b1, ...a2, ...a2, ...b1, ...b2], i * 18);
    for (let v = 0; v < 6; v += 1) {
      branchAttr[i * 6 + v] = seg.branch;
      flexAttr[i * 6 + v] = seg.flex;
      shadeAttr[i * 6 + v] = seg.shade;
    }
  });
  const branchGeometry = new THREE.BufferGeometry();
  branchGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  branchGeometry.setAttribute('aBranch', new THREE.Float32BufferAttribute(branchAttr, 1));
  branchGeometry.setAttribute('aFlex', new THREE.Float32BufferAttribute(flexAttr, 1));
  branchGeometry.setAttribute('aShade', new THREE.Float32BufferAttribute(shadeAttr, 1));

  const litUniform = new Array(MAX_BRANCHES).fill(0);
  const accentUniform = [];
  for (let i = 0; i < MAX_BRANCHES; i += 1) {
    accentUniform.push(shared.slamState?.accents[i]?.clone() || new THREE.Color(PALETTE.green));
  }
  state.uniforms = {
    uTime: { value: 0 },
    uLit: { value: litUniform },
    uAccent: { value: accentUniform },
    uTrunkLit: { value: 0 },
  };
  // Leaves share lit/accent but add the pointer.
  state.leafUniforms = {
    uTime: state.uniforms.uTime,
    uLit: state.uniforms.uLit,
    uAccent: state.uniforms.uAccent,
    uPointer: { value: new THREE.Vector3(-1e5, -1e5, 0) },
  };

  const branchMesh = new THREE.Mesh(branchGeometry, makeAdditive(new THREE.ShaderMaterial({
    vertexShader: BRANCH_VERT,
    fragmentShader: BRANCH_FRAG,
    uniforms: state.uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  })));
  branchMesh.frustumCulled = false;
  branchMesh.renderOrder = 1;

  // The sleeping canopy.
  state.leafMeta = scatterLeaves(W, H, branchCount, compact);
  const n = state.leafMeta.length;
  const offsets = new Float32Array(n * 3);
  const scales = new Float32Array(n);
  const tilts = new Float32Array(n);
  const branches = new Float32Array(n);
  const seeds = new Float32Array(n);
  const borns = new Float32Array(n).fill(-1);
  state.leafMeta.forEach((leaf, i) => {
    offsets.set([leaf.x, leaf.y, 2], i * 3);
    scales[i] = leaf.scale;
    tilts[i] = leaf.tilt;
    branches[i] = leaf.branch;
    seeds[i] = leaf.seed;
  });

  state.bornAttrs = [];
  const makeLeafMesh = (base, vert, frag, isLines) => {
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', base.getAttribute('position'));
    if (base.getAttribute('normal')) geo.setAttribute('normal', base.getAttribute('normal'));
    if (base.getAttribute('aU')) geo.setAttribute('aU', base.getAttribute('aU'));
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets.slice(), 3));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales.slice(), 1));
    geo.setAttribute('aTilt', new THREE.InstancedBufferAttribute(tilts.slice(), 1));
    geo.setAttribute('aBranch', new THREE.InstancedBufferAttribute(branches.slice(), 1));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds.slice(), 1));
    const bornAttr = new THREE.InstancedBufferAttribute(borns.slice(), 1);
    bornAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aBorn', bornAttr);
    state.bornAttrs.push(bornAttr);
    geo.instanceCount = n;
    const material = makeAdditive(new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: state.leafUniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    const mesh = isLines
      ? new THREE.LineSegments(geo, material)
      : new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    return mesh;
  };

  const leafFill = makeLeafMesh(leafFillGeometry(), LEAF_FILL_VERT, LEAF_FILL_FRAG, false);
  const leafRim = makeLeafMesh(leafRimGeometry(), LEAF_RIM_VERT, LEAF_RIM_FRAG, true);

  return { branchMesh, leafFill, leafRim, tips };
}

function placeLabels(tips, W, H) {
  state.labelsHost.replaceChildren();
  state.labels = [];
  state.labelLit = [];

  const spots = tips.map((tip) => {
    const ox = tip.x - tip.ox;
    const oy = tip.y - tip.oy;
    const len = Math.hypot(ox, oy) || 1;
    return { x: tip.x + (ox / len) * 24, y: tip.y + (oy / len) * 24 };
  });
  const LW = 215;
  const LH = 32;
  const clampSpot = (spot) => {
    spot.x = clamp(spot.x, -W * 0.46, W * 0.46);
    spot.y = clamp(spot.y, -H * 0.44, H * 0.42);
  };
  spots.forEach(clampSpot);
  for (let pass = 0; pass < 80; pass += 1) {
    let moved = false;
    for (let a = 0; a < spots.length; a += 1) {
      for (let b = a + 1; b < spots.length; b += 1) {
        const dx = spots[b].x - spots[a].x;
        const dy = spots[b].y - spots[a].y;
        if (Math.abs(dx) >= LW || Math.abs(dy) >= LH) continue;
        moved = true;
        if (Math.abs(dx) > LW * 0.55) {
          const push = (LW - Math.abs(dx)) / 2 + 1;
          const dir = dx >= 0 ? 1 : -1;
          spots[a].x -= dir * push;
          spots[b].x += dir * push;
        } else {
          const push = (LH - Math.abs(dy)) / 2 + 1;
          const dir = dy >= 0 ? 1 : -1;
          spots[a].y -= dir * push;
          spots[b].y += dir * push;
        }
        clampSpot(spots[a]);
        clampSpot(spots[b]);
      }
    }
    if (!moved) break;
  }

  spots.forEach((spot, i) => {
    const section = state.sections[i];
    if (!section) return;
    const label = document.createElement('a');
    label.className = 'crown-label';
    label.href = `#${section.id}`;
    label.textContent = section.getAttribute('aria-label') || section.dataset.project;
    label.style.setProperty('--label-accent', section.style.getPropertyValue('--accent') || '#8fe6ae');
    label.style.left = `${clamp(((spot.x + W / 2) / W) * 100, 4, 96)}%`;
    label.style.top = `${clamp(((H / 2 - spot.y) / H) * 100, 5, 96)}%`;
    label.addEventListener('click', (event) => {
      event.preventDefault();
      section.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
    });
    state.labelsHost.appendChild(label);
    state.labels.push(label);
    state.labelLit.push(false);
  });

  // Final containment pass: a label's BOX must stay inside the stage,
  // not just its center — on a 375px phone half a label otherwise
  // hangs past the page edge and widens the document.
  for (const label of state.labels) {
    const half = label.offsetWidth / 2 + 6;
    const centerPx = (parseFloat(label.style.left) / 100) * W;
    const clamped = clamp(centerPx, half, W - half);
    if (Math.abs(clamped - centerPx) > 0.5) {
      label.style.left = `${(clamped / W) * 100}%`;
    }
  }

  // Containment can shove edge labels into each other on narrow
  // screens; settle any survivors with vertical-only pushes, which
  // cannot reintroduce the horizontal overflow.
  for (let pass = 0; pass < 30; pass += 1) {
    let moved = false;
    for (let a = 0; a < state.labels.length; a += 1) {
      for (let b = a + 1; b < state.labels.length; b += 1) {
        const A = state.labels[a];
        const B = state.labels[b];
        const ax = (parseFloat(A.style.left) / 100) * W;
        const bx = (parseFloat(B.style.left) / 100) * W;
        if (Math.abs(bx - ax) >= (A.offsetWidth + B.offsetWidth) / 2 + 8) continue;
        const ay = (parseFloat(A.style.top) / 100) * H;
        const by = (parseFloat(B.style.top) / 100) * H;
        if (Math.abs(by - ay) >= 30) continue;
        moved = true;
        const push = (30 - Math.abs(by - ay)) / 2 + 1;
        const dir = by >= ay ? 1 : -1;
        A.style.top = `${clamp(((ay - dir * push) / H) * 100, 4, 96)}%`;
        B.style.top = `${clamp(((by + dir * push) / H) * 100, 4, 96)}%`;
      }
    }
    if (!moved) break;
  }
}

function rebuild(shared) {
  const rect = state.stage.getBoundingClientRect();
  const key = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
  if (key === state.builtFor || rect.width < 10) return;
  state.builtFor = key;

  if (state.branchMesh) {
    state.group.remove(state.branchMesh, state.leafFill, state.leafRim);
    for (const mesh of [state.branchMesh, state.leafFill, state.leafRim]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }
  const { branchMesh, leafFill, leafRim, tips } = buildMeshes(shared, rect.width, rect.height);
  state.branchMesh = branchMesh;
  state.leafFill = leafFill;
  state.leafRim = leafRim;
  state.group.add(branchMesh, leafFill, leafRim);
  placeLabels(tips, rect.width, rect.height);
  state.waveStart = -1; // the reveal wave replays for the new canopy
}

function triggerLeaf(index, time) {
  const leaf = state.leafMeta[index];
  if (!leaf || leaf.born >= 0) return;
  leaf.born = time;
  for (const attr of state.bornAttrs) {
    attr.array[index] = time;
    attr.needsUpdate = true;
  }
}

export function initCrown(shared) {
  state.stage = document.querySelector('[data-crown-stage]');
  state.labelsHost = document.querySelector('[data-crown-labels]');
  if (!state.stage || !state.labelsHost) return;
  state.sections = [...document.querySelectorAll('[data-slam]')];
  state.group = new THREE.Group();
  shared.scene.add(state.group);
  rebuild(shared);
  window.addEventListener('resize', () => {
    clearTimeout(state.rebuildTimer);
    state.rebuildTimer = setTimeout(() => { rebuild(shared); shared.wake?.(); }, 160);
  }, { passive: true });
  window.addEventListener('pointermove', (event) => {
    state.pointerClient.x = event.clientX;
    state.pointerClient.y = event.clientY;
    state.pointerClient.seen = true;
  }, { passive: true });
}

export function updateCrown(shared, time) {
  if (!state.group || !state.branchMesh) return false;

  // Lit state syncs every frame — labels and uniforms must not go
  // stale while the crown is scrolled out of view.
  const lit = shared.slamState?.lit;
  if (lit) {
    let sum = 0;
    for (let i = 0; i < lit.length && i < MAX_BRANCHES; i += 1) {
      state.uniforms.uLit.value[i] = lit[i];
      sum += lit[i];
      const on = lit[i] > 0.5;
      if (state.labels[i] && on !== state.labelLit[i]) {
        state.labelLit[i] = on;
        state.labels[i].classList.toggle('is-lit', on);
      }
    }
    state.uniforms.uTrunkLit.value = clamp(sum / lit.length * 1.6, 0, 1);
  }

  const rect = state.stage.getBoundingClientRect();
  const viewH = document.documentElement.clientHeight || innerHeight;
  if (rect.bottom < -80 || rect.top > viewH + 80) {
    state.group.visible = false;
    return false;
  }
  state.group.visible = true;
  state.group.position.set(worldX(rect.left + rect.width / 2), worldY(rect.top + rect.height / 2), 1);
  state.uniforms.uTime.value = time;
  state.lastRect = rect;

  // Pointer in canopy-local coordinates, for early wakes and warmth.
  const px = state.pointerClient.x - (rect.left + rect.width / 2);
  const py = (rect.top + rect.height / 2) - state.pointerClient.y;
  const pointerInside = state.pointerClient.seen
    && state.pointerClient.x >= rect.left && state.pointerClient.x <= rect.right
    && state.pointerClient.y >= rect.top && state.pointerClient.y <= rect.bottom;
  state.leafUniforms.uPointer.value.set(px, py, pointerInside ? 1 : 0);

  // The reveal wave arms the first time the crown is seen, then rolls
  // from the canopy center outward.
  if (state.waveStart < 0) state.waveStart = time + 0.35;
  let leavesLive = false;
  const waveT = time - state.waveStart;
  for (let i = 0; i < state.leafMeta.length; i += 1) {
    const leaf = state.leafMeta[i];
    if (leaf.born < 0) {
      if (waveT >= leaf.waveDelay) {
        triggerLeaf(i, time);
        leavesLive = true;
      } else if (pointerInside) {
        // The pointer wakes sleeping leaves before the wave arrives.
        const d = Math.hypot(leaf.x - px, leaf.y - py);
        if (d < 95) {
          triggerLeaf(i, time);
          leavesLive = true;
        }
      }
    } else if (time - leaf.born < 1.5) {
      leavesLive = true; // mid-animation
    }
  }
  state.leavesLive = leavesLive;
  return true;
}

export const crownDebug = state;
