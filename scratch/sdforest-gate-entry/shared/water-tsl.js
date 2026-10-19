/*
 * water-tsl.js: TSL port of three.js examples/jsm/objects/Water.js
 *
 * Ported from three.js examples/jsm/objects/Water.js (MIT License,
 * Copyright 2010-2026 three.js authors). The unmodified source is shipped for
 * provenance at ../assets/three/addons/Water.js (it is WebGLRenderer-only and
 * is NOT imported). The licence text ships at ../assets/three/LICENSE.txt.
 *
 * What is kept intact from the original fragment shader:
 *   - the 4-tap getNoise() with divisors 103, 107, (8907, 9803), (1091, 1027)
 *     and the same time offsets; noise * 0.5 - 1.0
 *   - surfaceNormal = normalize(noise.xzy * vec3(1.5, 1.0, 1.5))
 *   - sunLight(shiny 100, spec 2.0, diffuse 0.5)
 *   - distortion = surfaceNormal.xz * (0.001 + 1/distance) * distortionScale
 *   - Fresnel reflectance with rf0 = 0.02, scatter * waterColor, alpha
 * What differs (WebGPU/TSL realities, not artistic changes):
 *   - the planar mirror is TSL reflector() (its virtual camera replaces the
 *     hand-rolled oblique-clip mirror camera in onBeforeRender)
 *   - lights/shadow mask are not wired (the original's getShadowMask() is 1
 *     when no shadows are used)
 *   - fog is applied by the NodeMaterial output stage when `fog` is true
 *
 * If reflector() is absent or throws, the reflection term degrades to a flat
 * sky tint colour and `result.reflectionMode` is 'tint' (callers must publish
 * that, e.g. data-water-reflection="tint"). Nothing is faked silently.
 */
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';

const REQUIRED = ['uniform', 'texture', 'vec2', 'vec3', 'vec4', 'float', 'positionWorld', 'cameraPosition',
  'normalize', 'dot', 'reflect', 'max', 'min', 'pow', 'mix', 'length'];

/**
 * @param {THREE.BufferGeometry} geometry  geometry lying in the local XY plane (normal +Z), e.g. RingGeometry.
 *        The returned mesh is rotated -PI/2 about X so it lies flat; the reflector target is its child.
 * @param {object} options
 * @param {THREE.Texture} options.waterNormals  RepeatWrapping normal texture (assets/textures/waternormals.jpg)
 * @param {number} [options.size=14]            world->uv scale (original `size`)
 * @param {number} [options.alpha=1]
 * @param {THREE.Vector3} [options.sunDirection]
 * @param {number|THREE.Color} [options.sunColor]
 * @param {number|THREE.Color} [options.waterColor]
 * @param {number|THREE.Color} [options.skyTint]  colour used for the reflection term in 'tint' mode
 * @param {number} [options.distortionScale=3.7]
 * @param {'auto'|'tint'} [options.reflection='auto']  'tint' forces the fallback
 * @param {number} [options.resolutionScale=0.5]
 * @param {number} [options.reflectionGain=1]  multiplies the Fresnel reflectance (SD Forest tuning knob; 1 = original)
 * @param {boolean} [options.fog=true]
 * @returns {{mesh:THREE.Mesh, reflectionMode:'planar'|'tint'|'flat', uniforms:object, update:(t:number)=>void, notes:string[]}}
 */
export function createWaterMesh(geometry, options = {}) {
  const notes = [];
  try {
    return buildNodeWater(geometry, options, notes);
  } catch (err) {
    notes.push(`water TSL build failed: ${err && err.message ? err.message : err}`);
    return buildFlatWater(geometry, options, notes);
  }
}

function toColor(v, fallback) {
  return v instanceof THREE.Color ? v.clone() : new THREE.Color(v ?? fallback);
}

