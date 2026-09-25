# SD Forest — front-page resolve contract

Current intro: the existing 25.208-second Drive growth master is now the
full-screen, reversible scroll surface from seed to mature tree. Its browser
derivative and exact provenance are recorded in
[the growth-film README](../web/assets/sdforest-intro/README.md). It adds no
second clock: the existing `seek()` sampler owns film time, the warm-to-dark
handoff and the established 0→5 page arrivals.

Current correction: [fixed plate, rooted contact and readable instruments](frontpage-refinement-2026-09-24.md).
This supersedes the older grass/contact, moving-foreground and summary treatments.
Historical test counts below are receipts for their named heads, not current results.

Current artwork/environment: [approved tree and sunset correction](frontpage-tree-2026-09-24.md).
It supersedes the opened-page night palette and thumbnail asset descriptions
in the historical receipts below; numbered artwork-box geometry is unchanged.

Current interaction/layout supplement: [approved 2026-09-24 correction](frontpage-correction-2026-09-24.md).
It supersedes earlier phone-thumbnail, lower-control placement and decorative-vine
descriptions below. The numbered tree geometry and pure seek timing remain the
unchanged video hand-off contract; pool arrivals still follow the current DOM.

2026-09-23 · BUTCHER · front page only. Updated for the approved embedded-forest revision. This is the terminal-sequence layout and timing contract for Ivan's animation, not a new tree or a completed seed-to-tree video. Earlier review and ambient receipts below are historical; the current environment and inset-title results are in [the embedded-forest receipt](frontpage-embedded.md). The unchanged mechanical interactions are documented in [the workbench receipt](frontpage-workbench.md).

## The two frames

The references supply colour, texture and mood, **not** final composition. The introductory world dissolves completely; the centred tree remains. Following Ivan's 2026-09-24 correction, the opened page introduces a lighter illustrated sunset valley, separate pale mist and the existing connected bark controls. The earlier night-blue opened environment is superseded. Time zero remains tree-only on the dark field.

At time **−6**, the film holds on its seed. Scroll maps the growth film through
time **−0.5**, then the last half-second reframes and dissolves into time **0**:
only the fixed page tree on `#07070b`. At **4.4 seconds**, the page is fully
opened. The fixed page tree's position and scale are identical at time 0 and in
the opened frame. Decorative motion never supplies navigation structure.

| Contract | Desktop, width >800 CSS px | Portrait/mobile, width <=800 CSS px |
|---|---|---|
| Artwork-box centre | **50vw, 54vh** | **50vw, 28vh** |
| Artwork-box size | **58vh high**, width = height × 226/214 | **min(68vw, 32vh) wide**, height = width × 214/226 |
| Top / bottom | **25vh / 83vh** | centre ± half artwork height |
| Example | 1920×1080: x=629.24, y=270.00, width=661.52, height=626.40 | 390×844: x=62.40, y=110.76, width=265.20, height=251.12 |

For a landscape phone <=800 px wide, the centre is **50vw, 40vh**, with the same width cap. This keeps the title above the tree on short screens. These are CSS viewport units, not device pixels; measure the composition against the actual viewport, not the encoded video's surrounding letterbox. The tree is contained, never stretched or cover-cropped. On desktop, reserve the central 61.2523vh-wide × 58vh-high rectangle; pool entries occupy the flanks and the space below the roots.

The artwork-box `vh` values above are deliberately unchanged. Mobile **layout**, not artwork, uses `svh`: the stage minimum, scroll runway, title, field, cue and directory's baseline offset. The directory also retains a `vh`-based clearance calculation against the protected artwork. A toolbar change must not replace those artwork numbers with a different video contract.

