# Approved embedded forest — implementation receipt

BUTCHER · 2026-09-23 · orchestrator-gpt PR #619 · same branch, no merge.

This implements the approved connected-bark composition and corrects the two
inset titles. It supersedes the detached-frame environment in the earlier
[workbench receipt](frontpage-workbench.md), not its seven mechanisms or routes.
The [numbered resolve contract](frontpage-resolve.md) remains authoritative.

## What a visitor can now use

- Mossy bark connects the upper and middle controls to the edges and the lower
  controls to a root ledge. They no longer float independently in a dark void.
- A distant indigo woodland and subdued mist sit behind the fixed tree. An
  original moss/soil patch touches its base. No new tree or leaf detail is invented.
- GrowingApp and Artificial Self are native, selectable text inside their dark
  nameplates. Their plates occupy left 22%, top 59.5%, width 56%, height 18% of
  each desktop control. Type scales with that control, capped at 32px. On phones
  the existing 25px labels remain normal-flow text beside mechanism thumbnails.
- The established first press selects and animates; a second deliberate press
  enters. Actual browser use depressed the AI-d kit lever without navigation,
  then opened `/web/pools/ai-d-kit/` on the second press. Double-click and held
  Enter remain unable to confirm. A final use check caught overlapping summary
  and selected-state instruction text; flank instructions now sit above controls,
  with lower-flank summaries above those instructions. Idle composition and
  wording are unchanged.
- Grass, control illumination and very slight mist movement share the existing
  wind field. Background pointer parallax stays restrained. Pause and reduced
  motion stop the scheduler; reduced motion opens every entry in a composed
  still state. This is living page ambience, **not Ivan's finished tree video**.

No personal/narrative copy was created or changed. The two existing paragraphs,
seven names and seven summaries match the preceding head byte-for-byte after
line-ending normalization. No pool page, catalog rank/tier, validation or route
was changed; no route renamed or deleted. All three tree CSS rules, its SVG/image
markup, `seek()`, DOM-index arrival and shared-clock controller are unchanged.
[Protected-diff receipt](frontpage-proof/embedded-safety.json).

## Rendered evidence

| State | Desktop | Mobile |
|---|---|---|
| Opened | [1920×1080](frontpage-proof/embedded-desktop.png), [1672×941](frontpage-proof/embedded-target.png) | [390×844](frontpage-proof/embedded-mobile.png), [full continuation](frontpage-proof/embedded-mobile-full.png) |
| Resolve | [Tree only](frontpage-proof/embedded-resolve-desktop.png) | [Tree only](frontpage-proof/embedded-resolve-mobile.png) |
| Interaction / still | [Selected AI-d kit](frontpage-proof/embedded-selected.png), [reduced motion](frontpage-proof/embedded-reduced.png) | [320px narrow](frontpage-proof/embedded-narrow.png), [780×390 landscape](frontpage-proof/embedded-landscape.png) |
| Short desktop | [1366×768](frontpage-proof/embedded-short-desktop.png) | [1920×720](frontpage-proof/embedded-wide-short.png) |

[Approved mock versus actual render](frontpage-proof/embedded-comparison.png)
uses the same 1672×941 viewport, side by side with no rescaling. The
[focused title comparison](frontpage-proof/embedded-title-comparison.png) shows
both corrected insets; reference left, browser right. These are rendered HTML
screenshots, not a flattened mock used as the interface.

| Viewport | Fully visible entries before → after | Tree x / y / width / height, CSS px |
|---|---:|---|
| 1920×1080 | 7 → 7 | 629.242 / 269.992 / 661.516 / 626.391 |
| 1672×941 | 7 → 7 | 547.813 / 235.242 / 576.375 / 545.766 |
| 1366×768 | 7 → 7 | 447.797 / 192.000 / 470.406 / 445.438 |
| 1920×720 | 7 → 7 | 739.492 / 180.000 / 441.016 / 417.594 |
| 390×844 | 5 → 5 | 62.406 / 110.758 / 265.188 / 251.109 |
| 320×568 | 3 → 3 | 69.125 / 72.984 / 181.750 / 172.094 |
| 780×390 | 1 → 1 | 327.602 / 96.914 / 124.797 / 118.172 |

All seven are present at every size; normal scrolling reaches the remaining
mobile entries, Portfolio, motion control, Feedback and Design History.
[Raw measurements](frontpage-proof/embedded-measurements.json). The desktop
protected rectangle still has zero portal overlap during arrival and selection.
The tree remains 50vw/54vh at 58vh high on desktop and 50vw/28vh at
min(68vw,32vh) wide in portrait. The existing landscape 40vh exception remains.

## Timing and failure behavior

