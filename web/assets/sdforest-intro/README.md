# SD Forest intro provenance

The current `growth-scroll.mp4` and `growth-scroll-phone.mp4` are rendered from
the finished Option-A page. Their final frames are the actual desktop and phone
screenshots in `final-frame-lock.json`. No new generated footage or paid service
is used, and the runtime retains the native code compositor for other viewport
sizes and unsupported video decoders.

Both files contain 289 samples at 24 fps (12.041667 seconds), without audio. The
moving samples use VP9 RGB Profile 1, `gbrp`, CRF 24. The last sample is a separate
lossless RGB keyframe appended without re-encoding. `video-render.json` records
the exact codec settings, dimensions, file sizes and hashes. Narration is the
separate `seed-to-forest.mp3`; its working poem and local speech provenance are
documented in [the pipeline report](../../../docs/sdforest-pipeline.md).

`seed-poster-desktop.png` and `seed-poster-phone.png` are the first samples of
the current render. The old `seed-poster.webp` remains a legacy reference.

Reproduce the page capture and render in order:

```text
node scripts/freeze-sdforest-frame.cjs
node scripts/render-sdforest-intro.cjs
```

Both scripts require the built page served at `SDFOREST_BASE_URL` (default
`http://127.0.0.1:4580`), `playwright-core`, Chrome and FFmpeg. Intermediate PNGs
and encoder outputs stay in `SDFOREST_RENDER_OUT`, defaulting to the operating
system's temporary directory under `sdforest-render`. To change compression
without recapturing the page, point that variable to the existing PNG cache and
run `node scripts/render-sdforest-intro.cjs --encode-existing`.

`scripts/verify-sdforest-video.cjs` requires literal RGB equality between the
locked PNG, the decoded final video sample and Chromium's displayed final
sample. The renderer also checks the final DOM sample before encoding. There is
no reference-image overlay or crossfade at the handoff.

## Retained legacy reference

The replaced H.264 derivative came from Ivan's existing Google Drive master:

- Folder: `sdforest tree animation / Make pulse images`
- Source: `06-sdforest-growth-master.mp4`
- Drive file id: `1RV1tvNCXtPEnJuNBlly-KNTvzoSxWVcE`
- Source: 1920×1080, H.264, 24 fps, 605 frames, 25.208333 seconds, no audio,
  52,514,008 bytes
- Source SHA-256: `3B3E7C0DE82E501DAE972CA5A0608BCE2C982FB112F1EC2437DD783BC4FC3065`
- Legacy `seed-poster.webp` SHA-256: `CBA939157F9D4D743B24F235E63F93A55E3270313CD8A4E9C7CB49248E0CEC64`

The current pipeline preserves that provenance while replacing the mismatched
filmed ending with the frozen real-page composition.