Wide-desktop side entries use width `min(29vw,calc(47vw - 58vh * 226 / 214 / 2 - 24px))`, with a 2vw outside inset. At 1920×1080 this leaves 43.23px between each flank and the protected tree rectangle. Health and AI-d kit lead at 13vh; GrowingApp and Artificial Self sit at 40vh. TinkerBox and Design Gallery are at 67vh with the same width as the leading controls and aspect ratio 4:1. My Story remains centred at `83vh + 12px`, width `min(29vw,39vh)`, aspect ratio 4:1. Selection never grows their desktop boxes. On desktop widths >800px with aspect ratio <=3:2, the same DOM flows into two columns **below** the unchanged tree (top = 83vh + 24px). Mobile uses one column below it. Arrivals and keyboard order follow the existing final DOM; CSS composition is not a new catalog ranking.

On wide desktops 700–850px high, My Story additionally caps width at
`calc(68vh - 264px)` to clear the utility strip. Lower type scales with viewport
height. Lower-flank drawers open above their controls; the My Story drawer opens
to its left. Explanations and selection hints share the drawer, not the artwork.

### Asset boundary

`[data-title-crown]` is the artwork-box anchor. Its SVG `viewBox="93 158 226 214"` and every CSS geometry number remain unchanged. The new 1254×1254 alpha tree maps into x=93, y=158, width=226, height=214 with `preserveAspectRatio="xMidYMax meet"`. The square artwork is bottom-aligned and contained, not stretched. Align the video to the outer artwork-box contract, not to the source image's canvas.

The original Qwen tree contains only about 226×214 pixels of meaningful detail. Its six original layers remain byte-for-byte unchanged, with hashes in [original asset provenance](../web/assets/sdforest-resolve/README.md), but that thumbnail is no longer the displayed tree. The current tree is a reference-derived generative reconstruction with explicitly generated detail, documented in [current asset provenance](../web/assets/sdforest-sunset/README.md). Background layers remain separate DOM images, never a second tree.

## Arrival sheet — seconds relative to the resolve frame

The runtime has no playback timer. It samples a reversible time value. Opacity and transforms use smoothstep `p²(3−2p)`, where p is the clamped normalized interval. A reverse scrub uses the same function, never a restarted animation.

The existing directory reads catalog ranks, then the already-approved front-page
controller appends the anchors marked `data-final-pool` to the end. The observed
DOM order is Health, AI-d kit, GrowingApp, Artificial Self, My Story, TinkerBox,
Design Gallery. This correction changes neither operation nor any rank. Arrival
start remains `0.8 + 0.32 × current DOM index`, duration 0.72 seconds; the table is
documentation, never another runtime list. The native fallback contains all seven.

| Element | Start → end | Arrival / role |
|---|---|---|
| Existing Drive growth film | −6.00 → −0.50 | Full-screen seed-to-mature growth. The media remains paused; scroll seeks the same timeline forward and backward. |
| Film/page tree handoff | −0.50 → 0.00 | The final film frame reframes without exposing an edge, existing mist darkens the warm scene, the film fades, and the fixed tree reveals late in the dissolve. The fixed tree's box never moves or resizes. |
| Four background planes | −1.00 → 0.00 | Fade 1→0 together behind the growth-film handoff, revealing the existing dark field. The fixed tree's box never moves. |
| Tree illumination | −1.00 → 0.00 | Existing restrained edge glow reaches 30px / 8% opacity. The new tree is constant throughout the sequence; only filter changes. |
| Sunset valley, subtle mist and connected bark | 0.05 → 0.60 | Fade in behind the tree and controls. The compact/mobile directory's dark bark backing follows this same interval. The earlier orbit ellipses and connecting paths remain removed. |
| Forest HUB + existing subtitle | 0.18 → 0.95 | Fade in as one title plate. |
| SDForest home control | 0.30 → 0.90 | Fade in at the upper-left edge. |
| Health | 0.80 → 1.52 | Fade and scale 0.85→1; glass ECG with aqua lettering. Upper left. |
| AI-d kit | 1.12 → 1.84 | Fade and translate x +34px→0; green first-aid flag, white cross and purple lever. Upper right. |
| GrowingApp | 1.44 → 2.16 | Fade, rise 30px and scale 0.94→1; seed/sapling/tree triptych. Below Health. |
| Artificial Self | 1.76 → 2.48 | Fade and blur 8px→0; connected violet/teal neurons. Below AI-d kit. |
| My Story | 2.08 → 2.80 | Fade and gentle 14px rise; existing signal unchanged. Bottom centre. No new story copy. |
| TinkerBox | 2.40 → 3.12 | Fade, translate (−12px,20px)→0 and rotate −3°→0; locking compartment. Bottom left. |
| Design Gallery | 2.72 → 3.44 | Fade, x 26px→0 and horizontal reveal 0→100%; compact exhibit shutters. Bottom right. |
| Ground and sparse air | 3.60 → 4.40 | Approved illustrated root bed and vegetation fade in at the fixed trunk base. The previous turf and synthetic blades are replaced, not layered underneath. This decorative layer is absent at the resolve frame. Ambient time starts only once arrivals finish. |
| Portfolio + Pause motion controls | 3.65 → 4.20 | Fade in at the lower-left edge. Existing external-tab warning and destination retained. Pause motion is a native button; no-JS omits it. |
| Design history + Feedback controls | 3.85 → 4.40 | Fade in together at the lower-right edge; existing behaviours retained. |

