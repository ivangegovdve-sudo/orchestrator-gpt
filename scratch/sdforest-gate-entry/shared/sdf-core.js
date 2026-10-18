/*
 * SD Forest reskin preview: shared runtime helpers.
 *
 * Authored for SD Forest. Imports only the import-mapped specifiers
 * ('three/webgpu' and 'three/tsl'). Namespace imports are used on purpose:
 * a missing export on a namespace is just `undefined` (guardable), whereas a
 * missing *named* import is a link-time SyntaxError that would kill the page.
 */
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';

/** Resolve a path inside the package (shared/ lives one level below the root). */
export const assetURL = (path) => new URL(`../assets/${path}`, import.meta.url).href;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth01 = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeOutCubic = (t) => { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
export const easeInOutCubic = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

/** Deterministic PRNG (mulberry32). */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Create a WebGPURenderer (it falls back to its own WebGL2 backend when WebGPU
 * is unavailable). Throws on failure so the caller can drop to the text-first
 * state. Resolves { renderer, backend: 'webgpu' | 'webgl2' }.
 */
export async function createRenderer(canvas, opts = {}) {
  if (typeof THREE.WebGPURenderer !== 'function') throw new Error('WebGPURenderer is not exported by the local bundle');
  const hasGPU = typeof navigator !== 'undefined' && !!navigator.gpu;
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: opts.antialias !== false,
    forceWebGL: !hasGPU,
    powerPreference: 'high-performance'
  });
  const timeoutMs = opts.initTimeoutMs ?? 12000;
  await Promise.race([
    renderer.init(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('renderer.init() timed out')), timeoutMs))
  ]);
  let backend = hasGPU ? 'webgpu' : 'webgl2';
  try {
    if (renderer.backend && renderer.backend.isWebGLBackend) backend = 'webgl2';
    else if (renderer.backend && renderer.backend.isWebGPUBackend) backend = 'webgpu';
  } catch (_) { /* keep the navigator.gpu based guess */ }
  if (opts.toneMapping !== undefined) renderer.toneMapping = opts.toneMapping;
  if (opts.exposure !== undefined) renderer.toneMappingExposure = opts.exposure;
  if (opts.clearColor !== undefined) renderer.setClearColor(opts.clearColor, 1);
  return { renderer, backend };
}

/** Size the drawing buffer to the canvas' CSS box. DPR is capped (default 1.5). */
export function fitRenderer(renderer, canvas, maxDpr = 1.5) {
  const w = Math.max(1, Math.round(canvas.clientWidth || window.innerWidth));
  const h = Math.max(1, Math.round(canvas.clientHeight || window.innerHeight));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(w, h, false);
  return { w, h };
}

/**
 * Load an image texture. Never rejects: a failed load resolves null and pushes
 * the file name into `failures` so the caller degrades instead of blanking.
 */
export async function loadTexture(renderer, url, opts = {}, failures = null) {
  try {
    const tex = await new THREE.TextureLoader().loadAsync(url);
    tex.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    if (opts.repeat !== false) { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; }
    if (opts.flipY !== undefined) tex.flipY = opts.flipY;
    let aniso = 1;
    try { aniso = renderer && typeof renderer.getMaxAnisotropy === 'function' ? renderer.getMaxAnisotropy() : 1; } catch (_) { aniso = 1; }
    tex.anisotropy = Math.max(1, Math.min(opts.anisotropy ?? 8, aniso || 1));
    tex.needsUpdate = true;
    return tex;
  } catch (err) {
    if (failures) failures.push(String(url).split('/').slice(-2).join('/'));
    return null;
  }
}

/** Fail loudly (so callers can catch) when a TSL export the code needs is absent. */
export function requireTSL(...names) {
  const missing = names.filter((n) => TSL[n] === undefined);
  if (missing.length) throw new Error(`TSL exports missing from the local bundle: ${missing.join(', ')}`);
}

/**
 * Small hash-based value noise written in plain TSL expressions (no Fn, no
 * dependency on MaterialX noise nodes). `p` is a vec2 node.
 */
export function tslValueNoise(p) {
  const { vec2, floor, fract, sin, dot, mix } = TSL;
  const hash = (q) => fract(sin(dot(q, vec2(127.1, 311.7))).mul(43758.5453));
  const i = floor(p);
  const f = fract(p);
  const u = f.mul(f).mul(f.mul(-2.0).add(3.0));
  const a = hash(i);
  const b = hash(i.add(vec2(1.0, 0.0)));
  const c = hash(i.add(vec2(0.0, 1.0)));
  const d = hash(i.add(vec2(1.0, 1.0)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/** Three-octave fbm over tslValueNoise. */
export function tslFbm3(p) {
  const { vec2 } = TSL;
  let sum = tslValueNoise(p).mul(0.5);
  let q = p.mul(2.03).add(vec2(11.7, 3.1));
  sum = sum.add(tslValueNoise(q).mul(0.25));
  q = q.mul(2.01).add(vec2(5.3, 17.9));
  sum = sum.add(tslValueNoise(q).mul(0.125));
  return sum.div(0.875);
}

/**
 * Cold, desaturated colour node from a diffuse texture (the rock/ground atlases
 * are warm ochre; the front-page palette is cold). Set as `material.colorNode`.
 * Note: setting colorNode bypasses material.map, so the texture is sampled here.
 */
export function coldColorNode(tex, { tint = [0.62, 0.72, 0.86], saturation = 0.3, gain = 1.0 } = {}) {
  const { texture, vec3, vec4, dot, mix } = TSL;
  const rgb = texture(tex).rgb;
  const luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  const grey = vec3(luma, luma, luma);
  return vec4(mix(grey, rgb, saturation).mul(vec3(tint[0], tint[1], tint[2])).mul(gain), 1.0);
}

/** Set a data attribute on <body> (the harness reads these). */
export function setBodyData(name, value) {
  try { document.body.setAttribute(`data-${name}`, String(value)); } catch (_) { /* no-op */ }
}

export { THREE, TSL };
