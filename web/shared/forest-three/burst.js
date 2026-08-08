/* SDForest Three.js layer — ambient geometric burst.
   Sparse wireframe cubes/octahedra/tetrahedra drifting in the forest dark
   around the root burst. Cursor proximity triggers the choreography:
   colorize to a palette accent, fade in, 360° spin on two axes while
   scaling up and back, flatten to a 2D plane, vanish, respawn elsewhere.
   Restyled after the design references: smaller, dimmer and rarer than
   the first iteration — the roots are the show, these are fireflies.

   Faces: 3 InstancedMeshes (per-instance color doubles as brightness).
   Edges: ONE merged LineSegments rebuilt on the CPU each frame. */

import * as THREE from '../../vendor/three/three.module.min.js';
import { lerp, easeInOutCubic, makeAdditive, PALETTE } from './util.js?v=20260807a';

const ACCENTS = [
  PALETTE.amber, PALETTE.gold, PALETTE.green, PALETTE.green,
  PALETTE.teal, PALETTE.blue, PALETTE.violet, PALETTE.rose,
];
const COUNT = 18;
const IDLE_COLOR = new THREE.Color('#8fa896');

const state = { shapes: [], meshes: [], edges: null, landing: null, sigil: null };

const TYPES = [
  () => new THREE.BoxGeometry(1, 1, 1),
  () => new THREE.OctahedronGeometry(0.72, 0),
  () => new THREE.TetrahedronGeometry(0.85, 0),
];

// Spawn in the forest periphery: outside the title column AND outside the
// root burst's core so the fireflies never crowd the centerpiece.
function spawnPosition(random) {
  const margin = 50;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const x = margin + random() * (innerWidth - margin * 2);
    const y = 40 + random() * (innerHeight * 0.92);
    const cx = innerWidth / 2;
    if (Math.abs(x - cx) < innerWidth * 0.24 && y > innerHeight * 0.18 && y < innerHeight * 0.8) continue;
    if (Math.hypot(x - cx, y - innerHeight * 0.42) < Math.min(innerWidth, innerHeight) * 0.22) continue;
    return { x, y };
  }
  return { x: margin, y: margin };
}

export function initBurst(shared) {
  state.landing = document.querySelector('.landing');
  const faceMaterial = makeAdditive(new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  const perType = Math.ceil(COUNT / TYPES.length);
  let edgeVertexTotal = 0;
  TYPES.forEach((makeGeometry, typeIndex) => {
    const geometry = makeGeometry();
    const mesh = new THREE.InstancedMesh(geometry, faceMaterial.clone(), perType);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    shared.scene.add(mesh);
    state.meshes.push(mesh);
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const baseEdges = Array.from(edgeGeometry.attributes.position.array);
    edgeGeometry.dispose();
    let used = 0;
    for (let i = 0; i < perType && state.shapes.length < COUNT; i += 1) {
      used += 1;
      state.shapes.push({
        typeIndex,
        instanceIndex: i,
        baseEdges,
        local: spawnPosition(Math.random),
        size: 11 + Math.random() * 19,
        drift: Math.random() * Math.PI * 2,
        accent: new THREE.Color(ACCENTS[Math.floor(Math.random() * ACCENTS.length)]),
        spinAxis: new THREE.Vector3().randomDirection(),
        spinAxis2: new THREE.Vector3().randomDirection(),
        state: 'idle',
        t: Math.random() * 5,
        cooldown: 0,
      });
      edgeVertexTotal += baseEdges.length / 3;
    }
    // COUNT rarely divides evenly; an untouched instance would render as
    // an identity-matrix artifact at screen center.
    mesh.count = used;
  });
  const edgePositions = new Float32Array(edgeVertexTotal * 3);
  const edgeColors = new Float32Array(edgeVertexTotal * 3);
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3).setUsage(THREE.DynamicDrawUsage));
  edgeGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3).setUsage(THREE.DynamicDrawUsage));
  state.edges = new THREE.LineSegments(edgeGeometry, makeAdditive(new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  })));
  state.edges.frustumCulled = false;
  state.edges.renderOrder = 1;
  shared.scene.add(state.edges);
}

// Spawn coordinates are viewport-relative; after a resize or orientation
// change, resting shapes could sit outside the reachable area forever.
export function respawnBurst() {
  for (const shape of state.shapes) {
    if (shape.state !== 'act') shape.local = spawnPosition(Math.random);
  }
}

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const quat2 = new THREE.Quaternion();
const scale = new THREE.Vector3();
const position = new THREE.Vector3();
const color = new THREE.Color();
const faceColor = new THREE.Color();
const vec = new THREE.Vector3();

