/* SDForest Three.js layer — the crown.
   A side-view tree drawn in light: trunk rising from the forest floor,
   sixteen primary branches (one per project), recursive limbs whose
   angles and thicknesses get progressively more random as they get
   smaller, down to the smallest twigs — and a canopy of beveled
   diamond leaves that live a slow cycle:

     flat 2D outline facing the screen
       → extrudes toward the viewer into a beveled 3D diamond
       → turns a full 360°
       → settles flat into the page again.

   Branches and leaves both know which project they belong to: when a
   slam fires below (shared.slamState.lit), that branch and its leaves
   wake into the project's accent color; scrolling back lets them fall
   asleep again.

   Everything is authored in local pixels around the crown-stage rect's
   center and re-anchored to it every frame, so the crown scrolls with
   the page like any other content. */

import * as THREE from '../../vendor/three/three.module.min.js';
import { clamp, lerp, makeAdditive, mulberry32, worldX, worldY, PALETTE } from './util.js';

const MAX_BRANCHES = 16;

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

const LEAF_VERT = /* glsl */`
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aPhase;
  attribute float aBranch;
  attribute float aTilt;
  uniform float uTime;
  uniform float uLit[${MAX_BRANCHES}];
  uniform vec3 uAccent[${MAX_BRANCHES}];
  varying vec3 vColor;

  void main() {
    // The leaf life cycle: mostly flat, periodically blooming into 3D
    // for a full turn, then settling back into the page.
    float u = fract(uTime / 9.0 + aPhase);
    float window = 0.34;
    float anim = u < window ? u / window : 0.0;
    float depth = sin(anim * 3.14159265) ;          // extrusion 0 -> 1 -> 0
    float spin = anim * 6.2831853;                  // one full turn

    // Local leaf space: diamond authored in xy, apexes on z.
    vec3 p = position * aScale;
    p.z *= max(depth, 0.04);

    // Rotate around the leaf's local Y (the 360 turn), then tilt.
    float cs = cos(spin), sn = sin(spin);
    p = vec3(p.x * cs + p.z * sn, p.y, -p.x * sn + p.z * cs);
    float ct = cos(aTilt), st = sin(aTilt);
    p = vec3(p.x * ct - p.y * st, p.x * st + p.y * ct, p.z);

    // Normal through the same rotations, for the bevel glint.
    vec3 n = normal;
    n.z *= sign(max(depth, 0.04));
    n = normalize(vec3(n.x * cs + n.z * sn, n.y, -n.x * sn + n.z * cs));
    n = vec3(n.x * ct - n.y * st, n.x * st + n.y * ct, n.z);
    float glint = 0.45 + 0.55 * abs(dot(n, normalize(vec3(0.25, 0.4, 0.88))));

    // Gentle canopy sway.
    vec3 world = aOffset + p;
    world.x += sin(uTime * 0.6 + aPhase * 40.0) * (2.0 + aScale * 0.35);
    world.y += cos(uTime * 0.5 + aPhase * 31.0) * 1.6;

    int index = int(aBranch + 0.5);
    float lit = uLit[index];
    vec3 sleeping = vec3(0.16, 0.24, 0.17);
    vec3 awake = uAccent[index] * 0.85 + vec3(0.12, 0.09, 0.03);
    // A blooming leaf burns brighter while it is 3D — it "comes toward" you.
    float presence = 0.30 + depth * 0.85 + lit * 0.35;
    vColor = mix(sleeping, awake, lit) * glint * presence;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`;

const LEAF_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vColor;
  void main() { gl_FragColor = vec4(vColor, 1.0); }
