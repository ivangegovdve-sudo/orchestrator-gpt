/* SDForest Three.js layer — the living root burst.
   An organic mycelium of light radiating from the forest sigil: recursive
   root filaments (amber at the heart, green at the growing tips) with a
   field of spore particles drifting along them. The whole system awakens
   on load (roots grow outward), bends toward the pointer (uMouse), and
   carries light pulses outward on click (uClick).

   Authored in unit space (reach = 1) and scaled to pixels every frame, so
   viewport resizes cost nothing and the skeleton is deterministic. */

import * as THREE from '../../vendor/three/three.module.min.js';
import { clamp, lerp, easeOutCubic, makeAdditive, mulberry32, PALETTE } from './util.js';

const CORE = new THREE.Color(PALETTE.amber);
const TIP = new THREE.Color(PALETTE.green);
const GROW_SECONDS = 3.8;

const state = {
  group: null,
  lines: null,
  points: null,
  segments: [],        // sorted by distance from origin (growth order)
  maxDist: 1,
  particles: [],
  pulses: [],          // { start } — light waves travelling outward
  bootTime: -1,
  landing: null,
  sigil: null,
  particleUniforms: null,
  scratch: new THREE.Vector3(),
  // Settle bookkeeping: once the grow-in has finished and nothing is
  // touching the system, stop rewriting buffers entirely. The last frame
  // stays on the canvas and the whole loop sleeps — a hero at rest costs
  // nothing. Any of these bring it back: pointer nearby, a click pulse,
  // or the page scrolling (the roots are positioned from a client rect,
  // so a moved origin must be redrawn).
  lastOriginY: NaN,
  lastOriginX: NaN,
  settled: false,
  painted: false,
};

const POINTER_REACH = 0.5;          // unit space
const POINTER_REACH_SQ = POINTER_REACH * POINTER_REACH;

function buildSkeleton(random, coarse) {
  const segments = [];
  // Depth is the expensive dial, not the primary count: each extra level
  // roughly doubles the segment total, and every segment costs two vertex
  // rewrites per frame on the main thread. 5/4 produced 1317 segments
  // (2634 vertex writes a frame) which is what stuttered on mid-tier
  // phones; 4/3 lands near 630/360 for the same silhouette.
  const depthMax = coarse ? 3 : 4;
  const primaries = coarse ? 8 : 10;

  function grow(x, y, z, angle, tilt, length, depth, dist) {
    // Each filament is a chain of short wandering sub-segments — a
    // curving hypha, not a straight geometric spoke. (Straight spokes
    // read as a second tree behind the title; Ivan retired that once.)
    const steps = 3;
    const step = length / steps;
    let cx = x;
    let cy = y;
    let cz = z;
    let a = angle;
    let d = dist;
    for (let s = 0; s < steps; s += 1) {
      a += (random() - 0.5) * (0.34 + depth * 0.1);
      const nx = cx + Math.cos(a) * step;
      const ny = cy + Math.sin(a) * step;
      const nz = cz + tilt * step * 0.35;
      segments.push({
        a: [cx, cy, cz], b: [nx, ny, nz], depth,
        distA: d, distB: d + step,
        phase: random() * Math.PI * 2,
        swayDir: [Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2)],
      });
      cx = nx;
      cy = ny;
      cz = nz;
      d += step;
    }
    if (depth >= depthMax) return;
    const children = depth === 0 ? 2 : (random() < 0.78 ? 2 : 1);
    for (let k = 0; k < children; k += 1) {
      const spread = (k === 0 ? 1 : -1) * (0.28 + random() * 0.38);
      grow(cx, cy, cz, a + spread + (random() - 0.5) * 0.2, (random() - 0.5) * 0.7,
        length * (0.6 + random() * 0.12), depth + 1, d);
    }
  }

  for (let i = 0; i < primaries; i += 1) {
    // Even fan for coverage, but heavily jittered — a clean radial
    // spacing reads as a flower of spokes.
    const angle = (i / primaries) * Math.PI * 2 + (random() - 0.5) * 1.15;
    // Primaries begin at scattered offsets around the seed, never at a
    // single convergence point — one shared origin reads as a starburst.
    const r0 = 0.05 + random() * 0.13;
    grow(Math.cos(angle) * r0, Math.sin(angle) * r0, (random() - 0.5) * 0.1,
      angle, (random() - 0.5) * 0.6, 0.28 + random() * 0.09, 0, 0);
  }
  // Growth order: outward from the seed, so drawRange = the forest waking.
  segments.sort((s, t) => s.distA - t.distA);
  return segments;
}