The slot positions above describe wide desktop. The compact-desktop and mobile flow layouts preserve the same DOM order and timing, not those flank coordinates. The opened-page sunset valley is a separate reference-derived asset, not the intro's warm-world plane kept partly visible. At t=0 both environments and the mobile bark backing are absent; reversing the shared seek restores that exact tree-only frame. Explanations retain their existing wording in full-width, high-contrast drawers; selection hints sit inside those drawers. Phone/tablet flow reserves measured drawer height. No pool wording or idle placement changed.

The early **Explore the pools** cue fades out with the background (−1→0); activating it opens the complete page immediately. A keyboard skip link is available on focus at every stage. Existing homepage paragraphs are retained verbatim after the stage and enter through normal document scrolling, not the video sequence. There are no other arriving layers, hidden project lists or invented destinations.

Once opened, seven material mechanisms replace the repeated rings. Their idle responses sample the existing wind field; hover/focus and selection change the mechanism's pose. First press anywhere selects and animates; a second deliberate press on that same entry follows its existing link. No separate Enter button remains. Escape cancels. A double-click or held Enter key cannot confirm entry. Selection does not scale the anchor. Mobile rows grow only to make room for the visible selection instruction; the content-height stage keeps every control reachable. Reduced motion stops **all** motion and switches selection pose immediately. Details and measured costs are in [the workbench receipt](frontpage-workbench.md).

## Working page / animation connection

Serve the repository root with an ordinary static server, then open:

- `/?frame=resolve` — held time 0, tree only.
- `/?frame=opened` — held time 5, complete interface.
- `/?frame=hinge` — held time −0.5, half-dissolved world.
- `/` — integrated growth and terminal sequence scrubbed over a 550vh desktop
  / 550svh mobile growth runway: `t = −6 + 11 × scrollY / runway`, clamped
  to [−6,5]. Compact and mobile layouts use a sticky viewport scene followed by
  a separate in-flow runway; the directory then follows in ordinary document
  flow. Wide desktop uses a 650vh stage, leaving the same 550vh scroll range.
  There is still one clock and the same reversible `seek()` mathematics.

Mobile `.resolve-stage` remains content-height with `overflow-x:clip;
overflow-y:visible`. The sticky `.resolve-scene` occupies 100svh, the separate
`.resolve-growth-runway` supplies 450svh below it, and the variable-height
directory follows that runway. Wrapped descriptions, enlarged text, selection
and utility rows therefore remain reachable without being placed inside a fixed
continuation allowance.

These are query views of the **same existing homepage**, not new routes.
`window.sdforestResolve.seek(seconds)` remains the deterministic inspection
handoff. `window.sdforestResolve.open()` supplies the complete static state and
disables the local scroll sampler. Reduced motion, direct static frames and a
failed media request never load or gate on the growth film; they open the
navigable composition. The integrated film contains no narration or audio—the
Drive master has no audio—and does not claim the filmed and page trees are
pixel-identical.

