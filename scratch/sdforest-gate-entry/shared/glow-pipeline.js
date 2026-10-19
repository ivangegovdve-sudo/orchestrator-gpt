/*
 * glow-pipeline.js: ONE restrained, authored bloom for SD Forest.
 *
 * BloomNode is a three.js *addon* that is not in the local pack, so this is
 * not UnrealBloom. It is a cheap threshold + small disc blur written in TSL on
 * top of the scene pass texture:
 *   scenePass (HDR, pre-tonemap)  ->  for each of N rings x 8 taps:
 *   max(sample - threshold, 0) * weight  ->  sum * strength  ->  added back.
 * The pipeline class is feature-detected (RenderPipeline in recent releases,
 * PostProcessing in older ones).
 *
 * createGlowPipeline() throws on any problem; callers keep a plain
 * renderer.render() path and must never let this blank the page.
 */
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';

/**
 * @returns {{ render:()=>void, setSize:(w:number,h:number)=>void, strength:object, threshold:object, label:string, dispose:()=>void }}
 */
export function createGlowPipeline(renderer, scene, camera, opts = {}) {
  const PipelineClass = THREE.RenderPipeline || THREE.PostProcessing;
  if (typeof PipelineClass !== 'function') throw new Error('No RenderPipeline/PostProcessing class in the local bundle');
  const need = ['pass', 'uniform', 'vec2', 'vec3', 'vec4', 'screenUV', 'max'];
  const missing = need.filter((n) => TSL[n] === undefined);
  if (missing.length) throw new Error(`TSL missing for glow pipeline: ${missing.join(', ')}`);
  const { pass, uniform, vec2, vec3, vec4, screenUV, max } = TSL;

  const scenePass = pass(scene, camera);
  const sceneColor = typeof scenePass.getTextureNode === 'function' ? scenePass.getTextureNode('output') : null;
  if (!sceneColor || typeof sceneColor.sample !== 'function') throw new Error('scene pass texture node is not sampleable');

  const uStrength = uniform(opts.strength ?? 0.0);
  const uThreshold = uniform(opts.threshold ?? 0.85);
  const uPixel = uniform(new THREE.Vector2(1 / 1280, 1 / 720));

  const radii = opts.radii || [2.0, 5.0, 9.0, 14.0];
  const ringWeights = opts.weights || [0.34, 0.26, 0.17, 0.10];
  const tapsPerRing = 8;

  const base = sceneColor.rgb;
  let glow = vec3(0.0, 0.0, 0.0);
  const center = max(base.sub(uThreshold), 0.0).mul(0.22);
  glow = glow.add(center);
  for (let r = 0; r < radii.length; r += 1) {
    for (let k = 0; k < tapsPerRing; k += 1) {
      const a = (k / tapsPerRing) * Math.PI * 2 + r * 0.39;
      const offset = vec2(Math.cos(a) * radii[r], Math.sin(a) * radii[r]);
      const s = sceneColor.sample(screenUV.add(offset.mul(uPixel))).rgb;
      glow = glow.add(max(s.sub(uThreshold), 0.0).mul(ringWeights[r] / tapsPerRing));
    }
  }
  const composed = base.add(glow.mul(uStrength));

  const pipeline = new PipelineClass(renderer);
  pipeline.outputNode = vec4(composed, 1.0);

  return {
    render() { pipeline.render(); },
    setSize(w, h) { uPixel.value.set(1 / Math.max(1, w), 1 / Math.max(1, h)); },
    strength: uStrength,
    threshold: uThreshold,
    label: `${PipelineClass.name || 'RenderPipeline'}: authored TSL threshold + ${radii.length}-ring x ${tapsPerRing}-tap blur (not UnrealBloom)`,
    dispose() { try { if (typeof pipeline.dispose === 'function') pipeline.dispose(); } catch (_) { /* no-op */ } }
  };
}
