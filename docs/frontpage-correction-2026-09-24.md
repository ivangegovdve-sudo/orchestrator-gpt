# Front-page interaction correction — BUTCHER, 2026-09-24

## Approved brief

Ivan approved the correction in chat: stationary heartbeat deflections with a
flat resting interval, faster regular hover beats and a selected flatline;
visible hanging vines that can be nudged, dragged and released; visible grass
and ground contact; full-width embedded mobile controls instead of thumbnails;
TinkerBox and Design Gallery last without footer-like demotion.

The tree remains the unchanged original, at the exact video hand-off geometry.
Its approximately 226 × 214 pixels of meaningful detail do not become sharper
through this correction. No narrative copy, project catalog, ranks, routes or
pool pages are in scope. One shared, pausable clock; reduced motion is still.

## Execution ledger

- Base: `07300bae116be0cbfbbebb48cc96aad182fc338d` (merged #626).
- Clean isolated worktree; new branch `fix/sdforest-living-controls-20260924`.
- Baseline source contracts: 191/192. The sole failure is the previously
  documented Windows CRLF hash in `scratch/tests/ai-kit-offers.test.js:38`.
- First task: replace the scrolling ECG with timed stationary deflections;
  verify baseline/beat/baseline, hover frequency, selected flatline, pause.
- Second task: separate interactive vines from inert atmosphere; add pointer
  capture, bounded spring release, cancellation and keyboard nudge; verify
  reduced motion, rewind, no navigation interception and unchanged tree.
- Third task: grass foreground/back layers, full-width mobile mechanisms and
  connected lower controls; verify narrow, landscape and desktop layouts.
- Final gate: source/built browser suites, built-page contracts, screenshots,
  phone-profile cost, protected diff and independent Sail review.

## Release hold

Open a **draft** PR against main. Do not publish an APPROVED review or merge.
The existing `Merge on approval` workflow merged #626 upon approval; its current
prefilter skips drafts. No workflow or review-policy changes are part of this PR.
An independent review will be reported without emitting the merge trigger.

## Implemented interaction contract

- Health uses three stationary deflection regions, P/QRS/T, with fixed horizontal
  coordinates and flat intervals. Idle phase is 1.2 Hz (72 beats/minute), easing
  toward 2.25 Hz (135/minute) on hover/focus. Selection hides the waveform and
  shows one flatline while depressing the instrument; Escape restores it.
  Static SVG traces live inside composited HTML wrappers: only their vertical
  scale and opacity change, never a scrolling strip or animated SVG geometry.
- Two visible strands are real, narrowly bounded buttons outside the inert
  ambient layer. Click/Enter nudges; horizontal drag captures the pointer and
  bends to at most 22 degrees; release runs a damped spring on the existing
  clock. Arrow keys nudge. Vertical touch swipes remain page scrolling and cancel
  the drag. Pause, reduced motion, rewind, hidden/offscreen state release capture
  and stop ongoing interaction. These controls sit below the navigation layer.
- Four independently editable grass clumps contain 68 tapered blades. Ground
  texture is the existing asset, feathered by a radial mask with a local contact
  shadow and soil bridge. Grass crosses the fixed trunk contact in front of the
  bitmap; the patch no longer reads as a separate island. No tree redraw.
- Phones use full-width embedded artwork with titles inside its mechanisms,
  backed by one continuous bark surface. The original aspect ratios are kept,
  not stretched. Selection/focus reserves space below the mechanism for the
  existing description and confirmation; hover never inserts mobile spacing.
  Landscape uses two columns so the two leading mechanisms fit in the first
  viewport at 780×390 and 568×320, without changing the tree's landscape box.
- TinkerBox and Design Gallery have the same desktop width as Health/AI-d kit
  and continue the 13vh / 40vh / 67vh flank cadence. They are last in the arrival,
  focus and phone sequences, not isolated utilities. My Story remains below the
  fixed tree. The common catalog directory still sorts existing links first;
  the two existing homepage anchors marked `data-final-pool` move to its end.
  No second rank array, catalog edit or alternate timing list was introduced.

The new vine controls are the deliberate exception to pointer-transparent
decoration. They do not overlap a portal hit area. The tree, grass, air, mist
and all remaining atmosphere stay non-interactive. Reduced motion is a still
composition, not a slow loop; vine buttons are disabled in that state.

## Validation corrections found while using the page

- Direct SVG ECG transforms caused repeated layout/paint; HTML compositor
  wrappers removed that work. The regression measures actual layout counters.
- Changing reduced-motion preference while a pointer was captured deferred
  Chromium's media-query event. The existing frame callback now also checks
  that preference, releasing the vine and entering the static state.
- Phone descriptions inherited the small title plate's containing block. The
  phone copy wrapper now has `display:contents`; the title remains positioned
  inside the artwork while its summary uses the whole entry width beneath it.
- The large-text navigation test raced Design History's existing 420ms closing
  drawer. It now waits for that drawer to become hidden, then verifies an
  actual selected portal and reachable controls. No drawer behavior was changed.
- Three source/built guards assumed catalog-enum order in literal HTML or that
  `href` immediately followed `data-pool-link`. They now accept the approved
  fallback sequence/marker while still requiring exactly all seven canonical
  IDs, names and route destinations. Catalog rank and registry validation code
  is unchanged. Rapid synthetic clicks in the failed-artwork loop were changed
  to deliberate Enter activations; separate pointer/double-click tests remain.

The source art still contains approximately 226×214 meaningful tree pixels.
Grass fixes contact, not detail. Higher-resolution tree artwork remains a
separate asset limitation, explicitly not claimed solved here.

## Verified result

Source browser **51/51**; freshly built `vercel-public` browser **51/51**;
built-page foundation contracts **6/6**. Nine new browser regressions extend
the prior 42; none are skipped or deleted. General source suite remains
**191/192**, solely the pre-existing Windows CRLF source-integrity difference
`008ceb…` versus `c7d630…` in `ai-kit-offers.test.js:38`. That file and its source
are untouched. Because that failure short-circuits `npm test`, the six
build-backed tests were run separately. Node 26.3.0 on BUTCHER; not a Linux CI claim.

The registry/rank implementation is untouched. The build still discloses four
quarantined glossary entries and two failed weekly-run warnings; this work does
not suppress them. No migration, hosting change or production deployment.

Actual Brave use: Health's first press stayed on the homepage, depressed the
instrument and showed a flatline. A visible vine captured a 120px horizontal
drag, then cleared capture and swung on release. Console warnings/errors: **0**.
Automated touch input confirms vertical swipes scroll the phone page instead
of becoming a stuck drag. Reduced motion and Pause leave **0 pending rAFs**;
the shared scheduler's measured maximum remains **1**.

| Viewport | Fully visible entries before → after | Unchanged tree x / y / width / height (CSS px) |
|---|---:|---|
| 1920×1080 | 7 → 7 | 629.242 / 269.992 / 661.516 / 626.391 |
| 1366×768 | 7 → 7 | 447.797 / 192.000 / 470.406 / 445.438 |
| 1920×720 | 7 → 7 | 739.492 / 180.000 / 441.016 / 417.594 |
| 390×844 | 5 → 2 | 62.406 / 110.758 / 265.188 / 251.109 |
| 320×568 | 3 → 2 | 69.125 / 72.984 / 181.750 / 172.094 |
| 780×390 | 1 → 2 | 327.602 / 96.914 / 124.797 / 118.172 |

Portrait deliberately trades thumbnail density for the approved full-width
embedded mechanisms. All seven entries and the utilities remain reachable by
ordinary scrolling, including the enlarged-text stress test; no hidden internal
scroller is used. Landscape exposes both leading entries. Portal overlap with
the reserved desktop tree rectangle is **0** during arrival and selection.

Evidence: [before desktop](frontpage-motion-proof/opened-desktop.png),
[before phone](frontpage-motion-proof/opened-phone-full.png),
[after desktop](frontpage-correction-proof/desktop.png),
[after phone continuation](frontpage-correction-proof/mobile-full.png),
[320px narrow](frontpage-correction-proof/narrow.png),
[landscape](frontpage-correction-proof/landscape.png),
[reduced-motion still](frontpage-correction-proof/reduced.png),
[raw measurements](frontpage-correction-proof/measurements.json),
[protected diff](frontpage-correction-proof/safety.json).

The protected diff compares all three tree CSS rules, the original tree SVG/image
markup, the entire pure `seek()` function and existing names/summaries/body copy
against the merged base after newline normalization. **All identical.** No
renamed/deleted files or routes, pool-page edits or catalog edits.

## Frame cost

Brave on BUTCHER; 390×844, DPR2, touch context, 4× CPU throttle; isolated
10-second paired windows. The visible manual preview was paused and no browser
suite ran concurrently. This is a mid-range-phone CPU proxy, not a physical
phone's GPU, battery, thermal or Safari measurement.

| Pair | Merged baseline ms / 60Hz frame | Correction ms / frame | Added |
|---|---:|---:|---:|
| 1 | 0.9745 | 1.0518 | 0.0773 ms / 0.46% of 16.67 ms |
| 2 | 1.0158 | 1.0783 | 0.0625 ms / 0.37% |
| Paused | — | 0.0067 | 0 script time, layouts or style recalculations |

The entire running scene uses **6.31–6.47%** of that emulated main-thread
budget. It is not described as below 3%; the correction's additional cost is
**0.37–0.46%**. Both running windows have **0 layouts**.
[Uninstrumented paired data](frontpage-correction-proof/cost-summary.json).

A separate instrumented trace records **601 callbacks**, callback p95 **0.60ms**,
gap p95 **16.8ms**, **0 gaps over 25ms**, 140 intended draws, **0 layouts**,
**0 paint events**, and **1 reported dropped-frame event**. Paused trace:
**0 callbacks/draws/layouts/paints/dropped events**.
[Trace summary](frontpage-correction-proof/trace-summary.json). The initial
direct-SVG experiment caused repeated layouts/paints and was rejected; these
numbers are for the corrected HTML-compositor implementation.

Reproduction: `node --test scratch/tests/frontpage-resolve.test.js`; repeat with
`SDFOREST_TEST_ROOT` set to the built `vercel-public` directory. For timing, run
`scratch/frontpage-ambient-profile.cjs` with `SDFOREST_PROFILE_BASELINE` set to
the merged base above, no concurrent browser jobs, and tracing disabled for the
paired cost. `scratch/frontpage-motion-proof.cjs` records the actual interactions
and exports separately editable SVG planes plus the exact runtime/CSS.

## Animator hand-off

Uploaded into the [existing animation-layer folder](https://drive.google.com/drive/folders/1PDKIbmCwhNBTkWMtrKLkjvtyB0YRYYSH),
without replacing any earlier originals:

- [Actual interaction recording](https://drive.google.com/file/d/15qkyRTc5uhx2MBmC7wiC4RCv6SgWbJPX/view?usp=drivesdk)
  — 5,052,408 bytes. Shows vine drag/release and hover/press/cancel for all seven
  mechanisms. This is a browser recording, not a separate animation mock.
- [Corrected native layer package](https://drive.google.com/file/d/19wj4GIy9EdBygvaSOm_sPX760f8RZYHm/view?usp=drivesdk)
  — 33,071 bytes; 15 separate SVG planes, six runtime/style files and notes.
  The SVGs are also loose files prefixed `correction-20260924-` in that folder.
  Grass/vine gradients are included in each plane so they can be used separately.

Drive metadata readback verified all 17 objects' names, sizes and destination
folder. The earlier raster layers remain the texture source; nothing repaints
or upscales the tree. [Phone Health selected](frontpage-correction-proof/phone-health-selected.png)
shows the flatline, retained inlaid title and separated confirmation/description.
