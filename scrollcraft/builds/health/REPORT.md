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
