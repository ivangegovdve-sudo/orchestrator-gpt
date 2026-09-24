# Front page — planted controls and readable instruments

BUTCHER · 2026-09-24 · orchestrator-gpt draft PR #627 against main.
Approved correction of `9dd8426b6bc85c56dffae2fce6404028f0c847c3`.
No merge or formal approval. This is an implemented front-page correction, not
a new subpage, new tree, true 3D camera or finished Spine rig.

## What changes when used

- **Health:** one complete, sharp, stationary spike followed by a flat baseline.
  The independent P/T triangles and vertical scaling that produced the small
  bumps are gone. Hover quickens the beat. Holding/clicking briefly flattens it;
  selection does not become a permanent flatline.
- **Foreground:** the bark plate and seven control housings stay planted under
  pointer movement and dragging. Only the central far landscape and mist respond
  (horizontal limits 2/6px, vertical 1/3px; mist retains restrained shared wind).
- **Ground:** the approved illustrated bed is now integrated, not preview-only.
  Old photographic turf and synthetic blades are removed from the composition;
  the old asset routes remain. Illustrated contact (819,765 on 1672x941) is aligned
  with the unchanged tree base. Desktop bed width is 116vh instead of the old
  full-screen preview; mobile is 1.88 times the tree width. Edge masks blend
  vegetation and soil into the original bark without turning the roots into a
  screen-wide second trunk. The bed is fixed with the tree.
- **Artificial Self:** the actual painted neuron arbors brighten as their own
  cell receives charge, then decay. Arbors, somas, wire charge and travelling
  heads share `sampleNeuralCircuit`; there is no independent glow clock.
- **Mechanisms:** TinkerBox's left and right pins retract before the hatch lifts.
  Its hover opening is visible, not a two-degree twitch. The first-aid lever and
  gallery shutters have weighted local strokes and decaying detent responses.
  GrowingApp's staggered symbol response and the existing signal response remain.
- **Explanations:** existing wording now sits in an opaque, high-contrast drawer
  with a hinged cover. The text itself is never scaled. Hovering the drawer keeps
  it open. One preview is shown: pointer hover, otherwise focus, otherwise the
  selected entry. Pointer preview does not steal keyboard focus. On phones and
  narrow desktop flow layouts, ResizeObserver reserves the drawer's actual height,
  including wrapped text and the selection hint, without per-frame layout reads.

Every pool retains idle, hover/focus and local click feedback. First activation
selects; the next deliberate activation opens the same existing route after the
existing 360ms acknowledgement. Escape, cancelled gestures, pause, no-JS and
reduced-motion behaviour remain checked. Reduced motion is still, not a slow loop.

## Rendered evidence