`;

const state = {
  stage: null,
  labelsHost: null,
  group: null,
  branchMesh: null,
  leafMesh: null,
  uniforms: null,
  labels: [],
  labelLit: [],
  builtFor: '',
  rebuildTimer: 0,
  sections: [],
};

/* Beveled diamond: 4 rim vertices in the leaf plane, front and back
   apexes on z — eight triangles, faceted normals for the glint. */
function leafGeometry() {
  const rim = [[0, 1.35, 0], [0.85, 0, 0], [0, -1.35, 0], [-0.85, 0, 0]];
  const front = [0, 0, 0.5];
  const back = [0, 0, -0.5];
  const positions = [];
  const normals = [];
  for (let i = 0; i < 4; i += 1) {
    const a = rim[i];
    const b = rim[(i + 1) % 4];
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

/* Grow the whole tree. Returns tapered-quad segments, leaf spots and
   one label anchor (tip) per primary branch. Local space: origin at
   stage center, +y up, pixels. */
function growTree(W, H, branchCount, compact) {
  const random = mulberry32(20260723);
  const segments = [];
  const leaves = [];
  const tips = [];
  const maxDepth = compact ? 3 : 4;

  function segment(ax, ay, bx, by, wa, wb, branch, flex, shade) {
    segments.push({ ax, ay, bx, by, wa, wb, branch, flex, shade });
  }

  function grow(x, y, angle, length, width, depth, branch, tip) {
    // Each limb is drawn as three slightly-bending steps, and the bend
    // budget grows as the wood gets smaller: big boughs hold their
    // line, twigs wander.
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
      // The smallest twigs — one or two hairs with a leaf at the end.
      const twigs = 1 + (random() < 0.5 ? 1 : 0);
      for (let t = 0; t < twigs; t += 1) {
        const ta = a + (random() - 0.5) * 1.3;
        const tl = 6 + random() * 13;
        const tx = cx + Math.sin(ta) * tl;
        const ty = cy + Math.cos(ta) * tl;
        segment(cx, cy, tx, ty, 1.1, 0.5, branch, (depth + 2) ** 1.6, shade * 0.9);
        leaves.push({ x: tx, y: ty, branch, r: random() });
      }
      return;
    }

    if (depth >= 1 && random() < 0.55) leaves.push({ x: cx, y: cy, branch, r: random() });

    const children = depth === 0
      ? 2 + (random() < 0.4 ? 1 : 0)
      : (random() < 0.78 ? 2 : 1);
    for (let k = 0; k < children; k += 1) {
      const side = children === 1 ? (random() < 0.5 ? -1 : 1) : (k % 2 ? -1 : 1);
      const spread = side * (0.26 + depth * 0.15) * (0.7 + random() * (0.6 + depth * 0.35));
      grow(
        cx, cy,
        a + spread - a * 0.06, // slight phototropic pull back toward up
        length * (0.58 + random() * 0.17),
        Math.max(0.8, width * (0.5 + random() * 0.14)),
        depth + 1, branch, tip,
      );
    }
  }

  // Trunk — a waver of thick light from the floor into the crown.
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
  // Root flares at the base.
  for (let r = 0; r < 5; r += 1) {
    const ra = (r / 4 - 0.5) * 2.4 + (random() - 0.5) * 0.3;
    const rl = 30 + random() * 46;
    segment(0, trunkBase, Math.sin(ra) * rl, trunkBase - Math.abs(Math.cos(ra)) * rl * 0.5 - 6, 9 + random() * 6, 1, -1, 0.2, 0.8);
  }

  // Primary branches — one per project, fanned across the side view,
  // stubs deliberately uneven in both thickness and angle.
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

  // Cap the canopy so instancing stays light.
  const cap = compact ? 220 : 420;
  while (leaves.length > cap) leaves.splice(Math.floor(random() * leaves.length), 1);

  return { segments, leaves, tips };
}

function buildMeshes(shared, W, H) {
  const compact = shared.compact();
  const count = shared.slamState?.count || MAX_BRANCHES;
  const { segments, leaves, tips } = growTree(W, H, Math.min(count, MAX_BRANCHES), compact);

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

  // Canopy: instanced beveled diamonds.
  const leafBase = leafGeometry();
  const leafGeo = new THREE.InstancedBufferGeometry();
  leafGeo.index = leafBase.index;
  leafGeo.setAttribute('position', leafBase.getAttribute('position'));
  leafGeo.setAttribute('normal', leafBase.getAttribute('normal'));
  const offsets = new Float32Array(leaves.length * 3);
  const scales = new Float32Array(leaves.length);
  const phases = new Float32Array(leaves.length);
  const branches = new Float32Array(leaves.length);
  const tilts = new Float32Array(leaves.length);
  leaves.forEach((leaf, i) => {
    offsets.set([leaf.x, leaf.y, 1], i * 3);
    scales[i] = 4.2 + leaf.r * 6.5;
    phases[i] = (leaf.r * 977.13) % 1;
    branches[i] = leaf.branch;
    tilts[i] = (leaf.r - 0.5) * 1.4;
  });
  leafGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  leafGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
  leafGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  leafGeo.setAttribute('aBranch', new THREE.InstancedBufferAttribute(branches, 1));
  leafGeo.setAttribute('aTilt', new THREE.InstancedBufferAttribute(tilts, 1));
  leafGeo.instanceCount = leaves.length;

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

  const branchMesh = new THREE.Mesh(branchGeometry, makeAdditive(new THREE.ShaderMaterial({
    vertexShader: BRANCH_VERT,
    fragmentShader: BRANCH_FRAG,
    uniforms: state.uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  })));
  const leafMesh = new THREE.Mesh(leafGeo, makeAdditive(new THREE.ShaderMaterial({
    vertexShader: LEAF_VERT,
    fragmentShader: LEAF_FRAG,
    uniforms: state.uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  })));
  branchMesh.frustumCulled = false;
  leafMesh.frustumCulled = false;
  branchMesh.renderOrder = 1;
  leafMesh.renderOrder = 1;
  return { branchMesh, leafMesh, tips };
}

function placeLabels(tips, W, H) {
  state.labelsHost.replaceChildren();
  state.labels = [];
  state.labelLit = [];

  // Anchor each label a little beyond its branch tip, then relax
  // collisions: canopy tips cluster near the top, and overlapping
  // names are worse than slightly displaced ones.
  const spots = tips.map((tip) => {
    const ox = tip.x - tip.ox;
    const oy = tip.y - tip.oy;
    const len = Math.hypot(ox, oy) || 1;
    return { x: tip.x + (ox / len) * 24, y: tip.y + (oy / len) * 24 };
  });
  // Labels are ~210px wide and ~30px tall including breathing room;
  // resolve overlaps on those extents, clamping inside the loop so the
  // stage edges cannot re-introduce a collision the last pass fixed.
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
}

function rebuild(shared) {
  const rect = state.stage.getBoundingClientRect();
  const key = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
  if (key === state.builtFor || rect.width < 10) return;
  state.builtFor = key;

  if (state.branchMesh) {
    state.group.remove(state.branchMesh, state.leafMesh);
    state.branchMesh.geometry.dispose();
    state.branchMesh.material.dispose();
    state.leafMesh.geometry.dispose();
    state.leafMesh.material.dispose();
  }
  const { branchMesh, leafMesh, tips } = buildMeshes(shared, rect.width, rect.height);
  state.branchMesh = branchMesh;
  state.leafMesh = leafMesh;
  state.group.add(branchMesh, leafMesh);
  placeLabels(tips, rect.width, rect.height);
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
  return true;
}

export const crownDebug = state;
