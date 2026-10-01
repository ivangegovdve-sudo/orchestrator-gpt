# Health world report

Status 2026-09-29: code-rendered cell entrance built and verified; all other parts verified.

## Direction

- Grammar: working surface. The hero opens onto a usable project surface rather than a continuous world.
- Cell (Ivan's final direction): cool, stylized, premium and alive, code-rendered and non-hallucinated. No labels, no generated video, no credits. Form and palette follow the private reference ref-8449 (not in this repo): a glossy blue sphere with its upper-front quarter cut away, cream cytoplasm on the cut faces, a membrane rim, a magenta nucleus with its own cutaway and nucleolus, green mitochondria, Golgi stacks, rough ER, vesicles, crescents, centrioles, and streaming ribosomes.
- Built with the site's vendored three.js r180 (`web/pools/health/cell.js`), full-bleed behind the copy. The cell is framed in the space the copy leaves free: beside it on desktop, above it on phones, below the redesign notice.
- Motion is explicit functions of time and scroll: organelle drift within their faces, squash-and-stretch morphing, cytoplasmic streaming around the nucleus, membrane and nucleus breathing, pointer parallax. The signature move: once the copy has faded (cue ends at p = 0.5), scroll dollies the camera into the cutaway until the interior fills the screen.
- Reduced motion: one still frame, no zoom, no loop. Without WebGL, a static CSS fallback.
- Journey: recognition (the living cell) → trust (clinic statement) → range (project rail) → agency (feedback close). Creative choices remain provisional, pending Ivan (see BRIEF.md).

## Verification (final build, 2026-09-29)

Captured with the skill's own `serve.mjs` + `shoot.mjs` against the built site:

| Mode | Frames | Dead scroll | Contrast | Console errors |
|---|---|---|---|---|
| Desktop 1440x900 | 25 | none | all cues clear 4.5:1 | none |
| Phone 390x844 | 25 | none | all cues clear 4.5:1 | none |
| Reduced motion | 25 | none | all cues clear 4.5:1 | none |

- An earlier pass failed contrast (desktop 1.02:1, phone 3.99:1): the zoom slid the cream interior under the fading headline. Fixed by sequencing: the copy is gone by p = 0.5 and the zoom starts there.
- The motion is real: at a fixed scroll position, 13.4% of the cell's pixels change within 1.5 s (screenshot diff); with reduced motion, 0%.
- Layout: the cell never sits under the copy and there is no horizontal scroll at 1920, 1440, 1280, 1024, 820, 430, 390 or 360 px. Phone headline is 3 lines.
- Cards (desktop and 390x844): Gym Scholar (Live) to https://gymscholar.lovable.app, Dyslexia Reading Platform (Live), Audiobook Studio (Live), FlowForm (In development), Women's Health OS (In development). All destinations returned 200. Every card's Feedback button opens the shared dialog tagged with the project; the site-wide button is present. The delivery endpoint is still a Formspree PLACEHOLDER.
- Tests: sdforest-pool-structure 19/19, sdforest-settled-structure 10/10, project-catalog-contract 21/21, sdforest-pool-ordering 3/3. `npm run build` passes. Engine JS and CSS are byte-identical to the skill.
- Not verified: a real phone or GPU performance on low-end devices (headless Chrome only).

## Capture hang: root cause

`serve.mjs` had no MIME entry for `.mjs`, so ES modules (`pool-page.mjs`, `project-catalog.mjs`) were served as `application/octet-stream`. Chrome refuses those, `pool.js` never reached `ScrollCraft.mount()`, `html.sc-ready` was never set, and `shoot.mjs` died at its 15s wait with no frames (reproduced: exit 1 after 17s, 0 files). With the entry: exit 0, full sheet. Fixed on the skill branch (51abd83). The run looked like a hang because the agent also ran `serve.mjs` as a blocking foreground command.

## Score

| Beat | Device |
|---|---|
| Recognition | pin + live WebGL cell, scroll dolly into the cutaway |
| Trust | flow + iris reveal |
| Range | pan (specimen rail) |
| Commitment | pin + pointer spotlight |

No assets were generated, no reference image is in the repo, and no paid service was called.

## Render pass 2026-10-01 (response to "glossy and basic")

What changed in `cell.js` (composition, palette, scroll dolly and reduced-motion still are unchanged):

- **Light and grade.** Soft-box environment (large warm key, cool fill, teal bounce, back rim strip) baked via PMREM; hemisphere + two gentle directionals. Post chain (three r180 addons vendored to `web/vendor/three/addons/` with the MIT licence, no CDN): 4x MSAA half-float target, restrained UnrealBloom (strength 0.3, threshold 0.92), Neutral tone map, then a grade pass (slight saturation, teal shadows, warm highlights, vignette, animated grain that also dithers the dark gradient). The canvas is now opaque and paints the page's own radial gradient so bloom behaves.
- **Membrane.** Fresnel translucency (injected into the physical material), a bump-mapped skin with soft-edged darker protein patches and an emissive term so it glows from within, and a real-thickness bilayer lip (two rounded beads, pale outer and blue inner) along the cut instead of a flat ring.
- **Cytoplasm.** Procedural satin texture (fbm mottling, granules, ink-blue cortex under the membrane, pale lip line, cavity darkening at the crease where the two faces meet) plus two granule layers that slide at different speeds as cytoplasmic streaming. Soft contact shadows under every organelle and a large one under the nucleus stand in for ambient occlusion. There are no real shadow maps.
- **Depth.** Dynamic depth fog tied to camera distance (near/far follow the dolly), a soft halo behind the cell, drifting motes for parallax. No true depth-of-field; fog stands in for it.
- **Organelles.** Mitochondria: outer membrane, inner membrane and alternating cristae. Nucleus: pored double envelope (golden-spiral pore rings, perinuclear space and two envelope lines on the cut), chromatin texture with dense clumps at the envelope, textured nucleolus. Golgi: nested curved extruded cisternae, cis pale to trans warm, with vesicles that bud and travel on explicit cycles. Rough ER: pleated stacked cisternae wrapping the nucleus, studded with instanced ribosomes. Peroxisomes with crystalline cores, lysosomes, vesicles, centrioles built as nine-tube barrels. 420 free ribosomes in varied size and colour stream on lanes whose speed depends on radius.
- **Performance guard.** Pixel ratio capped at 2, loop paused off-screen, and adaptive quality: sustained slow frames switch bloom off, then lower the pixel ratio. `?cell=lite` (no post chain, 0.5 DPR) exists only for verification on software GL. Load-time fallback chain kept: composer import failure falls back to a plain render, no WebGL falls back to the CSS slot.

## Close-act fix (the #679 blocker)

The close act had `data-sc-span="0.62"`, so progress collapsed and its link never lit. It is now `1.4`. Cue syntax matters too: a windowed cue always fades out at its end, so the heading and the "Return to the specimens" link now use hold cues (`data-sc-cue="0"` and `"0.08"`). Measured with the page scrolled to its end: link opacity 1 (was 0).

## Verification (this pass, built site, headless Chrome on a software rasteriser)

| Mode | Dead scroll | Contrast | Console errors |
|---|---|---|---|
| Desktop 1440x900 | none | all cues >= 4.5:1 | none |
| Phone 390x844 | none | all cues >= 4.5:1 | none |
| Reduced motion | none | all cues >= 4.5:1 | none |

- Sheets in `review/{desktop,mobile,reduced-motion}/sheet.png` were shot with `?cell=lite` because the full post chain on SwiftShader starves the main thread and `shoot.mjs` times out. So the sheets show the lit scene without bloom/grade/MSAA. `review/full-quality-*.jpg` are full-pipeline stills.
- Motion is real: same scroll position 1.5 s apart, 16.4% of pixels change (full pipeline) and 15.9% (lite); reduced motion 0 pixels.
- **Frame time: not meaningfully measurable here.** There is no GPU in this environment. On SwiftShader at 1440x900: full pipeline median 1.58 s/frame, lite median 0.27 s/frame, and the adaptive guard degraded as designed. These numbers say nothing about a real laptop or phone.
- Tests: 53/53 pass (pool-structure, settled-structure, project-catalog-contract, pool-ordering). `npm run build` passes. Engine JS/CSS byte-identical to the skill. `scrollcraft/builds/health/*` in sync with `web/pools/health/*`. `glossary-bundle.json` not committed.
