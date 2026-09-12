/**
 * chloe-shaders.js — GLSL programs for the ChloeAvatar dot cloud.
 *
 * Three programs:
 *   dots  — THREE.Points. Per-dot size / seed / fire / pulse attributes.
 *           Soft gaussian falloff, additive blending, hot white core while firing.
 *   lines — THREE.LineSegments. Per-vertex alpha (proximity fade) + fire channel.
 *   halo  — background plane. Radial ambient glow tinted by the current state color.
 *
 * GLSL ES 1.00 (runs on WebGL1 and WebGL2 contexts).
 * Loaded as a plain script (window.CHLOE_SHADERS) or CommonJS module.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.CHLOE_SHADERS = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const DOTS_VERT = /* glsl */ `
    attribute float aSize;   // base radius in CSS px
    attribute float aSeed;   // 0..1 stable per-dot random
    attribute float aFire;   // 0..1 neuron-fire envelope
    attribute float aPulse;  // 0..1 ripple envelope (transmit out / listen in)
    attribute float aSym;    // 0..1 symbol-membership glow
    attribute float aEngage; // 0..1 recruitment into the current state
    attribute float aAudio;  // 0..1 spatial audio response (near the speaking region)

    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSizeAtten;   // camera distance at which aSize == on-screen px
    uniform float uBrightness;  // global brightness multiplier
    uniform float uAudio;       // live audio level — speech pulses the fleet
    uniform float uSizeScale;   // runtime dot-size tuning

    varying float vSeed;
    varying float vFire;
    varying float vPulse;
    varying float vBright;
    varying float vSym;
    varying float vEngage;
    varying float vFade;
    varying float vAudio;

    void main() {
      vSeed  = aSeed;
      vFire  = aFire;
      vPulse = aPulse;
      vBright = uBrightness;
      vSym   = aSym;
      vEngage = aEngage;
      vAudio = aAudio;
      // dots at the fleet's edge glow more feebly than the core
      vFade = 1.0 - 0.5 * smoothstep(0.55, 1.45, length(position));

      vec4 mv = modelViewMatrix * vec4(position, 1.0);

      // Subtle per-dot twinkle so the field never reads as static
      float twinkle = 1.0 + 0.10 * sin(uTime * 1.6 + aSeed * 47.0);
      // aSym > 0: dot belongs to the held symbol (swell + glow)
      // aSym < 0: bystander during a symbol (recede so the glyph reads)
      float symGlow = clamp(aSym, 0.0, 1.0);
      float symDim  = clamp(-aSym, 0.0, 1.0);
      float size = aSize * uSizeScale * twinkle * (1.0 + uAudio * 0.15 + aAudio * 0.5) *
        (1.0 + aFire * 1.1 + aPulse * 0.6 + symGlow * 0.8 - symDim * 0.25);

      // Perspective attenuation calibrated so aSize is true px at the z=0 plane.
      // ×2: aSize is a radius, gl_PointSize is a diameter — and the gaussian
      // falloff in the fragment shader eats the outer half, so ×2 keeps the
      // visually solid core at the requested radius.
      gl_PointSize = size * 2.0 * uPixelRatio * (uSizeAtten / -mv.z);
      gl_Position  = projectionMatrix * mv;
    }
  `;

  const DOTS_FRAG = /* glsl */ `
    precision highp float;

    uniform vec3  uColorA;      // current-state palette (engagement target)
    uniform vec3  uColorB;
    uniform vec3  uColorFromA;  // previous-state palette (engagement source)
    uniform vec3  uColorFromB;
    uniform vec3  uFireColor;
    uniform vec3  uPulseColor;
    uniform float uOpacity;
    uniform float uTime;

    varying float vSeed;
    varying float vFire;
    varying float vPulse;
    varying float vBright;
    varying float vSym;
    varying float vEngage;
    varying float vFade;
    varying float vAudio;

    void main() {
      vec2  uv = gl_PointCoord - 0.5;
      float d  = length(uv) * 2.0;           // 0 center → 1 edge
      if (d > 1.0) discard;

      // Soft gaussian-ish falloff — organic, no hard rims
      float falloff = pow(1.0 - d, 2.2);
      // Dense inner core
      float core = smoothstep(0.55, 0.0, d);

      // Per-dot color identity: each dot sits somewhere on the A↔B axis,
      // drifts along it slowly at its own pace, and has its own lightness.
      // Recruitment (vEngage) sweeps each dot from the previous palette to
      // the new one individually — color change spreads through the fleet.
      float seed2 = fract(vSeed * 7.31);
      float drift = 0.5 + 0.5 * sin(uTime * (0.15 + seed2 * 0.25) + vSeed * 40.0);
      float axis = clamp(vSeed * 0.6 + drift * 0.4, 0.0, 1.0);
      vec3 fromCol = mix(uColorFromA, uColorFromB, axis);
      vec3 toCol   = mix(uColorA, uColorB, axis);
      vec3 base = mix(fromCol, toCol, clamp(vEngage, 0.0, 1.0));
      base *= 0.78 + 0.5 * seed2;
      base = mix(base, uFireColor,  clamp(vFire,  0.0, 1.0));
      base = mix(base, uPulseColor, clamp(vPulse, 0.0, 1.0));

      // spoken energy warms the dot toward white where the voice lives
      base = mix(base, vec3(1.0), clamp(vAudio, 0.0, 1.0) * 0.18);

      float symGlow = clamp(vSym, 0.0, 1.0);
      float symDim  = clamp(-vSym, 0.0, 1.0);
      float energy = (1.0 + vFire * 2.2 + vPulse * 1.1 + symGlow * 2.0 - symDim * 0.55
        + vAudio * 1.2) * max(vFade, symGlow);
      vec3 col = base * (falloff * 0.6 + core * 0.45) * energy * vBright;
      // White-hot center while firing
      col += vec3(1.0) * core * vFire * 0.85;

      float alpha = (falloff * 0.9 + core * 0.1) * uOpacity;
      gl_FragColor = vec4(col * alpha, alpha);
    }
  `;

  const LINES_VERT = /* glsl */ `
    attribute float aAlpha;    // proximity fade, premixed with state line opacity
    attribute float aFire;     // synchronized-fire flash on this segment
    attribute float aThought;  // symbol "inner thought" sketch line

    varying float vAlpha;
    varying float vFire;
    varying float vThought;

    void main() {
      vAlpha = aAlpha;
      vFire  = aFire;
      vThought = aThought;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const LINES_FRAG = /* glsl */ `
    precision highp float;

    uniform vec3  uLineColor;
    uniform vec3  uFireColor;
    uniform vec3  uThoughtColor;
    uniform float uBrightness;

    varying float vAlpha;
    varying float vFire;
    varying float vThought;

    void main() {
      vec3  col = mix(uLineColor, uFireColor, clamp(vFire, 0.0, 1.0));
      col = mix(col, uThoughtColor, clamp(vThought, 0.0, 1.0));
      float a   = clamp(vAlpha + vFire * 0.85, 0.0, 1.0) * uBrightness;
      gl_FragColor = vec4(col * a, a);
    }
  `;

  const HALO_VERT = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const HALO_FRAG = /* glsl */ `
    precision highp float;

    uniform vec3  uColor;
    uniform float uTime;
    uniform float uIntensity;

    varying vec2 vUv;

    void main() {
      vec2  p = vUv - 0.5;
      float d = length(p) * 2.0;
      // Ambient breathing — 3x slower than the avatar layer (atmosphere, not action)
      float breathe = 1.0 + 0.18 * sin(uTime * 0.5);
      float glow = pow(max(0.0, 1.0 - d), 2.6) * uIntensity * breathe;
      gl_FragColor = vec4(uColor * glow, glow);
    }
  `;

  return {
    dots:  { vertex: DOTS_VERT,  fragment: DOTS_FRAG  },
    lines: { vertex: LINES_VERT, fragment: LINES_FRAG },
    halo:  { vertex: HALO_VERT,  fragment: HALO_FRAG  },
  };
});