Reduced motion, an incoming fragment, restored navigation, and JavaScript disabled all get the opened composition. A no-JavaScript visitor follows ordinary native pool links; nothing is hidden awaiting an animation callback. With JavaScript, first click/tap or Enter selects; the next deliberate press on that same link navigates. Focus stays on the link, and Escape cancels selection. This is not an OS double-click interaction.

## Archived verification receipts — earlier #619 iterations

The sections below preserve earlier test results and observations for discoverability. Their references to rings, a separate Enter button, 138px type, earlier fold counts and the old ambient baseline describe those earlier heads, **not** the current approved workbench. The current receipt, screenshots, costs and code/contract reconciliation are in [frontpage-workbench.md](frontpage-workbench.md).

### Original rendered proof

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

## Approved ambient layer — 2026-09-23

### Technique reference and boundary

The reference was Lentils' [claude-opus-5-ghibli / Hoshi-no-Tani](https://codepen.io/lentils801/pen/019f9b4b-10d7-7f77-817f-f4eb83fdb289), linked from [Found Work](https://sdforest.site/web/gallery/). It belongs to its author, not SD Forest. The rendered scene was studied for technique, not copied or ported. Observations in my own words: vegetation moving in broad related patches feels like air passing through a place; a contact patch makes a foreground object feel weighted; lower-contrast distance and sparse near/far particles suggest depth. These observations are not claims about the reference's internal algorithm. No reference source code, assets, composition, terrain, train or distinctive scene elements were reused.

The approved implementation uses original SVG paths for a small code-native moss/grass contact patch, not a substitute tree or a new illustrated world. Four grass groups sample one original smooth value-noise field, with nearer groups delayed 0.4/0.6 seconds and farther groups 1.7/2.3 seconds. Its lattice spacing is nine seconds; no periodic sine loops per blade. `--ambient-strength` on the root defaults to 0.65, accepts 0–1, and zero settles the whole layer. Six motes on desktop / three on mobile fade to zero at both ends of their paths; nearer ones are larger, rise faster and have a fixed slight blur. No continuously animated blur/filter is used.

**Deliberately omitted:** crown movement, leaf/branch articulation, rare events, and mist parallax, as approved. The actual `mist.png` includes illustrated mountains/cloud forms and is not neutral haze. The optional moving backlight was also cut: the existing static illumination already holds the composition, and another moving layer did not earn its frame cost. The tree asset remains unchanged, including its resolution ceiling.

### One scheduler, fixed geometry

- The complete `seek()` body remains byte-identical (after line-ending normalization) to `d0377dd`. It remains a deterministic smoothstep sample of `current`, with DOM-index pool arrival order. The exported wrapper updates ambient visibility and scheduling **after** that sample. Ambient frames never call `seek()`.
- One `requestAnimationFrame` owner serves dirty scroll samples and ambient time. No timer or second clock was introduced. Ambient elapsed time accumulates only while opened, visible, on-screen and unpaused; it cannot catch up a hidden interval. The clock keeps frame-rate scroll response, but low-frequency decor is sampled approximately 1.5 times/second. Even the nearest mote advances less than 0.9 CSS pixels per visual sample.
- The three `.resolve-tree` CSS rules, its original SVG/image markup, and the numbered hand-off table are unchanged. Only the pre-existing filter write touches that tree at runtime.
- Ground sits at the tree-box base: desktop `(50vw,83vh)`; phone `(50vw,28vh + min(68vw,32vh) × 214/226/2)`; landscape substitutes the existing `40vh` tree centre. The patch extends upward from that anchor. It does not alter layout or the reserved rectangle.
- Decorative motion writes only transform/opacity on isolated elements. No geometry or computed-style reads occur on ambient-only frames. Small composited elements are promoted only while running; paused/offscreen/reduced states release the promotion hints.
- Feedback mounts directly into the homepage's explicit `data-feedback-slot`, bypassing its otherwise unnecessary placement rAF. Pages without that slot keep the existing fixed-control scheduler and behavior.
- Pause motion freezes the current composition and stops requesting frames. Reduced motion uses a composed still ground with no visible air and zero running motion. No-JS retains the same static ground and ordinary native pool links. All decoration is `aria-hidden`, inert and pointer-transparent, behind navigation.

