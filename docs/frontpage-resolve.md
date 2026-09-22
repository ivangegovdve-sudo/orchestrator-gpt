# SD Forest — front-page resolve contract

2026-09-22 · BUTCHER · front page only. This is the terminal-sequence layout and timing contract for Ivan's animation, not a new tree or a completed seed-to-tree video.

## The two frames

The references supply colour, texture and mood, **not** final composition. The warm, illustrated world dissolves completely; the centred tree remains. The page then introduces the existing dark field, fine electric connections, serif display type and green/indigo accents. These are two deliberate lighting registers, not a blended new palette.

At time **0**, only the tree is visible on `#07070b`. At **4.4 seconds**, the page is fully opened. The tree's position and scale are identical in both frames. Decorative motion never supplies navigation structure.

| Contract | Desktop, width >800 CSS px | Portrait/mobile, width <=800 CSS px |
|---|---|---|
| Artwork-box centre | **50vw, 54vh** | **50vw, 28vh** |
| Artwork-box size | **58vh high**, width = height × 226/214 | **min(68vw, 32vh) wide**, height = width × 214/226 |
| Top / bottom | **25vh / 83vh** | centre ± half artwork height |
| Example | 1920×1080: x=629.24, y=270.00, width=661.52, height=626.40 | 390×844: x=62.40, y=110.76, width=265.20, height=251.12 |

For a landscape phone <=800 px wide, the centre is **50vw, 40vh**, with the same width cap. This keeps the title above the tree on short screens. These are CSS viewport units, not device pixels; measure the composition against the actual viewport, not the encoded video's surrounding letterbox. The tree is contained, never stretched or cover-cropped. On desktop, reserve the central 61.2523vh-wide × 58vh-high rectangle; pool entries occupy the flanks and the space below the roots.

### Asset boundary

`[data-title-crown]` is the artwork-box anchor. Its current SVG `viewBox="93 158 226 214"` frames the meaningful alpha bounds of the unchanged 864×480 original layer. Do **not** align to the full mostly-transparent source canvas. An eventual higher-resolution render must preserve the artwork box, using its own corresponding tight alpha viewBox.

The supplied tree contains only about 226×214 pixels of meaningful detail; the desktop screenshot necessarily enlarges it. This implementation verifies geometry and interaction, not final-video sharpness. No tree was generated, retouched or upscaled into invented detail. All six shipped layers are byte-for-byte originals, with hashes in [asset provenance](../web/assets/sdforest-resolve/README.md). Background layers are composed as DOM images, not a second tree.

## Arrival sheet — seconds relative to the resolve frame

The runtime has no playback timer. It samples a reversible time value. Opacity and transforms use smoothstep `p²(3−2p)`, where p is the clamped normalized interval. A reverse scrub uses the same function, never a restarted animation.

The following named sequence reflects the unchanged catalog ranks after #615: Health 7, AI-d kit 6, GrowingApp 5, TinkerBox 4, Design Gallery 3, Artificial Self 2, My Story 1. The **existing `pool-directory.mjs` owns order**. Arrival start is `0.8 + 0.32 × current DOM index`, duration 0.72 seconds; it is not a second hand-maintained rank list. The native fallback contains all seven links even without that module.