const PARTICLE_VERT = /* glsl */`
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uPointScale; // devicePixelRatio * camera distance
  varying float vSeed;
  varying vec3 vColor;
  void main() {
    vSeed = aSeed;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (uPointScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime, uMaster;
  varying float vSeed;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float falloff = 1.0 - smoothstep(0.1, 0.5, length(c));
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + vSeed * 2.4) + vSeed * 40.0);
    gl_FragColor = vec4(vColor * falloff * twinkle * uMaster, 1.0);
  }
`;

export function initRoots(shared, coarse) {
  state.landing = document.querySelector('.landing');
  state.sigil = document.querySelector('.forest-sigil');
  if (!state.landing) return;

  const random = mulberry32(20260714);
  state.segments = buildSkeleton(random, coarse);
  state.maxDist = state.segments.reduce((m, s) => Math.max(m, s.distB), 1);

  const group = new THREE.Group();
  group.renderOrder = 0;
  state.group = group;

  // --- root filaments: one LineSegments, positions + colors rewritten
  // each frame (sway, pointer bend, pulse light). ~600 vertices — cheap.
  const vertCount = state.segments.length * 2;
  const linePositions = new Float32Array(vertCount * 3);
  const lineColors = new Float32Array(vertCount * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));
  state.lines = new THREE.LineSegments(lineGeo, makeAdditive(new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })));
  state.lines.frustumCulled = false;
  group.add(state.lines);

  // --- spore particles drifting outward along the filaments. A quarter
  // are "embers": bigger, warmer, packed near the seed so the core reads
  // as the hot heart of the burst.
  const particleCount = coarse ? 200 : 420;
  const pPositions = new Float32Array(particleCount * 3);
  const pSizes = new Float32Array(particleCount);
  const pSeeds = new Float32Array(particleCount);
  const pColors = new Float32Array(particleCount * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < particleCount; i += 1) {
    const ember = i % 4 === 0;
    const pick = ember ? (random() ** 2.2) : (random() ** 0.55);
    const segIndex = Math.min(state.segments.length - 1, Math.floor(pick * state.segments.length));
    state.particles.push({
      segIndex,
      u: random(),
      speed: 0.05 + random() * 0.12,
      orbit: random() * Math.PI * 2,
      orbitR: ember ? 0.008 + random() * 0.03 : 0.012 + random() * 0.05,
    });
    pSizes[i] = ember ? 2.4 + random() * 3.2 : 1.6 + random() * 2.4;
    pSeeds[i] = random();
    tint.copy(CORE).lerp(TIP, ember ? random() * 0.25 : random());
    pColors[i * 3] = tint.r; pColors[i * 3 + 1] = tint.g; pColors[i * 3 + 2] = tint.b;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeeds, 1));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(pColors, 3));
  state.particleUniforms = { uTime: { value: 0 }, uMaster: { value: 0 }, uPointScale: { value: 1300 } };
  state.points = new THREE.Points(pGeo, makeAdditive(new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    uniforms: state.particleUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })));
  state.points.frustumCulled = false;
  group.add(state.points);

  // Hot core: a radial glow sprite at the seed fakes bloom — the burst
  // needs a bright golden heart, not just hairline filaments.
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const glowCtx = glowCanvas.getContext('2d');
  const gradient = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
  gradient.addColorStop(0.25, 'rgba(255, 196, 96, 0.32)');
  gradient.addColorStop(0.6, 'rgba(150, 220, 140, 0.08)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  glowCtx.fillStyle = gradient;
  glowCtx.fillRect(0, 0, 128, 128);
  state.glow = new THREE.Sprite(makeAdditive(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(glowCanvas),
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })));
  state.glow.scale.set(0.34, 0.34, 1);
  group.add(state.glow);

  shared.scene.add(group);

  // uClick: a pulse of light races outward along the roots.
  window.addEventListener('pointerdown', (event) => {
    if (!state.group || !state.group.visible) return;
    const rect = state.landing.getBoundingClientRect();
    if (event.clientY > rect.bottom) return;
    if (state.pulses.length < 4) state.pulses.push({ start: -1 });
  }, { passive: true });
}