### Performance protocol

BUTCHER / installed Chrome, **390×844, DPR 2, 4× CPU throttling**, is a mid-range-phone CPU proxy, not a measurement of physical phone hardware or GPU/battery cost. Two paired 10-second steady-state runs compare the exact prior head `d0377dd` with the ambient implementation. The cost measurement uses uninstrumented production code plus CDP `Performance.getMetrics`, without tracing or callback probes; this avoids charging trace/probe overhead as product cost. A separate trace records callbacks, paints, layout and dropped-frame events. Background documents and paused state are measured separately from running decor.

The first implementation cost approximately **5.4ms/frame** in the instrumented trace and performed layout on every frame. It was rejected. Inherited directory variables were replaced with isolated decorative elements; moving SVG groups became composited wrappers; autonomous pool CSS loops were removed; optional lighting was omitted; and the visual update rate was reduced to match the very slow motion.

| Uninstrumented production sample | Baseline ms / 60Hz frame | Ambient ms / 60Hz frame | Added cost |
|---|---:|---:|---:|
| Pair 1 | 0.0266 | 0.4863 | 0.4596ms / 2.76% |
| Pair 2 | 0.0220 | 0.6099 | 0.5879ms / 3.53% |
| Paused | — | 0.0084 | No animation frames, layout or style recalculation |

These are total renderer-main-thread task time averaged over each ten-second window, divided by its 60Hz frame opportunities, **not** callback-only cost or a guarantee that every frame is under that value. Mean incremental cost is 0.5238ms / 3.14%. The proposed 0.50ms target is narrowly missed in the mean and one pair; this is reported, not rounded into a strict pass. The final layer is within roughly 3% of the emulated frame budget after the cuts, but physical-device performance remains unverified.

The separate ten-second instrumented trace recorded **564 callbacks**, callback median **0ms** at the browser's timing resolution, p95 **0.40ms**, callback-gap p95 **18.1ms**, **0 gaps >25ms**, **15 intentional decorative draws**, **0 Paint events**, **0 layouts**, and **0 trace-reported DroppedFrame events**. Zero median does not mean zero work: most clock callbacks only schedule the next frame. The paused trace recorded **0 callbacks / draws / paints / layouts**. The visibility-event regression supplies the hidden/visible boundary while keeping the real rAF scheduler; offscreen pause is exercised by real page scrolling. This is not a claim of a physical phone being backgrounded.

Reproduce with the existing Playwright browser-test setup and the root static server:

```text
node scratch/frontpage-ambient-profile.cjs
```

Optional environment variables: `CHROME_PATH` selects installed Chrome, `SDFOREST_BASE_URL` selects the local root server (default `http://127.0.0.1:4176`), `SDFOREST_PROFILE_TRACE=1` enables the separate diagnostic trace/probe, and `SDFOREST_PROFILE_OUT` saves results/traces in an explicit output directory. Do not compare instrumented trace cost directly with the uninstrumented table. The baseline is fetched from the exact existing git blob, not a recreated approximation.

### Rendered acceptance and scope

| Viewport | Full pool entries before → after | Tree box before = after (x, y, w, h in px) | Screenshots |
|---|---:|---|---|
| 1920×1080 | 7 → 7 | 629.242, 269.992, 661.516, 626.391 | [Before](frontpage-proof/ambient-before-desktop.png) · [After](frontpage-proof/ambient-after-desktop.png) |
| 390×844 | 6 → 6 | 62.406, 110.758, 265.188, 251.109 | [Before](frontpage-proof/ambient-before-mobile.png) · [After](frontpage-proof/ambient-after-mobile.png) · [Full continuation](frontpage-proof/ambient-after-mobile-full.png) |
| 1024×768 | 2 → 2 | 276.797, 192.000, 470.406, 445.438 | [Before](frontpage-proof/ambient-before-compact.png) · [After](frontpage-proof/ambient-after-compact.png) |

