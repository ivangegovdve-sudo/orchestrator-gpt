/* SDForest Three.js layer — assembly panels growing from roots.
   Two effects, both velocity-reactive (poolside.ai-style):

   1. Fill planes tracking each DOM panel's rect: an organic dendritic
      front creeps across the panel as it assembles — noise-perturbed
      growth edge, vein filaments along the growth axis, creeping tips
      ahead of the front. Scroll velocity widens and brightens the
      growth; a hard fling fires a shockwave from the panel's outer edge.
   2. Root strands: filaments of light climbing from the bottom of the
      viewport into each arriving panel — the lattice literally grows
      out of the forest floor while assembling, then the strands fade
      once the panels are seated.

   The panels themselves stay interactive DOM; CSS transforms driven by
   --assembly/--assembly-e move them, this module only paints light. */

import * as THREE from '../../vendor/three/three.module.min.js';
import { clamp, lerp, makeAdditive, mulberry32, worldX, worldY, PALETTE } from './util.js?v=20260729b';

const FILL_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// uSide: -1 board (arrives from the left), +1 preview (from the right).
// Growth enters from each panel's OUTER edge and creeps toward its seat.
const FILL_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime, uProgress, uVel, uImpact, uSide;
  uniform vec2 uSize;
  uniform vec3 uAccent;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // 0 at the outer edge the panel arrives from, 1 at its seat.
    float axis = uSide > 0.0 ? 1.0 - vUv.x : vUv.x;

    // Organic growth front: the fill edge is warped by noise so it creeps
    // like roots, not like a wipe. Velocity feeds the warp's liveliness.
    float grain = fbm(vUv * vec2(5.0, 8.0) + uTime * 0.12);
    float front = uProgress * 1.22 + uImpact * 0.2 - axis - (grain - 0.5) * 0.4;
    float filled = smoothstep(0.0, 0.3, front);

    // Thin root filaments (ridged noise) running along the growth axis.
    // They glow in a band near the front and cool down behind it, so the
    // light travels with the growth instead of washing the whole panel.
    float ridge = 1.0 - abs(2.0 * fbm(vec2(vUv.y * 26.0, vUv.x * 5.0 - uTime * 0.06)) - 1.0);
    float veins = pow(ridge, 9.0);
    float cooling = exp(-max(front, 0.0) * 2.6);

    // Creeping root tips just ahead of the front.
    float tips = smoothstep(-0.12, 0.0, front) * (1.0 - filled)
      * pow(fbm(vUv * vec2(11.0, 16.0) + 7.3), 3.0) * 1.8;

    // Bright growth edge — sharper when slow, wider + hotter when fast.
    float edge = exp(-abs(front) * (9.0 - uVel * 4.0)) * (0.3 + uVel * 1.3 + uImpact * 1.0);

    // The panel's rim traced by light while it assembles.
    vec2 px = vUv * uSize;
    float edgeDist = min(min(px.x, uSize.x - px.x), min(px.y, uSize.y - px.y));
    float border = exp(-edgeDist * 0.5) * filled * (0.35 + uVel * 0.5);

    // Impact shockwave: a ring radiating from the outer edge midpoint.
    vec2 origin = vec2(uSide > 0.0 ? uSize.x : 0.0, uSize.y * 0.5);
    float dist = distance(px, origin);
    float ringRadius = (1.0 - uImpact) * (uSize.x * 1.35);
    float ring = exp(-abs(dist - ringRadius) * 0.02) * uImpact * 0.6;

    vec3 col = uAccent * (
      edge * 1.1
      + filled * veins * cooling * (0.5 + uVel * 0.5)
      + tips * (0.3 + uImpact * 0.5)
      + border
      + ring
    );

    // Master fade: strongest while assembling; after seating, scroll
    // energy only whispers over the panels instead of washing them.
    float master = clamp((1.0 - uProgress) * 1.25 + uVel * 0.4 + uImpact * 0.35, 0.0, 1.0);
    master *= smoothstep(0.0, 0.04, uProgress);
    gl_FragColor = vec4(col * master, 1.0);
  }
