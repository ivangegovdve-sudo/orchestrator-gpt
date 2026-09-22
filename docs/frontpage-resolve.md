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

The artwork-box `vh` values above are deliberately unchanged. Mobile **layout**, not artwork, uses `svh`: the stage minimum, scroll runway, title, field, cue and directory's baseline offset. The directory also retains a `vh`-based clearance calculation against the protected artwork. A toolbar change must not replace those artwork numbers with a different video contract.

Side entries leave a 32px gutter outside that rectangle before their selection/arrival transforms. On desktop widths >800px with aspect ratio <=3:2, the side gutters are too narrow for readable entries: the same DOM flows into two columns **below** the unchanged tree (top = 83vh + 24px). Mobile uses one column below it. No new ordering source is introduced.

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

The slot positions above describe wide desktop. The compact-desktop and mobile flow layouts preserve the same DOM order and timing, not those flank coordinates.

The early **Explore the pools** cue fades out with the background (−1→0); activating it opens the complete page immediately. A keyboard skip link is available on focus at every stage. Existing homepage paragraphs are retained verbatim after the stage and enter through normal document scrolling, not the video sequence. There are no other arriving layers, hidden project lists or invented destinations.

Once entered, all pool frames have restrained 5-second breathing and 18-second orbit loops. Hover/focus intensifies the ring; hover additionally makes the internal per-pool mark sway, pulse or rotate. Reduced motion disables **all** such loops. Selection scales an entry by 2.5% and increases bottom padding to 38px (46px on mobile) for its explicit **Enter** button. Flow rows therefore grow on selection; their height is not fixed and the containing stage must grow with them.

## Working page / animation connection

Serve the repository root with an ordinary static server, then open:

- `/?frame=resolve` — held time 0, tree only.
- `/?frame=opened` — held time 5, complete interface.
- `/?frame=hinge` — held time −0.5, half-dissolved world.
- `/` — terminal sequence scrubbed over a 125vh desktop / 125svh mobile runway: `t = −1 + 6 × scrollY / runway`, clamped to [−1,5]. Flow layouts put that runway in `.resolve-scroll` bottom padding, which the existing scroll sampler measures. Wide desktop retains the 1.25 × viewport-height fallback. There is still one clock and the same reversible `seek()` mathematics.

Mobile `.resolve-stage` is content-height with `overflow-x:clip; overflow-y:visible`. In scrub mode `min-height:calc(100svh + 560px)` is a **floor, not a ceiling**; `.resolve-scroll` is height:auto with 125svh bottom padding. Wrapped descriptions, enlarged text, selection and utility rows cannot be cut off by a fixed 560px continuation allowance.

These are query views of the **same existing homepage**, not new routes. `window.sdforestResolve.seek(seconds)` is the handoff for an external scroll/video clock. `window.sdforestResolve.open()` supplies the complete static state and disables the local scroll sampler. An integrated video driver should call `open()` once to release that sampler, then `seek(t)` using the shared clock. It must honour reduced motion rather than reintroducing animation. This slice does **not** contain, replace, or claim to finish Ivan's six-stage animation.

Reduced motion, an incoming fragment, restored navigation, and JavaScript disabled all get the opened composition. A no-JavaScript visitor follows ordinary native pool links; nothing is hidden awaiting an animation callback. With JavaScript, first click/tap selects, the separate Enter button navigates, keyboard selection focuses Enter, and Escape cancels selection and restores focus. This is not an OS double-click interaction.

## Rendered proof

Browser plugin DOM inspection was available, but its screenshot call failed. Screenshots and interaction verification therefore used installed Playwright with actual Chrome. Both the generated layout study and the final browser render were opened with `view_image` in the same QA pass. Native study size 1672×941 was also checked, in addition to 1920×1080 and 390×844.

| Frame | Desktop 1920×1080 | Mobile 390×844 |
|---|---|---|
| Resolve | [Screenshot](frontpage-proof/resolve-desktop.png) | [Screenshot](frontpage-proof/resolve-mobile.png) |
| Opened | [Screenshot](frontpage-proof/opened-desktop.png) | [Screenshot](frontpage-proof/opened-mobile.png) · [full continuation](frontpage-proof/opened-mobile-full.png) |
| Hinge | [Screenshot](frontpage-proof/hinge-desktop.png) | [Screenshot](frontpage-proof/hinge-mobile.png) |

The opened 1920×1080 desktop shows **7/7 full pool entries**; 390×844 mobile shows **6/7 full rows plus the start of My Story**, and scrolling reaches the complete seventh row and controls. Compact desktop 1024×768 now shows **2/7 full entries**, with the rest below the tree and reachable by scrolling; fitting all seven there previously overlapped the reserved rectangle. No horizontal overflow was observed. Measured desktop tree box: x=629.242, y=269.992, w=661.516, h=626.391. Mobile: x=62.406, y=110.758, w=265.188, h=251.109. Subpixel differences from the ideal numbers above are browser rounding. The before/opened tree boxes compare exactly equal within each viewport.

### Fidelity ledger

