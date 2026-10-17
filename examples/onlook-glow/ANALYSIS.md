# Onlook mouse-driven cloud-light effect

Inspected 2026-10-15. Scope: only the background of https://www.onlook.com/.

## Finding

The effect is a Unicorn Studio WebGL scene called **Flow gradient**. Its three layers are a near-black gradient, a mouse-drawn feedback trail, and an animated fractal-noise distortion. The scene contains the compiled GLSL shaders, so the rendering mechanism is directly inspectable.

It creates the impression of light behind dark clouds by warping a soft, fading colored trail. The inspected scene does not contain cloud images or a volumetric cloud/raymarching stage.

## Evidence and attribution

- Live scene: https://www.onlook.com/scenes/flow-background.json
- Scene wrapper: https://www.onlook.com/_next/static/chunks/fe94f17f389bdb63.js (Turbopack module 280014, exported as UnicornBackground).
- Hero caller: https://www.onlook.com/_next/static/chunks/eb72c5c990e0722f.js (renders UnicornBackground).
- SDK: https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.5.2/dist/unicornStudio.umd.js
- Scene format version: 1.4.30. Scene ID: Gr1LmwbKSeJOXhpYEdit.
- Scene SHA-256: 066a057168f8d42275e10943db253f77392f0917c9101a99944215a02d23a96d.

REA 6.5.0 was actually invoked through a local stdio MCP client. Initialization and tools/list succeeded, advertising 207 tools. Its analyze_javascript_application tool parsed the two selected deployed bundles: 2 JavaScript files, 161,661 text bytes, 40,023 visited AST nodes, zero parse failures. Application graph coverage was partial and semantic coverage unknown; this does not establish execution or complete dependency recovery.

REA summary Evidence: ev_8f6d936a041d03775b93d4cbbe25d7d711027923ed7d779dddf4cb0f9858f50a.
Parent analysis reference: ev_1cac7ae1bab11a21fd7a029a0411968a911f97b7080aea985cb4c54df05d12ea. The parent was retained only in that MCP session; the saved summary is portable, not the complete parent graph.

The shader interpretation below comes from direct reading of the deployed scene JSON, in addition to the REA bundle analysis. REA's capture_browser_scenario attempt exceeded the 120-second client deadline and yielded no capture receipt. Separately, the browser tools observed the live scene canvas and SDK URL, and a pointer drag across the hero visibly produced the red smoky trail. No claim of REA runtime capture success is made.

## Rendering sequence

1. **Dark base — gradient.** The first pass interpolates #151515 toward black, with gradient stops 0, 0.5, and 1. It uses a rotated linear gradient and very subtle dithering. Mouse tracking for this layer is zero.
2. **Persistent mouse trail — mouseDraw.** A feedback texture stores the previous frame. Its hue encodes direction; its value encodes trail strength. Current and previous normalized mouse coordinates generate a soft brush along the motion segment. The pass advects, distorts, and blurs old trail pixels, mixes in the new stroke, then attenuates it.
3. **Additive light.** The trail is converted into light and added to the dark base. The shader mixes its direction-derived RGB with #f50032 at a 0.5 mix. This explains the observed red/pink glow and permits direction-dependent color variation.
4. **Cloud-like distortion — fbm.** Six octaves of 3D Perlin noise generate a slowly changing coordinate warp. Two offset noise fields feed another noise lookup (domain warping). The final pass samples the lit image at those distorted coordinates. This breaks the soft brush into irregular folds and wisps.

The mouse feedback stage uses two alternating render textures (ping-pong). The displayed gradient and trail composite then feed the final distortion pass.

## Why movement reveals it

The mouse trail computes distance from the current and previous pointer positions. Its injection weight is:

```glsl
clampedDist = clamp(length(trailColor) * dist, 0.0, 1.0);
draw = mix(blurredLastFrame, trailColor, clampedDist);
draw *= pow(0.5000, 0.2);
```

When `dist` is zero, the new stroke contributes zero weight. The previous trail remains but is blurred and decays. The multiplier is about 0.87055 in linear color per update; the later gamma conversion means this is not a direct screen-brightness percentage. No exact wall-clock fade duration was measured.

The noise layer continues animating, but with little illumination on the near-black base its movement is subtle. This gives the perceived behavior of an effect that appears only while moving the mouse.

## Exact settings and useful constants

| Item | Shipped value |
|---|---|
| Render target | Full viewport; background wrapper has pointer-events:none, z-index 0 |
| Wrapper animation | Opacity 0→1, 0.8-second ease-out, after 1-second delay |
| SDK initialization | scale 1, dpi 1, fps 60, lazy loading enabled |
| Gradient / trail downsample setting | 0.5 / 0.5 |
| Final noise downsample setting | 0.75 |
| Trail color bias | #f50032, 50% mix with direction RGB |
| Trail gain | HSV value × 2.5 |
| Trail decay | pow(0.5, 0.2) per update, before gamma conversion |
| Feedback blur | Center + four axial samples, each weight 0.2; UV radius 0.005 |
| Feedback advection | Previous direction × 0.03 × previous strength |
| Local trail liquify | Five sinusoidal iterations; amplitude 0.0025, frequency 6, mix factor 0.25 × (1 − previous strength) |
| Stroke interpolation | Starts at 12 subdivisions, increases with distance, capped at 24 iterations |
| Brush radius | mix(0.1, 0.7, 0.528 × clamp(dist, 0.7, 1.3)) |
| Brush falloff exponent | 10 × (1 − 0.5 + 0.1) = 6 |
| FBM octave count | 6 |
| FBM initial amplitude | 0.25 |
| FBM amplitude multiplier | 0.1 + 0.76 × 0.65 = 0.594 |
| FBM octave scale | 2.5, with 0.5-radian rotation and positional shift |
| Noise layer speed setting | 0.15 |
| Noise displacement constant | 0.31 |
| Noise drift | uTime × 0.005 × (0.72 × 2) |
| Noise Z evolution | uTime × 0.025 |

Values labeled speed/downsample are scene metadata consumed by the SDK. Their exact mapping into scheduling and framebuffer dimensions was not independently traced through the SDK.

## Reconstruction specification

A standalone implementation needs WebGL2, a fullscreen quad, the base-gradient pass, two feedback targets for the mouse trail, a trail-compositing pass, and the final six-octave distortion pass. Update the pointer coordinates every frame, preserve the feedback texture across frames, and render text/buttons above the canvas. A simple radial cursor glow alone will not produce the observed trailing, fading, turbulent contours.

For a reproduction using the same engine, the deployed wrapper's essential call is equivalent to:

```js
UnicornStudio.addScene({
  elementId: 'background',
  filePath: '/scenes/flow-background.json',
  scale: 1,
  dpi: 1,
  fps: 60,
  lazyLoad: true,
  production: true
});
```

This is a reconstruction recipe, not a separately built or tested demo. The adjacent scene JSON is a byte-identical copy of the public source for analysis; the GLSL files are mechanically extracted from it. The custom editor project, original uncompiled shader authoring sources, and complete SDK event/scheduling implementation were not recovered.