The dark woodland/mist/bark group arrives at **0.05–0.60s** on the existing
reversible timeline. The mobile/compact bark backing carries the same
`data-arrival="field"`, so it follows that group rather than leaking into t=0.
The moss contact patch and sparse air retain **3.60–4.40s**. All other arrival
times are unchanged. The warm-world planes still fully dissolve; the new dark
environment is not the old background held partly visible.

Mist uses only transform/opacity, with base opacity .12 and gust modulation
±.018×strength; the shared strength remains .65. Its horizontal wind offset is
2.5×gust pixels; pointer offset is 40%/30% of the already restrained horizontal/
vertical background offset. Bark and ground artwork stay still. There are no
new timers, autonomous animation loops or per-frame geometry reads. Failed
workbench art leaves native names, selection and routes usable; pending/failed
warm-world planes do not gate the tree or entry sequence. Reduced-motion and
no-JS renders remain fully navigable.

## Verification

Baseline browser suite at ffa88071: **29/29**. Final source browser: **34/34**;
freshly generated `vercel-public` browser: **34/34**; built-page foundations:
**6/6**. Five new regressions cover inset text, selected-summary separation,
connected artwork/hit testing, shared-clock mist, and mobile tree-only resolve.
The initial title/absent-environment assertions, leaking mobile backing and
selected-text overlap were observed failing before their corresponding fixes.
No test was skipped or removed.

Full `npm test` source stage: **191/192**. Its sole failure remains the known
pre-existing Windows CRLF troubleshooting-source hash (`008ceb…` working copy
versus `c7d630…` expected). This is neither fixed nor counted as passing. That
failure stops the compound runner, so the 6 build-backed contracts were run
separately. The four quarantined glossary warnings and two failed weekly-run
warnings remain disclosed by the build. No migrations or hosting changes.

### Frame cost

Brave on BUTCHER; 390×844, DPR2, touch/mobile context, 4× CPU throttle; two
10-second same-page paused/running pairs. This is a mid-range-phone **CPU proxy**,
not a measurement of physical-phone GPU, thermal behavior or battery use.

| Pair | Paused task ms / 60Hz frame | Running task ms / frame | Added | Frame budget |
|---|---:|---:|---:|---:|
| 1 | .005622 | .514062 | .508440 | 3.05% |
| 2 | .004052 | .422242 | .418189 | 2.51% |

Mean added cost **.463315ms / 2.78%** of 16.67ms. Both running windows: **0
layouts**, 11 style recalculations. Paused: 0 script time, layouts and style
recalculations. [Paired results](frontpage-proof/embedded-cost.json). The final
selected-text spacing correction is inactive during this unselected idle sample.

Separate instrumented trace: 560 rAF callbacks / 10 seconds, callback median
0ms at timer resolution, p95 .5ms, gap p95 18.1ms, **0 gaps over 25ms**, 11 draw
frames, 0 paint events, 0 layouts, **3 trace-reported dropped-frame events**.
Paused: **0 callbacks, draws, paints, layouts and dropped events**.
[Trace summary](frontpage-proof/embedded-trace.json). Trace overhead is not
substituted for the uninstrumented paired cost.

## Sail review and evidence-based disposition

A SailResearch `google/gemma-4-31B-it` technical review was obtained for the
environment/inset-title diff, before the last selected-text spacing correction.
Its raw response is [retained](frontpage-proof/embedded-sail-review.json), including
its REQUEST_CHANGES verdict. It was **not published as a GitHub approval**, and
must not be described as an independent approval of the final head.

| Review concern | Checked result |
|---|---|
| Children might escape a parent opacity of 0 | Not reproduced: parent opacity composites the subtree; it is not an inherited property children must repeat. The field remains 0 at t=0 in actual forward/reverse captures. |
| Mobile bark omitted from seek/expose | Contradicted by `frontpage-resolve.mjs:12,133–136`: the document-wide non-pool `data-arrival` collection includes the backing span and calls expose for it. The new regression reads 0→1→0 for that exact element. |
| Art clip could cut off native titles | Titles are siblings of `.portal-art`, not descendants, and therefore not clipped by that element. Actual text ranges fit inside both nameplates at all four tested desktop dimensions; 7/7 names fit at 320px. |
| `far` lacks a null guard | Pre-existing required-element access, unchanged by this diff; `.workbench-horizon` remains present. A failed image request does not remove the element. No missing-element failure occurs in the asset-failure lane. |

No approval was manufactured from this feedback, no review gate was changed,
and no merge was requested. Formal independent review of the final head remains
the next gate. Original art provenance is in the [asset README](../web/assets/sdforest-workbench/README.md).