export function updateBurst(shared, time, dt) {
  const rect = state.landing.getBoundingClientRect();
  if (rect.bottom < -80) {
    state.meshes.forEach((mesh) => { mesh.visible = false; });
    state.edges.visible = false;
    return false;
  }
  state.meshes.forEach((mesh) => { mesh.visible = true; });
  state.edges.visible = true;

  const pointer = shared.pointer;
  const edgePositions = state.edges.geometry.attributes.position.array;
  const edgeColors = state.edges.geometry.attributes.color.array;
  let edgeCursor = 0;

  for (const shape of state.shapes) {
    shape.t += dt;
    // Pinned to the landing section so they scroll away with it.
    const sx = shape.local.x + Math.sin(time * 0.4 + shape.drift) * 12;
    const sy = rect.top + shape.local.y + Math.cos(time * 0.33 + shape.drift * 1.7) * 9;

    let brightness = 0.07;
    let scaleAll = 1;
    let flat = 1;
    let extraRotation = 0;
    color.copy(IDLE_COLOR);

    if (shape.state === 'idle') {
      shape.cooldown = Math.max(0, shape.cooldown - dt);
      const distance = pointer.seen ? Math.hypot(pointer.x - sx, pointer.y - sy) : Infinity;
      if (distance < 120 && shape.cooldown === 0) {
        shape.state = 'act';
        shape.t = 0;
      }
      brightness = 0.07 + Math.sin(time * 1.3 + shape.drift) * 0.03;
    } else if (shape.state === 'act') {
      const IGNITE = 0.2, SPIN = 1.0, FLATTEN = 0.3, FADE = 0.24;
      const t = shape.t;
      if (t < IGNITE) {
        const k = t / IGNITE;
        color.copy(IDLE_COLOR).lerp(shape.accent, k);
        brightness = lerp(0.07, 1, k);
      } else if (t < IGNITE + SPIN) {
        const k = easeInOutCubic((t - IGNITE) / SPIN);
        color.copy(shape.accent);
        brightness = 1;
        extraRotation = k * Math.PI * 2;
        scaleAll = 1 + Math.sin(k * Math.PI) * 0.62;
      } else if (t < IGNITE + SPIN + FLATTEN) {
        const k = (t - IGNITE - SPIN) / FLATTEN;
        color.copy(shape.accent);
        brightness = 1;
        extraRotation = Math.PI * 2;
        flat = 1 - easeInOutCubic(k) * 0.985;
      } else if (t < IGNITE + SPIN + FLATTEN + FADE) {
        const k = (t - IGNITE - SPIN - FLATTEN) / FADE;
        color.copy(shape.accent);
        brightness = 1 - k;
        extraRotation = Math.PI * 2;
        flat = 0.015;
      } else {
        shape.state = 'gone';
        shape.t = 0;
        shape.respawnDelay = 1.6 + Math.random() * 2.8;
      }
    } else if (shape.state === 'gone') {
      brightness = 0;
      if (shape.t > shape.respawnDelay) {
        shape.local = spawnPosition(Math.random);
        shape.accent.set(ACCENTS[Math.floor(Math.random() * ACCENTS.length)]);
        shape.spinAxis.randomDirection();
        shape.spinAxis2.randomDirection();
        shape.state = 'idle';
        shape.t = 0;
        shape.cooldown = 0.6;
      }
    }

    position.set(sx - innerWidth / 2, innerHeight / 2 - sy, -40);
    const idleSpin = time * 0.22 + shape.drift;
    quat.setFromAxisAngle(shape.spinAxis, idleSpin + extraRotation);
    quat2.setFromAxisAngle(shape.spinAxis2, extraRotation * 0.85);
    quat.multiply(quat2);
    scale.set(shape.size * scaleAll, shape.size * scaleAll, shape.size * scaleAll * flat);
    matrix.compose(position, quat, scale);

    const mesh = state.meshes[shape.typeIndex];
    mesh.setMatrixAt(shape.instanceIndex, matrix);
    // Face brightness runs dimmer than edges so shapes read as glass.
    faceColor.copy(color).multiplyScalar(brightness * 0.14);
    mesh.setColorAt(shape.instanceIndex, faceColor);

    const base = shape.baseEdges;
    const r = color.r * brightness, g = color.g * brightness, b = color.b * brightness;
    for (let i = 0; i < base.length; i += 3) {
      vec.set(base[i], base[i + 1], base[i + 2]).applyMatrix4(matrix);
      edgePositions[edgeCursor] = vec.x;
      edgeColors[edgeCursor] = r;
      edgePositions[edgeCursor + 1] = vec.y;
      edgeColors[edgeCursor + 1] = g;
      edgePositions[edgeCursor + 2] = vec.z;
      edgeColors[edgeCursor + 2] = b;
      edgeCursor += 3;
    }
  }

  state.meshes.forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  state.edges.geometry.attributes.position.needsUpdate = true;
  state.edges.geometry.attributes.color.needsUpdate = true;
  return true;
}

export const burstDebug = state;
