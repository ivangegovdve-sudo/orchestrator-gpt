# Onlook mouse-glow study

Standalone preview of the public Onlook "Flow gradient" scene recovered on 2026-10-15. Move the mouse across the dark background to reveal the fading, distorted light trail. This is the original scene played by its original runtime version, not an independently authored recreation.

## Run

From the repository root:

```sh
python -m http.server 4317 --bind 127.0.0.1
```

Open http://127.0.0.1:4317/examples/onlook-glow/ in a WebGL-capable browser. Use another port if 4317 is already occupied. Internet access is required for the pinned Unicorn Studio runtime loaded from jsDelivr; the scene itself is local. No build, credentials, backend or npm install is required.

This example is intentionally outside `web/`, so the existing static-site build does not publish it or change the Forest HUB homepage. Promotion into the deployed product is a separate decision.

## Provenance and reuse boundary

- Reference: https://www.onlook.com/
- Scene: https://www.onlook.com/scenes/flow-background.json
- Scene SHA-256: `066a057168f8d42275e10943db253f77392f0917c9101a99944215a02d23a96d`
- Runtime: https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.5.2/dist/unicornStudio.umd.js
- Runtime documentation and license: https://github.com/hiunicornstudio/unicornstudio.js

The scene and its shaders are third-party material, not original repository code. Public accessibility does not establish a license to reuse them. Scene reuse permission has not been verified. Unicorn Studio describes its runtime as proprietary and limits use to legitimate Unicorn Studio projects; its code is not vendored here. This study does not grant additional rights. Resolve permissions before production adoption or redistribution beyond this review.

## Verification and limits

- The original local preview loaded its canvas, responded to pointer movement and showed no app console errors in the Codex browser.
- Observed at a narrow 319-pixel viewport and at 1440 x 900. The desktop view showed clearer cloud contours. The reported edge/detail difference from Onlook remains unresolved; no sharpening adjustment was made.
- The scene is byte-identical to the recovered source. See `ANALYSIS.md` for the shader analysis and its evidence limitations.
- This PR references the pinned CDN runtime instead of bundling the downloaded copy used by the first offline-capable preview.
- The PR's CDN-backed version was also browser-checked: one initialized canvas, visible glow after a pointer drag, and no app warnings or errors.
- Automated checks verify packaging and provenance, not pixel-level fidelity or production deployment.