| Element | Start → end | Arrival / role |
|---|---|---|
| Five background planes | −1.00 → 0.00 | Fade 1→0 together, revealing the existing dark field. The tree never fades or moves. |
| Tree illumination | −1.00 → 0.00 | A restrained green edge glow reaches 30px / 8% opacity as the warm surrounding light leaves. Original tree pixels remain unchanged. |
| Electric field, ellipses, connecting paths and nodes | 0.05 → 0.60 | Fade in; a fine continuation of the homepage's neural motif, behind the tree and controls. |
| Forest HUB + existing subtitle | 0.18 → 0.95 | Fade in as one title plate. |
| SDForest home control | 0.30 → 0.90 | Fade in at the upper-left edge. |
| Health | 0.80 → 1.52 | Fade and scale 0.85→1; green pulse motif. Slot 1: upper left. |
| AI-d kit | 1.12 → 1.84 | Fade and translate x −34px→0; green aid/star motif. Slot 2: middle left. |
| GrowingApp | 1.44 → 2.16 | Fade, rise 30px and scale 0.94→1; indigo leaf motif. Slot 3: lower left. |
| TinkerBox | 1.76 → 2.48 | Fade, translate (−12px,20px)→0 and rotate −6°→0; indigo construction motif. Slot 4: upper right. |
| Design Gallery | 2.08 → 2.80 | Fade, x 26px→0 and horizontal reveal 0→100%; indigo nested exhibit frames. Slot 5: middle right. |
| Artificial Self | 2.40 → 3.12 | Fade and blur 8px→0; green spiral motif. Slot 6: lower right. |
| My Story | 2.72 → 3.44 | Fade and gentle 14px rise; indigo open-book motif. Slot 7: below the tree. No new story copy. |
| Portfolio control | 3.65 → 4.20 | Fade in at the lower-left edge. Existing external-tab warning and destination retained. |
| Design history + Feedback controls | 3.85 → 4.40 | Fade in together at the lower-right edge; existing behaviours retained. |

The early **Explore the pools** cue fades out with the background (−1→0); activating it opens the complete page immediately. A keyboard skip link is available on focus at every stage. Existing homepage paragraphs are retained verbatim after the stage and enter through normal document scrolling, not the video sequence. There are no other arriving layers, hidden project lists or invented destinations.

Once entered, all pool frames have restrained 5-second breathing and 18-second orbit loops. Hover/focus intensifies the ring; the internal per-pool mark sways, pulses or rotates. Reduced motion disables **all** such loops. The seven entry hit areas remain stable; selection enlarges one by just 2.5% and reveals its explicit **Enter** button.

## Working page / animation connection

Serve the repository root with an ordinary static server, then open:

- `/?frame=resolve` — held time 0, tree only.
- `/?frame=opened` — held time 5, complete interface.
- `/?frame=hinge` — held time −0.5, half-dissolved world.
- `/` — terminal sequence scrubbed by the first 125vh of scroll: `t = −1 + 6 × scrollY / (1.25 × viewportHeight)`, clamped to [−1,5]. The mobile stage leaves continuation space for every entry.

These are query views of the **same existing homepage**, not new routes. `window.sdforestResolve.seek(seconds)` is the handoff for an external scroll/video clock. `window.sdforestResolve.open()` supplies the complete static state and disables the local scroll sampler. An integrated video driver should call `open()` once to release that sampler, then `seek(t)` using the shared clock. It must honour reduced motion rather than reintroducing animation. This slice does **not** contain, replace, or claim to finish Ivan's six-stage animation.

Reduced motion, an incoming fragment, restored navigation, and JavaScript disabled all get the opened composition. A no-JavaScript visitor follows ordinary native pool links; nothing is hidden awaiting an animation callback. With JavaScript, first click/tap selects, the separate Enter button navigates, keyboard selection focuses Enter, and Escape cancels selection and restores focus. This is not an OS double-click interaction.

## Rendered proof

Browser plugin DOM inspection was available, but its screenshot call failed. Screenshots and interaction verification therefore used installed Playwright with actual Chrome. Both the generated layout study and the final browser render were opened with `view_image` in the same QA pass. Native study size 1672×941 was also checked, in addition to 1920×1080 and 390×844.

| Frame | Desktop 1920×1080 | Mobile 390×844 |
|---|---|---|
| Resolve | [Screenshot](frontpage-proof/resolve-desktop.png) | [Screenshot](frontpage-proof/resolve-mobile.png) |
| Opened | [Screenshot](frontpage-proof/opened-desktop.png) | [Screenshot](frontpage-proof/opened-mobile.png) · [full continuation](frontpage-proof/opened-mobile-full.png) |
| Hinge | [Screenshot](frontpage-proof/hinge-desktop.png) | [Screenshot](frontpage-proof/hinge-mobile.png) |