export function updateRoots(shared, time, dt) {
  if (!state.group) return false;
  const rect = state.landing.getBoundingClientRect();
  if (rect.bottom < -60) {
    state.group.visible = false;
    state.painted = false;
    return false;
  }
  state.group.visible = true;
  if (state.bootTime < 0) state.bootTime = time;

  // Origin: the sigil is the seed the forest sprouts from.
  const sigilRect = state.sigil ? state.sigil.getBoundingClientRect() : rect;
  const originX = sigilRect.left + sigilRect.width / 2;
  const originY = sigilRect.top + sigilRect.height / 2;
  const reach = Math.min(innerWidth, innerHeight) * 0.46;
  state.group.position.set(originX - innerWidth / 2, innerHeight / 2 - originY, -60);
  state.group.scale.setScalar(reach);

  const grow = easeOutCubic(clamp((time - state.bootTime) / GROW_SECONDS, 0, 1));

  // Pointer in unit space (uMouse bends roots, attracts particles).
  const pointer = shared.pointer;
  const px = pointer.seen ? (pointer.x - originX) / reach : 1e6;
  const py = pointer.seen ? -(pointer.y - originY) / reach : 1e6;

  /* --- settle gate ---------------------------------------------------
     Is there any reason to redraw this frame? Growing, a live pulse, a
     pointer within reach of the field, or an origin that has moved
     because the page scrolled or resized. If none hold, leave the last
     frame standing and do no work at all. */
  const originMoved = originX !== state.lastOriginX || originY !== state.lastOriginY;
  const pointerNear = pointer.seen
    && Math.abs(px) < POINTER_REACH + 1 && Math.abs(py) < POINTER_REACH + 1;
  const needsFrame = grow < 1 || state.pulses.length > 0 || pointerNear || originMoved;
  state.lastOriginX = originX;
  state.lastOriginY = originY;

  if (!needsFrame) {
    state.settled = true;
    state.painted = true;
    return false; // painted, but asleep — forest-three.js must not clear
  }
  state.settled = false;
  state.painted = true;

  // Advance pulses (uClick) — a wave of brightness by distance-from-seed.
  for (const pulse of state.pulses) {
    if (pulse.start < 0) pulse.start = time;
    pulse.r = (time - pulse.start) * 1.5;
  }
  state.pulses = state.pulses.filter((pulse) => pulse.r === undefined || pulse.r < 1.5);

  // --- filaments: sway + bend + light -------------------------------
  const positions = state.lines.geometry.attributes.position.array;
  const colors = state.lines.geometry.attributes.color.array;
  const segments = state.segments;
  let drawVerts = 0;
  const growDist = grow * state.maxDist;
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    if (seg.distA <= growDist) drawVerts += 2;
    const sway = Math.sin(time * (0.5 + seg.depth * 0.22) + seg.phase);
    const amp = 0.004 + seg.depth * 0.007;
    for (let end = 0; end < 2; end += 1) {
      const p = end ? seg.b : seg.a;
      const swayK = end ? 1 : 0.55; // tips travel further than anchors
      let x = p[0] + seg.swayDir[0] * sway * amp * swayK;
      let y = p[1] + seg.swayDir[1] * sway * amp * swayK;
      // Squared compare first: almost every vertex is out of reach, and
      // this loop runs twice per segment per frame — the sqrt is only
      // worth paying for the few that are actually near the pointer.
      const dxp = px - x, dyp = py - y;
      const d2 = dxp * dxp + dyp * dyp;
      let dp = Infinity;
      if (d2 < POINTER_REACH_SQ) {
        dp = Math.sqrt(d2);
        const pull = ((1 - dp / POINTER_REACH) ** 2) * 0.1 * (0.4 + seg.depth * 0.2);
        x += dxp * pull;
        y += dyp * pull;
      }
      const o = (i * 2 + end) * 3;
      positions[o] = x;
      positions[o + 1] = y;
      positions[o + 2] = p[2];

      const dist = end ? seg.distB : seg.distA;
      const tipMix = clamp(dist / state.maxDist, 0, 1);
      // Base: candlelight at the root, barely-there at the tips —
      // kept low so the mycelium reads half-seen, never a second tree.
      let bright = 0.065 + (1 - tipMix) * 0.1 + Math.sin(time * 1.7 + seg.phase) * 0.03;
      // Growth front glows as it passes (keep the birth moment legible).
      const frontD = Math.abs(dist - growDist);
      if (grow < 1 && frontD < 0.12) bright += (1 - frontD / 0.12) * 0.65;
      for (const pulse of state.pulses) {
        const d = Math.abs(dist - pulse.r);
        if (d < 0.1) bright += (1 - d / 0.1) * 0.75 * (1 - pulse.r / 1.5);
      }
      // Pointer proximity lights the filament it bends.
      if (dp < POINTER_REACH) bright += ((1 - dp / POINTER_REACH) ** 2) * 0.42;
      const r = lerp(CORE.r, TIP.r, tipMix) * bright;
      const g = lerp(CORE.g, TIP.g, tipMix) * bright;
      const b = lerp(CORE.b, TIP.b, tipMix) * bright;
      colors[o] = r; colors[o + 1] = g; colors[o + 2] = b;
    }
  }
  state.lines.geometry.setDrawRange(0, drawVerts);
  state.lines.geometry.attributes.position.needsUpdate = true;
  state.lines.geometry.attributes.color.needsUpdate = true;

  // --- particles: drift outward along their segment, orbit it loosely,
  // and fly toward the pointer when it comes close.
  const pArray = state.points.geometry.attributes.position.array;
  for (let i = 0; i < state.particles.length; i += 1) {
    const particle = state.particles[i];
    const seg = segments[particle.segIndex];
    particle.u = (particle.u + dt * particle.speed) % 1;
    const u = particle.u;
    let x = lerp(seg.a[0], seg.b[0], u);
    let y = lerp(seg.a[1], seg.b[1], u);
    const z = lerp(seg.a[2], seg.b[2], u);
    const orbit = time * 0.7 + particle.orbit;
    x += Math.sin(orbit) * particle.orbitR;
    y += Math.cos(orbit * 0.83) * particle.orbitR;
    const dxp = px - x, dyp = py - y;
    const d2 = dxp * dxp + dyp * dyp;
    if (d2 < 0.16) {
      const pull = ((1 - Math.sqrt(d2) / 0.4) ** 2) * 0.28;
      x += dxp * pull;
      y += dyp * pull;
    }
    const o = i * 3;
    pArray[o] = x; pArray[o + 1] = y; pArray[o + 2] = z;
  }
  state.points.geometry.attributes.position.needsUpdate = true;
  state.particleUniforms.uTime.value = time;
  state.particleUniforms.uMaster.value = grow * 0.38;
  state.particleUniforms.uPointScale.value = shared.pointScale || 1300;

  // The heart breathes; pulses and the growth intro flare it.
  let glowBoost = 0;
  for (const pulse of state.pulses) glowBoost = Math.max(glowBoost, (1 - pulse.r / 1.5) * 0.5);
  state.glow.material.opacity = grow * (0.12 + Math.sin(time * 1.1) * 0.03 + glowBoost * 0.55);

  return true;
}

// Anything mid-flight (growth intro, pulses) keeps the loop awake.
export const rootsAnimating = () => Boolean(state.group && state.group.visible && !state.settled);

/* True while the roots' pixels are on the canvas — including while they
   are settled and asking for no frames. The frame loop reads this so it
   clears the canvas only when the field is genuinely gone, never when it
   has merely gone quiet. */
export const rootsPainted = () => state.painted;

export const rootsDebug = state;