[Paused](frontpage-proof/ambient-paused-desktop.png), [reduced-motion still](frontpage-proof/ambient-reduced-desktop.png), and [resolve frame](frontpage-proof/ambient-resolve-desktop.png) are rendered evidence, not controls a reader must operate. All captured pages had zero runtime/asset-response errors and no horizontal overflow. The subtle ground is deliberately visible without becoming a second scene.

Brave browser visual inspection confirmed Pause → Resume and two-step AI-d kit selection. Automated viewport, lifecycle, cost and screenshots used actual installed Chrome via Playwright (the earlier IAB screenshot lane was unreliable). Before/after desktop and phone screenshots were opened with `view_image`; checked fixed tree alignment, title/typography, palette, entry positions/fold, ground contact, utility placement and unchanged copy. This is faithful to the approved restrained extension, not a new generated page concept. The no-motion composition retains the ground. No narrative, biography, catalog strings, routes or pool pages were changed.

Fresh verification for this ambient slice: **23/23 source-browser tests**, **23/23 against the freshly built output**, **6/6 built-page contracts**. Four new behavior tests cover real motion/pause/resume, one pending rAF maximum, zero ambient geometry/computed-style reads, offscreen/visibility stops, fixed tree, pointer-transparent layers, reduced/no-JS/zero-strength stills and rewind. Earlier mobile/focus/asset-failure/overlap checks remain. The new tests first failed on missing ambient behavior; later they caught and led to fixes for a stale scrub-runway cache and delayed resume. No test was removed or skipped.

The general source-contract suite is still **191/192**, solely the pre-existing Windows `008ceb…` versus committed `c7d630…` CRLF integrity failure. The suite and source it hashes were not changed. Local runtime was Node **26.3.0** (repo engine declaration remains **22.x**, untouched). No local result is presented as a Linux CI or physical-phone result.

Diff review: zero renamed/deleted routes or files; no pool page, catalog/rank/tier, registry, route validation or supplied image asset changed. The only shared-code behavior change outside the resolve modules is the explicit feedback-slot opt-out; other pages retain their existing scheduler. The PR remains against `main`, unmerged and unapproved by its author.

## Verification and scope

- Separate browser lane before review: **11/11**; after review: **19/19**. The earlier checks missed variable-height clipping and selected-box overlap; new regressions cover those, CSS-measured runway, narrow names, focus order, open-history rewind, mid-sequence reduced motion and pending/failed backgrounds. No test was removed or skipped.
- Additional actual-use checks: history opens/closes; keyboard Enter selects and focuses explicit Enter; Escape returns focus. At 1024×768 two entries fit without violating the reserved artwork rectangle; all seven remain reachable.
- `npm test`: baseline **188/189**; after rebasing merged #615 **191/192**. The additional three are #615's tests, not suppressed failures. Sole failure remains `scratch/tests/ai-kit-offers.test.js:38`, expected `c7d630…`, Windows checkout `008ceb…`. Known CRLF source-integrity artifact left unchanged.
- Because that failure short-circuits the runner, the built-page suite was run separately: `node --test scratch/tests/sdforest-foundation.test.js` **6/6**.
- Browser command: `node --test scratch/tests/frontpage-resolve.test.js`, with Playwright resolvable and optional `CHROME_PATH` pointing to installed Chrome. Existing validation and its runner were not edited.
- `git diff origin/main --name-status --diff-filter=DR`: no renamed or deleted files. No pool page, catalog, rank, tier, registry or existing validator changed. Existing root route and all seven destination hrefs retained. Removed homepage-only legacy animation mounting; its source files and every route remain.
- No migration, deployment, review approval or merge performed by this slice. PR targets main. Screenshots are repository-visible so they do not depend on access to BUTCHER's drives.