`;

const STRANDS_PER_PANEL = 6;
const STRAND_POINTS = 14;
const CORE = new THREE.Color(PALETTE.amber);
const TIP = new THREE.Color(PALETTE.green);

const state = { panels: [], assembly: null };

export function initPanels(shared) {
  state.assembly = document.querySelector('[data-assembly]');
  const board = document.querySelector('.portal-board');
  const stage = document.querySelector('[data-preview-stage]');
  const random = mulberry32(4321);

  [[board, -1], [stage, 1]].forEach(([element, side]) => {
    const material = makeAdditive(new THREE.ShaderMaterial({
      vertexShader: FILL_VERT,
      fragmentShader: FILL_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uVel: { value: 0 },
        uImpact: { value: 0 },
        uSide: { value: side },
        uSize: { value: new THREE.Vector2(1, 1) },
        uAccent: { value: new THREE.Color(PALETTE.green) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.visible = false;
    mesh.renderOrder = 2;
    shared.scene.add(mesh);

    // Root strands: quadratic beziers rebuilt each frame from the forest
    // floor (bottom-center of the viewport) up into the moving panel.
    const strandMeta = [];
    for (let s = 0; s < STRANDS_PER_PANEL; s += 1) {
      strandMeta.push({
        edgeT: 0.15 + (s / (STRANDS_PER_PANEL - 1)) * 0.7 + (random() - 0.5) * 0.08,
        sway: 30 + random() * 60,
        phase: random() * Math.PI * 2,
        rootX: (random() - 0.5) * 0.3, // fraction of viewport width off center
      });
    }
    const vertCount = STRANDS_PER_PANEL * (STRAND_POINTS - 1) * 2;
    const positions = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    const strands = new THREE.LineSegments(geometry, makeAdditive(new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })));
    strands.visible = false;
    strands.frustumCulled = false;
    strands.renderOrder = 2;
    shared.scene.add(strands);

    state.panels.push({ element, side, mesh, material, strands, strandMeta });
  });
}

function updateStrands(panel, rect, scroll, time) {
  // Strands live only while the panel travels: they grow with progress
  // and dissolve once seated (progress ~1 with no scroll energy).
  const master = clamp((1 - scroll.eased) * 1.6 + scroll.vNorm * 0.5, 0, 1)
    * clamp(scroll.eased * 3, 0, 1);
  if (master < 0.02) {
    panel.strands.visible = false;
    return;
  }
  panel.strands.visible = true;
  const positions = panel.strands.geometry.attributes.position.array;
  const colors = panel.strands.geometry.attributes.color.array;
  const grow = clamp(scroll.eased * 1.15, 0, 1);
  let cursor = 0;
  for (const meta of panel.strandMeta) {
    // Forest floor anchor -> panel's bottom edge, leaning to its arrival side.
    const ax = innerWidth / 2 + meta.rootX * innerWidth;
    const ay = innerHeight + 8;
    const bx = rect.left + rect.width * meta.edgeT;
    const by = rect.bottom - 6;
    const cx2 = (ax + bx) / 2 + Math.sin(time * 0.7 + meta.phase) * meta.sway;
    const cy2 = (ay + by) / 2 + 40;
    let prevX = 0, prevY = 0;
    for (let p = 0; p < STRAND_POINTS; p += 1) {
      const u = (p / (STRAND_POINTS - 1)) * grow;
      const inv = 1 - u;
      const x = inv * inv * ax + 2 * inv * u * cx2 + u * u * bx;
      const y = inv * inv * ay + 2 * inv * u * cy2 + u * u * by;
      if (p > 0) {
        const bright = master * (0.25 + u * 0.5 + Math.sin(time * 2 + meta.phase + u * 6) * 0.12);
        const r = lerp(CORE.r, TIP.r, u) * bright;
        const g = lerp(CORE.g, TIP.g, u) * bright;
        const b = lerp(CORE.b, TIP.b, u) * bright;
        positions[cursor] = worldX(prevX); colors[cursor] = r;
        positions[cursor + 1] = worldY(prevY); colors[cursor + 1] = g;
        positions[cursor + 2] = 1; colors[cursor + 2] = b;
        positions[cursor + 3] = worldX(x); colors[cursor + 3] = r;
        positions[cursor + 4] = worldY(y); colors[cursor + 4] = g;
        positions[cursor + 5] = 1; colors[cursor + 5] = b;
        cursor += 6;
      }
      prevX = x; prevY = y;
    }
  }
  panel.strands.geometry.attributes.position.needsUpdate = true;
  panel.strands.geometry.attributes.color.needsUpdate = true;
}

export function updatePanels(shared, time) {
  const scroll = shared.scroll;
  const active = !shared.compact()
    && scroll.eased > 0.001
    && (scroll.current < 0.999 || scroll.vNorm > 0.02 || scroll.impact > 0.02);
  let visible = false;
  for (const panel of state.panels) {
    if (!active) {
      panel.mesh.visible = false;
      panel.strands.visible = false;
      continue;
    }
    const rect = panel.element.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || rect.width < 2) {
      panel.mesh.visible = false;
      panel.strands.visible = false;
      continue;
    }
    panel.mesh.visible = true;
    visible = true;
    panel.mesh.position.set(worldX(rect.left + rect.width / 2), worldY(rect.top + rect.height / 2), 2);
    panel.mesh.scale.set(rect.width, rect.height, 1);
    const u = panel.material.uniforms;
    u.uTime.value = time;
    u.uProgress.value = clamp(scroll.eased, 0, 1.2);
    u.uVel.value = scroll.vNorm;
    u.uImpact.value = scroll.impact;
    u.uSize.value.set(rect.width, rect.height);
    const accent = panel.side > 0
      ? getComputedStyle(panel.element).getPropertyValue('--preview-accent').trim() || PALETTE.green
      : PALETTE.green;
    u.uAccent.value.set(accent);

    updateStrands(panel, rect, scroll, time);
  }
  return visible;
}

export const panelsDebug = state;