| Comparison | Study / brief | Rendered result or deliberate constraint |
|---|---|---|
| Composition | Centred large tree, open flanking entries | Exact numbered contract takes precedence over the study's slightly higher tree. All seven entries fit at 1920×1080; compact desktop flows below the tree. |
| Type | Large serif wordmark; quiet UI | Existing self-hosted Cormorant Garamond, Alegreya and Alegreya Sans reused. Desktop title 138px, phone 42.9px. |
| Palette | Dark electric page, warm illustrated departure | Computed background rgb(7,7,11); existing indigo/green tokens. All warm planes disappear at time 0. |
| Source art | Keep the existing tree and intricacy | Original layers preserved. Desktop source-resolution softness is explicit; generated study tree is **not** shipped as UI art. |
| Entry treatment | Open labels, thin motifs, no card grid | Native text and vector marks; no opaque large cards. Green/indigo accents and individual transforms follow pool identity. |
| Ordering | Respect catalog rather than concept label positions | #615 merged during work. Its ordering module is retained; no catalog or ordering logic changed. |
| Mobile | Same tree/voice, reachable entries | Single-column rows; fixed framing with a short-screen width cap. Title/canopy collision was found and fixed. |
| Existing controls | Secondary, legible, distinct from pools | History/feedback overlap and stray history-banner sliver were found and fixed in homepage-only styles. |
| Copy | No invented narrative or altered personal copy | Automated comparison: 2/2 existing paragraphs and 14/14 pool name/summary strings verbatim. Only functional controls added. No new narrative. |

The structure, typography, palette and interactions were faithfully verified against the accepted brief. The original asset's resolution ceiling is a remaining material visual limitation, not a hidden claim of final-quality video art. The [layout study](frontpage-proof/layout-study.png) is documentation only.

## Independent-review reconciliation — 2026-09-23

PR #619 remains the delivery branch. These findings were reproduced against its earlier head `7d29593`, not attributed to the deployed homepage merely because a screenshot looked similar.

### Navigation, framing and fallbacks

| Check | Measured result |
|---|---|
| Mobile clipping | At 320×390 with existing names/descriptions enlarged to 200%, the earlier stylesheet fixed the stage at **950px** while history ended at **1678.125px**. Page scrolling could not reach/hit its control. Now the stage grows to **1850.219px**, history ends at **1770.219px**, and the control is visibly hit-testable. Different wrapping after the flex-item fix accounts for the changed content height. The comparison serves the actual earlier stylesheet, not an approximation. |
| Wrapped/selected navigation | Browser regression covers 320×390, 780×390 and 390×844, enlarged text, selecting My Story, reaching and opening history with ordinary page scrolling, and stage scrollTop = **0**. No hidden internal scrolling is used to manufacture success. |
| Tree contract | All three `.resolve-tree` CSS rules and the entire `seek()` body compare unchanged against `7d29593`. Tree runtime writes remain filter-only. No timing list, timer or second clock added. |
| Reserved rectangle | Before: selected Health overlapped by **851.705px²** at 1920×1080; each of the six flank entries overlapped by **7195.875px²** at 1024×768. After: **0px²** for every portal at 1920×1080, 1366×768, 1024×768 and 820×1180, sampled at arrival times 0.9, 1.3, 1.8, 2.5, 3.2 and 5, plus Health/AI-d kit/My Story selection. |
| Narrow names | At the minimum tested width **320px**, all **7/7** existing pool names fit on one line; descriptions wrap without clipping or horizontal overflow. Each selected name also stays inside its entry. [Full rendered continuation](frontpage-proof/review-narrow-full.png). |
| Focus | Tab traverses **Health → AI-d kit → GrowingApp → TinkerBox → Design Gallery → Artificial Self → My Story**, matching DOM order. At t=0 none of the portals is focusable; at t=2 only the first two are; at t=4 and t=5 all seven are. Partly revealed entries remain inert. The skip link reveals itself on focus. |
| History after reverse scrub | An already-open drawer formerly overrode inherited visibility. Homepage-only `html[data-resolve-state="resolving"] .resolve-home .dh-root` and its `dissolving` counterpart now use display:none. Chrome clears existing drawer focus after rendering; a subsequent programmatic focus attempt cannot enter the hidden drawer. No application timer was added. |
| Reduced motion | Both initial preference and enabling it at t=2 produce the fully opened state: **7/7** usable portals, world opacity **0**, **0** running animations. No-JS and incoming-fragment cases remain usable. |
| Slow/failed backgrounds | Requests for sky/sunset/mist/landscape were held pending, then separately aborted. In both cases the tree decoded at **864px** source width, the actual scroll reached opened, **7/7** portals became usable, world opacity became **0**, and there were **0** uncaught runtime errors. Background failures do not gate the tree/module. [Failed-background render](frontpage-proof/review-failed-backgrounds.png). |

The `svh` checks use actual Chrome at mobile viewport sizes and a separate measured CSS-runway regression (500px forward gives t=5; reversing to 250px gives t=2). Physical iOS/Android collapsing toolbars were **not** exercised on hardware; that remains an explicitly unverified platform behavior, not a claim of device testing.

### Deployed defects versus this PR

