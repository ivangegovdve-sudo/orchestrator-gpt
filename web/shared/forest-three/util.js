/* SDForest Three.js layer — shared helpers.
   Everything here is stateless; effect modules import what they need. */

import * as THREE from '../../vendor/three/three.module.min.js';

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutBack = (t) => 1 + 2.7 * ((t - 1) ** 3) + 1.7 * ((t - 1) ** 2);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
export const easeOutCubic = (t) => 1 - ((1 - t) ** 3);

// Screen px -> world units (camera is calibrated 1 world unit = 1 CSS px).
export const worldX = (px) => px - innerWidth / 2;
export const worldY = (px) => innerHeight / 2 - px;

// The forest-of-light palette: warm gold at the core of living things,
// the site's green at their growing tips.
export const PALETTE = {
  amber: '#ffd15a',
  gold: '#ffc258',
  green: '#79f2a8',
  teal: '#70eade',
  blue: '#7ee2ff',
  violet: '#a282ff',
  rose: '#ff7fb0',
  cyan: '#51ebff',
};

// Additive-over-DOM blending: identical RGB math to THREE.AdditiveBlending
// (src.rgb * src.a added onto the buffer) but the alpha channel is never
// written. The canvas stays fully transparent (premultiplied alpha 0 +
// positive RGB = pure added light), so a dark fragment can never composite
// as an opaque black rectangle over the DOM behind it.
export function makeAdditive(material) {
  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  material.blendSrc = THREE.SrcAlphaFactor;
  material.blendDst = THREE.OneFactor;
  material.blendEquationAlpha = THREE.AddEquation;
  material.blendSrcAlpha = THREE.ZeroFactor;
  material.blendDstAlpha = THREE.OneFactor;
  return material;
}

// Deterministic RNG (same generator forest-motion.js uses) so root systems
// and particle fields look identical on every load.
export function mulberry32(seed) {
  let value = seed | 0;
  return function seededRandom() {
    value = (value + 0x6D2B79F5) | 0;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

// Line-geometry authoring helper used by every wireframe builder.
export const lineBuilder = () => {
  const positions = [];
  return {
    positions,
    line(ax, ay, az, bx, by, bz) { positions.push(ax, ay, az, bx, by, bz); },
    polyline(points, close = false) {
      for (let i = 0; i < points.length - 1; i += 1) {
        positions.push(...points[i], ...points[i + 1]);
      }
      if (close && points.length > 2) {
        positions.push(...points[points.length - 1], ...points[0]);
      }
    },
    circle(radius, segments, cx = 0, cy = 0, cz = 0, plane = 'xy', arc = Math.PI * 2, start = 0) {
      const points = [];
      for (let i = 0; i <= segments; i += 1) {
        const a = start + (i / segments) * arc;
        const u = Math.cos(a) * radius;
        const v = Math.sin(a) * radius;
        if (plane === 'xy') points.push([cx + u, cy + v, cz]);
        else if (plane === 'yz') points.push([cx, cy + u, cz + v]);
        else points.push([cx + u, cy, cz + v]);
      }
      this.polyline(points, arc >= Math.PI * 2 - 1e-6);
    },
    geometry() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
      return geo;
    },
  };
};

export function boxEdges(builder, w, h, d, cx = 0, cy = 0, cz = 0) {
  const x = w / 2, y = h / 2, z = d / 2;
  const c = [
    [cx - x, cy - y, cz - z], [cx + x, cy - y, cz - z], [cx + x, cy + y, cz - z], [cx - x, cy + y, cz - z],
    [cx - x, cy - y, cz + z], [cx + x, cy - y, cz + z], [cx + x, cy + y, cz + z], [cx - x, cy + y, cz + z],
  ];
  [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
    .forEach(([a, b]) => builder.line(...c[a], ...c[b]));
}
