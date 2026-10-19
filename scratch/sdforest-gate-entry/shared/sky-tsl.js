/*
 * sky-tsl.js: TSL port of three.js examples/jsm/objects/Sky.js
 *
 * Ported from three.js examples/jsm/objects/Sky.js (MIT License,
 * Copyright 2010-2026 three.js authors), the Preetham "practical analytic
 * model for daylight". The unmodified source is shipped for provenance at
 * ../assets/three/addons/Sky.js (WebGLRenderer-only, NOT imported). The licence
 * text ships at ../assets/three/LICENSE.txt.
 *
 * Kept intact: the Rayleigh / Mie scattering maths, the optical-length term,
 * Fex extinction, Lin in-scattering with the horizon mix, the night-sky L0
 * term, the solar disc and the optional cloud layer (gradient noise, fbm,
 * Beer/powder shading, silver lining, aerial composite).
 *
 * Moved to the CPU (permitted: they were vertex-stage values that depend only
 * on uniforms): sunIntensity -> vSunE, sunfade, betaR, betaM.
 *
 * SD Forest additions (clearly separate from the port, after `texColor`):
 *   - desaturation + cold tint + exposure, so the Preetham dusk reads as a
 *     cold, low-saturation front-page sky
 *   - below/at the horizon the sky blends to `fogColor`, the very same linear
 *     colour as scene.fog, so terrain fog and sky horizon meet without a seam.
 *
 * Rendered on a large BackSide box (depthWrite false). The box is NOT parented
 * to the camera; its scale must keep it inside camera.far (half-diagonal =
 * 0.866 * scale).
 */
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';

const REQUIRED = ['uniform', 'vec2', 'vec3', 'vec4', 'float', 'positionWorld', 'cameraPosition', 'normalize', 'dot',
  'acos', 'cos', 'exp', 'pow', 'max', 'min', 'clamp', 'mix', 'smoothstep', 'floor', 'fract'];

// Preetham constants (identical to the original)
const TOTAL_RAYLEIGH = [5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5];
const MIE_CONST = [1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14];
const CUTOFF_ANGLE = 1.6110731556870734;
const STEEPNESS = 1.5;
const EE = 1000.0;
const THREE_OVER_SIXTEENPI = 0.05968310365946075;
const ONE_OVER_FOURPI = 0.07957747154594767;
const SUN_ANGULAR_DIAMETER_COS = 0.999956676946448443553574619906976478926848692873900859324;

function sunIntensity(zenithAngleCos) {
  const c = Math.min(1, Math.max(-1, zenithAngleCos));
  return EE * Math.max(0, 1 - Math.pow(Math.E, -((CUTOFF_ANGLE - Math.acos(c)) / STEEPNESS)));
}

function totalMie(T) {
  const c = (0.2 * T) * 10e-18;
  return MIE_CONST.map((m) => 0.434 * c * m);
}

/**
 * @param {object} [options]
 * @param {number} [options.turbidity=2]
 * @param {number} [options.rayleigh=1]
 * @param {number} [options.mieCoefficient=0.005]
 * @param {number} [options.mieDirectionalG=0.8]
 * @param {number} [options.elevation=2]  sun elevation in degrees (may be slightly negative)
 * @param {number} [options.azimuth=180]  degrees
 * @param {number} [options.cloudCoverage=0.4]   0 disables the cloud term
 * @param {number} [options.saturation=0.5]      SD Forest grade
 * @param {number|THREE.Color} [options.tint=0xdce8f5]
 * @param {number} [options.exposure=1]
 * @param {number|THREE.Color} [options.fogColor=0x16222c]  must equal scene.fog.color
 * @param {number} [options.horizonBlend=0.2]    sin(elevation) over which sky blends to fogColor
 * @param {number} [options.scale=1000]
 */