function buildNodeWater(geometry, options, notes) {
  const missing = REQUIRED.filter((n) => TSL[n] === undefined);
  if (missing.length) throw new Error(`TSL missing: ${missing.join(', ')}`);
  if (!options.waterNormals) throw new Error('waterNormals texture missing');

  const { uniform, texture, vec2, vec3, vec4, float, positionWorld, cameraPosition, normalize, dot, reflect, max, min, pow, mix, length } = TSL;

  const normalTex = options.waterNormals;
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.needsUpdate = true;

  const sunDirection = (options.sunDirection || new THREE.Vector3(0.70707, 0.70707, 0.0)).clone().normalize();
  const uTime = uniform(0.0);
  const uSize = uniform(options.size ?? 14.0);
  const uAlpha = uniform(options.alpha ?? 1.0);
  const uDistortion = uniform(options.distortionScale ?? 3.7);
  const uSunDir = uniform(sunDirection);
  const uSunColor = uniform(toColor(options.sunColor, 0xffffff));
  const uWaterColor = uniform(toColor(options.waterColor, 0x7f7f7f));
  const uGain = uniform(options.reflectionGain ?? 1.0);
  const uSkyTint = uniform(toColor(options.skyTint, 0x20303c));

  // --- getNoise(): four taps, original divisors and time offsets ---
  const getNoise = (uv) => {
    const uv0 = uv.div(103.0).add(vec2(uTime.div(17.0), uTime.div(29.0)));
    const uv1 = uv.div(107.0).sub(vec2(uTime.div(-19.0), uTime.div(31.0)));
    const uv2 = uv.div(vec2(8907.0, 9803.0)).add(vec2(uTime.div(101.0), uTime.div(97.0)));
    const uv3 = uv.div(vec2(1091.0, 1027.0)).sub(vec2(uTime.div(109.0), uTime.div(-113.0)));
    const noise = texture(normalTex, uv0)
      .add(texture(normalTex, uv1))
      .add(texture(normalTex, uv2))
      .add(texture(normalTex, uv3));
    return noise.mul(0.5).sub(1.0);
  };

  const noise = getNoise(positionWorld.xz.mul(uSize));
  const surfaceNormal = normalize(noise.xzy.mul(vec3(1.5, 1.0, 1.5)));

  const worldToEye = cameraPosition.sub(positionWorld);
  const eyeDirection = normalize(worldToEye);

  // sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, ... )
  const sunReflection = normalize(reflect(uSunDir.negate(), surfaceNormal));
  const sunTerm = max(dot(eyeDirection, sunReflection), 0.0);
  const specularLight = pow(sunTerm, 100.0).mul(uSunColor).mul(2.0);
  const diffuseLight = max(dot(uSunDir, surfaceNormal), 0.0).mul(uSunColor).mul(0.5);

  const distance = length(worldToEye);
  const distortion = surfaceNormal.xz.mul(float(0.001).add(float(1.0).div(distance))).mul(uDistortion);

  // --- reflection term ---
  let reflection = null;
  let reflectionMode = 'tint';
  if (options.reflection !== 'tint') {
    if (typeof TSL.reflector !== 'function') {
      notes.push('TSL.reflector missing: using sky tint reflection');
    } else {
      try {
        reflection = TSL.reflector({ resolutionScale: options.resolutionScale ?? 0.5 });
        if (!reflection || !reflection.target) throw new Error('reflector() returned no target');
        if (reflection.uvNode && typeof reflection.uvNode.add === 'function') {
          reflection.uvNode = reflection.uvNode.add(distortion);
        } else {
          notes.push('reflector uvNode not addressable: planar reflection without distortion');
        }
        reflectionMode = 'planar';
      } catch (err) {
        reflection = null;
        notes.push(`reflector() failed: ${err && err.message ? err.message : err}`);
      }
    }
  }
  const reflectionSample = reflection ? reflection.rgb : uSkyTint;

  // --- Fresnel + scatter + composition (original constants) ---
  const theta = max(dot(eyeDirection, surfaceNormal), 0.0);
  const rf0 = 0.02;
  // `reflectionGain` is an SD Forest tuning knob (1.0 = the original Fresnel term).
  const reflectance = min(pow(float(1.0).sub(theta), 5.0).mul(1.0 - rf0).add(rf0).mul(uGain), 1.0);
  const scatter = max(dot(surfaceNormal, eyeDirection), 0.0).mul(uWaterColor);
  const albedo = mix(
    uSunColor.mul(diffuseLight).mul(0.3).add(scatter),
    reflectionSample.add(specularLight),
    reflectance
  );

  const material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = vec4(albedo, uAlpha);
  material.fog = options.fog !== false;
  material.transparent = (options.alpha ?? 1.0) < 1.0;
  material.side = THREE.FrontSide;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'SDForestWater';
  mesh.rotation.x = -Math.PI / 2;
  if (reflection) mesh.add(reflection.target);

  return {
    mesh,
    reflectionMode,
    uniforms: { time: uTime, sunDirection, sunColor: uSunColor, waterColor: uWaterColor, skyTint: uSkyTint, distortionScale: uDistortion },
    update(elapsed) { uTime.value = elapsed; },
    notes
  };
}

function buildFlatWater(geometry, options, notes) {
  const material = new THREE.MeshBasicMaterial({ color: toColor(options.waterColor, 0x203038) });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'SDForestWaterFlat';
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, reflectionMode: 'flat', uniforms: {}, update() {}, notes };
}
