# SD Forest growth-film provenance

`growth-scroll.mp4` is a browser-seeking derivative of Ivan's existing Google
Drive master, not newly generated footage.

- Drive folder: `sdforest tree animation / Make pulse images`
- Source: `06-sdforest-growth-master.mp4`
- Drive file id: `1RV1tvNCXtPEnJuNBlly-KNTvzoSxWVcE`
- Source properties: 1920×1080, H.264, 24fps, 605 frames, 25.208333s,
  no audio, 52,514,008 bytes
  - SHA-256: `3B3E7C0DE82E501DAE972CA5A0608BCE2C982FB112F1EC2437DD783BC4FC3065`
- Web derivative: 1920×1080 H.264 High, yuv420p, CRF 26, 24fps,
  0.5-second keyframe interval, fast-start, no audio, 21,593,355 bytes
  - SHA-256: `1532B32A9210B593492B16A2A6BEEB804596707F4A0D25330EC478F94371E04A`
- `seed-poster.webp`: the first source frame, 338,314 bytes
  - SHA-256: `CBA939157F9D4D743B24F235E63F93A55E3270313CD8A4E9C7CB49248E0CEC64`

The frequent keyframes are intentional: the film is paused and sought by the
single page scroll clock in both directions. The original's roughly five-second
keyframe spacing made interactive reverse seeking too coarse.

Reproduction command (FFmpeg 8.1.1 was used for the checked-in derivative):

```text
ffmpeg -i 06-sdforest-growth-master.mp4 -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -profile:v high -level 4.1 -g 12 -keyint_min 12 -sc_threshold 0 -movflags +faststart growth-scroll.mp4
```

The filmed mature tree and the current page tree are related art, not identical
pixels. The runtime therefore reframes the filmed tree, darkens it through the
existing mist layer, and crossfades to the fixed page tree during the final
half-second. It does not claim a literal morph or alter the page tree's geometry.
No Fal.ai, Crazy Router, or other generation provider was used for this asset.