export function createSkyMesh(options = {}) {
  const missing = REQUIRED.filter((n) => TSL[n] === undefined);
  if (missing.length) throw new Error(`TSL missing for sky: ${missing.join(', ')}`);
  const { uniform, vec2, vec3, vec4, float, positionWorld, cameraPosition, normalize, dot, acos, cos, exp, pow, max, min, clamp, mix, smoothstep, floor, fract } = TSL;

  const turbidity = options.turbidity ?? 2;
  const rayleigh = options.rayleigh ?? 1;
  const mieCoefficient = options.mieCoefficient ?? 0.005;

  // --- CPU-side former vertex stage ---
  const sunDirection = new THREE.Vector3();
  const betaR = new THREE.Vector3();
  const betaM = new THREE.Vector3();

  const uSunDir = uniform(sunDirection);
  const uBetaR = uniform(betaR);
  const uBetaM = uniform(betaM);
  const uSunE = uniform(0.0);
  const uMieG = uniform(options.mieDirectionalG ?? 0.8);
  const uCloudScale = uniform(options.cloudScale ?? 0.0002);
  const uCloudSpeed = uniform(options.cloudSpeed ?? 0.00002);
  const uCloudCoverage = uniform(options.cloudCoverage ?? 0.4);
  const uCloudDensity = uniform(options.cloudDensity ?? 0.4);
  const uCloudElevation = uniform(options.cloudElevation ?? 0.5);
  const uShowSun = uniform(options.showSunDisc === false ? 0.0 : 1.0);
  const uTime = uniform(0.0);
  const uSat = uniform(options.saturation ?? 0.5);
  const uTint = uniform(options.tint instanceof THREE.Color ? options.tint.clone() : new THREE.Color(options.tint ?? 0xdce8f5));
  const uExposure = uniform(options.exposure ?? 1.0);
  const uFog = uniform(options.fogColor instanceof THREE.Color ? options.fogColor.clone() : new THREE.Color(options.fogColor ?? 0x16222c));
  const uHorizon = uniform(options.horizonBlend ?? 0.2);

  function setSun(elevationDeg, azimuthDeg) {
    const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
    const theta = THREE.MathUtils.degToRad(azimuthDeg);
    sunDirection.setFromSphericalCoords(1, phi, theta);
    uSunE.value = sunIntensity(sunDirection.y);
    // sunfade = 1 - clamp(1 - exp(sunPosition.y / 450000), 0, 1); sunPosition is the unit vector here (as in the original example usage)
    const sunfade = 1 - Math.min(1, Math.max(0, 1 - Math.exp(sunDirection.y / 450000)));
    const rayleighCoefficient = rayleigh - (1.0 * (1.0 - sunfade));
    betaR.set(TOTAL_RAYLEIGH[0], TOTAL_RAYLEIGH[1], TOTAL_RAYLEIGH[2]).multiplyScalar(rayleighCoefficient);
    const tm = totalMie(turbidity);
    betaM.set(tm[0], tm[1], tm[2]).multiplyScalar(mieCoefficient);
  }
  setSun(options.elevation ?? 2, options.azimuth ?? 180);

  // --- fragment stage (original math) ---
  const gradient = (i) => {
    let p = fract(i.xyx.mul(vec3(0.1031, 0.1030, 0.0973)));
    p = p.add(dot(p, p.yzx.add(33.33)));
    return fract(p.xx.add(p.yz).mul(p.zy)).mul(2.0).sub(1.0);
  };
  const noise = (p) => {
    const i = floor(p);
    const f = fract(p);
    const u = f.mul(f).mul(f).mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0)); // quintic fade
    const a = dot(gradient(i), f);
    const b = dot(gradient(i.add(vec2(1.0, 0.0))), f.sub(vec2(1.0, 0.0)));
    const c = dot(gradient(i.add(vec2(0.0, 1.0))), f.sub(vec2(0.0, 1.0)));
    const d = dot(gradient(i.add(vec2(1.0, 1.0))), f.sub(vec2(1.0, 1.0)));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y).mul(1.6);
  };
  const fbm = (p0, drift) => {
    let result = float(0.0);
    let amplitude = 1.0;
    let p = p0;
    for (let i = 0; i < 4; i += 1) {
      result = result.add(noise(p).mul(amplitude));
      amplitude *= 0.5;
      p = p.mul(2.0).add(drift);
    }
    return result;
  };

  const direction = normalize(positionWorld.sub(cameraPosition));

  // optical length
  const zenithAngle = acos(max(direction.y, 0.0));
  const inverse = float(1.0).div(cos(zenithAngle).add(pow(float(93.885).sub(zenithAngle.mul(180.0 / Math.PI)), -1.253).mul(0.15)));
  const sR = inverse.mul(8.4e3);
  const sM = inverse.mul(1.25e3);

  // combined extinction factor
  const Fex = exp(uBetaR.mul(sR).add(uBetaM.mul(sM)).negate());

  // in scattering
  const cosTheta = dot(direction, uSunDir);
  const rPhase = pow(cosTheta.mul(0.5).add(0.5), 2.0).add(1.0).mul(THREE_OVER_SIXTEENPI);
  const betaRTheta = uBetaR.mul(rPhase);
  const g2 = uMieG.mul(uMieG);
  const hgInverse = float(1.0).div(pow(float(1.0).sub(uMieG.mul(2.0).mul(cosTheta)).add(g2), 1.5));
  const mPhase = float(1.0).sub(g2).mul(hgInverse).mul(ONE_OVER_FOURPI);
  const betaMTheta = uBetaM.mul(mPhase);

  const ratio = betaRTheta.add(betaMTheta).div(uBetaR.add(uBetaM));
  let Lin = pow(ratio.mul(uSunE).mul(Fex.oneMinus()), vec3(1.5, 1.5, 1.5));
  const horizonMix = clamp(pow(float(1.0).sub(uSunDir.y), 5.0), 0.0, 1.0);
  Lin = Lin.mul(mix(vec3(1.0, 1.0, 1.0), pow(ratio.mul(uSunE).mul(Fex), vec3(0.5, 0.5, 0.5)), horizonMix));

  // night sky term
  const L0 = vec3(0.1, 0.1, 0.1).mul(Fex);

  // composition + solar disc
  const sundisc = clamp(cosTheta.sub(SUN_ANGULAR_DIAMETER_COS).mul(50000.0), 0.0, 1.0).mul(uShowSun);
  const sundiscColor = min(Fex.mul(uSunE), 80.0).mul(sundisc.mul(760.0));

  let texColor = Lin.add(L0).mul(0.04).add(sundiscColor).add(vec3(0.0, 0.0003, 0.00075));

  // --- clouds (optional layer of the original) ---
  if (options.cloudCoverage === undefined || options.cloudCoverage > 0) {
    const dirY = max(direction.y, 0.001); // original guards with `if (direction.y > 0)`
    const elevation = mix(float(1.0), float(0.1), uCloudElevation);
    const cloudUV0 = direction.xz.div(dirY.mul(elevation)).mul(uCloudScale).add(uTime.mul(uCloudSpeed));
    const evolve = uTime.mul(uCloudSpeed).mul(300.0);
    const cloudNoise = clamp(fbm(cloudUV0.mul(1000.0), evolve).mul(0.7).add(0.5), 0.0, 1.0);
    const region = noise(cloudUV0.mul(300.0)).mul(0.37).add(0.5);
    const cov = clamp(uCloudCoverage.add(region.sub(0.5).mul(0.6)), 0.0, 1.0);
    const threshold = float(1.0).sub(cov);
    const cloudMask0 = smoothstep(threshold, threshold.add(0.3), cloudNoise);
    const horizonFade = smoothstep(0.0, uCloudElevation.mul(0.06).add(0.03), direction.y);
    const cloudMask = cloudMask0.mul(horizonFade);

    const dayFactor = smoothstep(-0.08, 0.3, uSunDir.y);
    const sunColor = Fex.mul(uSunE).mul(0.22 * 0.04);
    const skyAmbient = Lin.mul(0.04).add(vec3(0.0, 0.0003, 0.00075));

    const depth = max(cloudNoise.sub(threshold), 0.0);
    const beer = exp(depth.mul(-4.0));
    const powder = float(1.0).sub(beer.mul(beer));
    const shade = mix(float(0.45), float(1.0), clamp(beer.mul(powder).mul(2.6), 0.0, 1.0));

    const silver = clamp(float(0.51).div(pow(float(1.49).sub(cosTheta.mul(1.4)), 1.5)), 0.0, 3.0);
    const edge = cloudMask.mul(float(1.0).sub(cloudMask)).mul(4.0);

    let cloudColor = skyAmbient.add(sunColor.mul(shade));
    cloudColor = cloudColor.add(sunColor.mul(silver).mul(edge).mul(0.6));
    cloudColor = cloudColor.mul(max(dayFactor, 0.03));

    const cloudAlpha = float(1.0).sub(exp(depth.mul(uCloudDensity).mul(-12.0))).mul(horizonFade);
    texColor = texColor.sub(L0.mul(0.04).mul(cloudAlpha));
    const cloudAerial = mix(texColor, cloudColor, Fex);
    texColor = mix(texColor, cloudAerial, cloudAlpha);
  }

  // --- SD Forest grade (not part of the original) ---
  const luma = dot(texColor, vec3(0.2126, 0.7152, 0.0722));
  const graded = mix(vec3(luma, luma, luma), texColor, uSat).mul(uTint).mul(uExposure);
  const horizonBlend = smoothstep(0.0, uHorizon, direction.y);
  const finalColor = mix(uFog, graded, horizonBlend);

  const material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = vec4(finalColor, 1.0);
  material.side = THREE.BackSide;
  material.depthWrite = false;
  material.fog = false;

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.name = 'SDForestSky';
  mesh.scale.setScalar(options.scale ?? 1000);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;

  return {
    mesh,
    sunDirection,
    setSun,
    update(elapsed) { uTime.value = elapsed; },
    uniforms: { exposure: uExposure, saturation: uSat, tint: uTint, fogColor: uFog, cloudCoverage: uCloudCoverage }
  };
}