The live homepage was fetched successfully and visually inspected on 2026-09-23 ([live capture](frontpage-proof/review-live-desktop.png)). It has both the seven-pool directory and an additional stale legacy rail; the four legacy items are not the entirety of its navigation.

| Reported defect | PR evidence / disposition |
|---|---|
| a. Letterspaced eyebrow inside foliage | Resolved: `.landing-kicker` does not exist in the new homepage. `.resolve-title` sits above the tree; desktop and short-phone title clearance is tested. |
| b. Hard purple closed crown | Resolved: `.title-crown-canopy` does not exist. `.resolve-tree image` is the unchanged original transparent tree layer with a soft filter glow, not a stroked canopy outline. |
| c. Trunk amputated by body copy | Resolved: the full original tree, including its base, is visible; `.resolve-existing-copy` begins after the stage, below the tree. No paragraph overlays the trunk. |
| d. Isolated saturated green CTA | Resolved: `.resolve-scroll-cue` is neutral text without a filled green pill. Existing green is distributed across three pool motifs, connection nodes, the restrained tree glow and the Enter outline; indigo is retained. The palette was not silently changed to violet-only. |
| e. Four legacy items / retired hub presented beside seven-pool promise | Navigation resolved: `[data-pool-directory]` has all seven canonical links and the old `[data-forest-nav-root]` is absent; no retired-kids-hub link is mounted. **Residual copy issue:** the preserved paragraph still says “one of seven live pools below”, although it now follows the directory. Its directional word is stale. The explicit do-not-edit-narrative/copy constraint prevented rewriting the retained paragraph; this is not claimed fixed. |

### Code versus contract: explicit corrections

| Earlier contract text | Conflicting code / observed behavior | Reconciliation |
|---|---|---|
| “The mobile stage leaves continuation space for every entry.” | `.resolve-stage { height:calc(100vh + 560px); }` with inherited `overflow:hidden` cut off variable-height content. | Content defines stage height; the minimum and separate scroll runway are documented above. |
| “The seven entry hit areas remain stable” | `.portal.is-selected { scale:1.025; padding-bottom:38px; }`, with mobile padding-bottom:46px, changes row height. | Contract now describes selection growth, not fixed hit areas. |
| “At 1024×768 all seven entries also fit.” | `.portal { width:29vw; }` put all six flank boxes across the tree's reserved rectangle. | Compact-desktop entries flow below the tree; **2/7** fit above the fold. Artwork remains unchanged. |
| “At time 0, only the tree is visible” | Shared `.dh-root.is-open .dh-drawer { visibility:visible; }` could keep an open drawer visible after rewind. | Homepage resolving/dissolving states hide the whole history host; regression includes a previously open drawer. |
| “Hover/focus intensifies the ring; the internal per-pool mark sways, pulses or rotates.” | Ring selectors include `:focus-visible`; internal `svg` animation selectors use only `:hover`. | Wording now distinguishes ring focus feedback from hover-only interior animation. |

### Review screenshots

| Before / after or edge case | Rendered evidence |
|---|---|
| Enlarged-text navigation, 320×390 | [Earlier stylesheet: unreachable controls](frontpage-proof/review-before-controls.png) · [Fixed: reachable controls](frontpage-proof/review-after-controls.png) |
| Selection without tree overlap, 1920×1080 | [Health selected](frontpage-proof/review-desktop-selected.png) |
| Compact desktop, 1024×768 | [Two rows in view; continuation below](frontpage-proof/review-opened-1024x768.png) |
| Landscape phone, 780×390 | [Opened](frontpage-proof/review-opened-780x390.png) |

## Verification and scope

- Separate browser lane before review: **11/11**; after review: **19/19**. The earlier checks missed variable-height clipping and selected-box overlap; new regressions cover those, CSS-measured runway, narrow names, focus order, open-history rewind, mid-sequence reduced motion and pending/failed backgrounds. No test was removed or skipped.
- Additional actual-use checks: history opens/closes; keyboard Enter selects and focuses explicit Enter; Escape returns focus. At 1024×768 two entries fit without violating the reserved artwork rectangle; all seven remain reachable.
- `npm test`: baseline **188/189**; after rebasing merged #615 **191/192**. The additional three are #615's tests, not suppressed failures. Sole failure remains `scratch/tests/ai-kit-offers.test.js:38`, expected `c7d630…`, Windows checkout `008ceb…`. Known CRLF source-integrity artifact left unchanged.
- Because that failure short-circuits the runner, the built-page suite was run separately: `node --test scratch/tests/sdforest-foundation.test.js` **6/6**.
- Browser command: `node --test scratch/tests/frontpage-resolve.test.js`, with Playwright resolvable and optional `CHROME_PATH` pointing to installed Chrome. Existing validation and its runner were not edited.
- `git diff origin/main --name-status --diff-filter=DR`: no renamed or deleted files. No pool page, catalog, rank, tier, registry or existing validator changed. Existing root route and all seven destination hrefs retained. Removed homepage-only legacy animation mounting; its source files and every route remain.
- No migration, deployment, review approval or merge performed by this slice. PR targets main. Screenshots are repository-visible so they do not depend on access to BUTCHER's drives.