The opened desktop shows **7/7 full pool entries**; mobile shows **6/7 full rows plus the start of My Story**, and scrolling reaches the complete seventh row and controls. No horizontal overflow was observed. Measured desktop tree box: x=629.242, y=269.992, w=661.516, h=626.391. Mobile: x=62.406, y=110.758, w=265.188, h=251.109. Subpixel differences from the ideal numbers above are browser rounding. The before/opened tree boxes compare exactly equal within each viewport.

### Fidelity ledger

| Comparison | Study / brief | Rendered result or deliberate constraint |
|---|---|---|
| Composition | Centred large tree, open flanking entries | Exact numbered contract takes precedence over the study's slightly higher tree. All seven entries fit on desktop. |
| Type | Large serif wordmark; quiet UI | Existing self-hosted Cormorant Garamond, Alegreya and Alegreya Sans reused. Desktop title 138px, phone 42.9px. |
| Palette | Dark electric page, warm illustrated departure | Computed background rgb(7,7,11); existing indigo/green tokens. All warm planes disappear at time 0. |
| Source art | Keep the existing tree and intricacy | Original layers preserved. Desktop source-resolution softness is explicit; generated study tree is **not** shipped as UI art. |
| Entry treatment | Open labels, thin motifs, no card grid | Native text and vector marks; no opaque large cards. Green/indigo accents and individual transforms follow pool identity. |
| Ordering | Respect catalog rather than concept label positions | #615 merged during work. Its ordering module is retained; no catalog or ordering logic changed. |
| Mobile | Same tree/voice, reachable entries | Single-column rows; fixed framing with a short-screen width cap. Title/canopy collision was found and fixed. |
| Existing controls | Secondary, legible, distinct from pools | History/feedback overlap and stray history-banner sliver were found and fixed in homepage-only styles. |
| Copy | No invented narrative or altered personal copy | Automated comparison: 2/2 existing paragraphs and 14/14 pool name/summary strings verbatim. Only functional controls added. No new narrative. |

The structure, typography, palette and interactions were faithfully verified against the accepted brief. The original asset's resolution ceiling is a remaining material visual limitation, not a hidden claim of final-quality video art. The [layout study](frontpage-proof/layout-study.png) is documentation only.

## Verification and scope

- New separate browser lane: **11/11**. Initially 7/7 failed for the missing stage; later collision checks also failed before their fixes. Includes precise geometry, reversible dissolve, real scroll, keyboard skip, two-step navigation, no-JS/reduced-motion, phone access, fragment arrival, asset errors, utilities, short-screen title clearance and returning from a pool without replay.
- Additional actual-use checks: history opens/closes; keyboard Enter selects and focuses explicit Enter; Escape returns focus. At 1024×768 all seven entries also fit.
- `npm test`: baseline **188/189**; after rebasing merged #615 **191/192**. The additional three are #615's tests, not suppressed failures. Sole failure remains `scratch/tests/ai-kit-offers.test.js:38`, expected `c7d630…`, Windows checkout `008ceb…`. Known CRLF source-integrity artifact left unchanged.
- Because that failure short-circuits the runner, the built-page suite was run separately: `node --test scratch/tests/sdforest-foundation.test.js` **6/6**.
- Browser command: `node --test scratch/tests/frontpage-resolve.test.js`, with Playwright resolvable and optional `CHROME_PATH` pointing to installed Chrome. Existing validation and its runner were not edited.
- `git diff origin/main --name-status --diff-filter=DR`: no renamed or deleted files. No pool page, catalog, rank, tier, registry or existing validator changed. Existing root route and all seven destination hrefs retained. Removed homepage-only legacy animation mounting; its source files and every route remain.
- No migration, deployment, review approval or merge performed by this slice. PR targets main. Screenshots are repository-visible so they do not depend on access to BUTCHER's drives.