[Recorded interactions for all seven pools](https://drive.google.com/file/d/1gaWdtcvJMZcLmnBjNP9tJa2iQR44OULJ/view?usp=drivesdk)
— 6,821,649 bytes. Drive metadata readback confirmed the size and the existing
animation folder. No sharing settings or previous handoff files were changed.

[Opened desktop](frontpage-refinement-proof/desktop.png) ·
[Phone first tap](frontpage-refinement-proof/phone-tap.png) ·
[Complete phone page](frontpage-refinement-proof/phone-full.png) ·
[Landscape phone](frontpage-refinement-proof/landscape.png) ·
[Sharp heartbeat](frontpage-refinement-proof/health-sharp-beat.png).
Seven individual drawer captures are in the same proof directory.
Before: [desktop](frontpage-refinement-proof/before-desktop.png) /
[phone](frontpage-refinement-proof/before-phone.png). Health's desktop explanation
was 184px wide on transparent bark; it is now 460px wide on a solid backing,
with 19px type. All seven drawers use the same legible foreground/background pair.

| Viewport | Complete pool entries above fold, before → after | Reachable | Horizontal overflow |
|---|---:|---:|---|
| 1920×1080 | 7 → 7 | 7/7 | No |
| 390×844 | 2 → 2 | 7/7 | No |
| 320×568 | 2 → 2 | 7/7 | No |
| 780×390 | 2 → 2 | 7/7 | No |

These counts describe the unexpanded page, not seven phone entries compressed
above the fold. A phone drawer consumes additional space intentionally. Actual
touch emulation: first Health tap stayed on the front page, armed Health and
showed one drawer; second tap reached `/web/pools/health/`. No console warnings
or page errors were observed in that interaction.

The desktop tree box stayed x=629.2422, y=269.9922, 661.5156×626.3906 CSS pixels;
phone box stayed x=62.4063, y=110.7578, 265.1875×251.1094. All seven recorded
activations left the tree box unchanged and each housing's transform was `none`.

## Verification

| Lane | Fresh result |
|---|---:|
| Source front-page browser checks | 66/66 |
| Freshly built front-page browser checks | 66/66 |
| Foundation checks | 6/6 |
| General `npm test` | 191/192 |

The one general-suite failure is the explicitly preserved Windows CRLF hash
artifact in `ai-kit-offers.test.js:38`: `008ceb…` checked-out bytes versus expected
`c7d630…` committed-source bytes. It is not a front-page regression. Build output
still reports four quarantined glossary entries (BROCKMAN, CAVERN, CVV, PRNG) and
the two pre-existing failed weekly inputs dated 2026-08-02/16. None was suppressed.

New failing regressions were observed before implementation for small/scaled
ECG beats, full-arbor lighting, unreadable drawers, moving bark, illustrated
ground, hatch ordering, opening covers and duplicate focus/hover previews.
Older tests were updated where they demanded the rejected synthetic blades,
shrinking wave geometry or pseudo-element selection hint. Sparse idle activity
is observed over its cycle, not inferred from two arbitrarily spaced stills.
No test was deleted or skipped to make this pass.

Browser lane: existing Playwright/Brave on BUTCHER; standalone Browser plugin
unavailable. These are emulated Chromium viewports, not physical iOS/Safari or
touch-device GPU/battery measurements. The animation is layered 2.5D artwork,
not an articulated tree or physically simulated old machinery.

### Phone-profile frame cost

4× CPU throttle, 390×844, DPR 2; two alternating 10-second baseline/current
samples per view, then paused. No other test browser ran during these samples.
Numbers are mean whole-page main-thread task time per nominal 60Hz frame, not
just callback duration or GPU cost.

| View | Base → current ms/frame | Added share of 16.67ms budget | Layouts |
|---|---:|---:|---:|
| Leading pools | 1.8005 → 1.7442 | −0.34 percentage points | 0 |
| Artificial Self visible | 1.8982 → 2.1431 | +1.47 percentage points | 0 |

The two current neural samples ranged 1.9536–2.3326ms/frame; do not read the
mean as a physical-phone guarantee. Whole-page active cost is roughly 10.47%
and 12.86% of the frame budget respectively, **not** below 3%. The added neural
work is about 1.47% of that budget. Paused cost was 0.0048/0.0040ms per frame,
with zero script, recalculation or layout activity. Raw paired samples:
[leaders](frontpage-refinement-proof/cost-leading.json) /
[neurons](frontpage-refinement-proof/cost-neural.json).

## Boundaries and contract reconciliation

The complete resolve controller (including pure `seek` and its single rAF), all
tree geometry rules, tree asset, pool names, all seven explanation strings and
existing paragraphs compare unchanged against the base. No catalog/rank/route
or pool-page files changed. Route renames/deletions were checked against the diff.

The current contract document now corrects earlier stale descriptions:
`far / mist / near = 2 / 6 / 10px` becomes **2 / 6 / fixed**; `lagged grass`
becomes **the illustrated fixed bed**; summaries no longer sit relative to narrow
nameplates. It also reconciles pre-existing documentation drift: the flank pair
is at **67vh**, not `83vh + 12px` (that is My Story); the warm world has **four**
planes, not five; the arrival table now reflects the already-existing DOM's
final-pool ordering. Neither the actual arrival order nor tree contract changed.

Run the browser checks with `node --test scratch/tests/frontpage-resolve.test.js`;
set `SDFOREST_TEST_ROOT` to `vercel-public` for built checks. The committed
`scratch/frontpage-pool-polish-proof.cjs` reproduces captures and recordings.
`scratch/frontpage-ambient-profile.cjs` compares this runtime to the supplied
`SDFOREST_PROFILE_BASELINE` on a 4× CPU-throttled 390×844 proxy. Raw cost samples
are stored beside the screenshots. The final remote SHA and unpublished,
head-pinned Sail inference receipt are recorded on PR #627 after push.
