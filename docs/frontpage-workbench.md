# Approved Grafted Workbench implementation

BUTCHER · 2026-09-23 · orchestrator-gpt PR #619 · same branch, no merge.

This replaces the repeated circular entry treatment, not the tree, pool pages,
catalog, ranking data, route registry or existing copy. The approved correction
uses a white first-aid cross on green, not the protected Red Cross emblem.

## What happens when used

Each complete entry is its own hit area. Hover or keyboard focus previews its
mechanism. A first click/tap/Enter selects it and moves that mechanism over
**0.36 seconds**; the same control's next deliberate press opens its existing
pool route. The selected state visibly says “Selected · press again to open”
and announces the equivalent instruction to assistive technology. There is no
separate Enter button or arrow. Double-clicks and held-Enter key repeats cannot
confirm. Escape or selecting elsewhere disarms it. With JS unavailable the
existing native anchors work directly.

| Pool | Material / idle response | Selection response | Wide-desktop placement |
|---|---|---|---|
| Health | Intact ECG glass; green trace brightens with shared wind | Trace brightens further | Upper left, 13vh |
| AI-d kit | Green first-aid flag moves fractionally with wind | Purple paddle depresses 5px / compresses 14%; flag flips 28° | Upper right, 13vh |
| GrowingApp | Seed, sapling, tree illuminate with lagged wind samples | Three tiles brighten | Below Health, 40vh |
| Artificial Self | Connected violet/teal neurons illuminate at different wind lags | Network brightens | Below AI-d kit, 40vh |
| TinkerBox | Opposing pins settle by fractions of a pixel | Pins retract 10px in opposite directions | Bottom left |
| My Story | Earliest signal faintest, latest brightest; the last signal breathes | Latest signal brightens; name stays fully legible | Bottom centre |
| Design Gallery | Small exhibit shutters move fractionally | Opposed shutters open 24° | Bottom right |

Bottom entries begin at `83vh + 12px`, width `min(29vw,39vh)`, aspect ratio 4:1.
On 700–850px-high wide desktops their width is additionally capped by
`calc(68vh - 264px)` to leave the 50px footer strip and 4px separation clear.
Their type also scales with height. Lower flank selection instructions sit
above those controls, not over the footer; the centred instruction stays below.
The gallery is no larger than either lower sibling. Pool-specific colours and
existing self-hosted type families replace generic white labels. The seven
name colours are distinct and tested at **at least 7:1** against the dark
control surface. The raster artwork carries texture, never the text.

All moving objects sample the existing `windAt` field. A single pausable rAF
owns elapsed time, scrub updates, short input transitions and the distant
horizon's restrained ±4px horizontal / ±2px vertical mouse response. Input
transitions read the controller's **current** clock, not the last 900ms idle
paint sample. Motion writes transform/opacity only on isolated decorative
parts. The tree still receives only its pre-existing filter write during seek.
There are no timers, autonomous CSS loops, per-frame layout reads or new ranks.

Reduced motion is a complete still frame; selection changes pose immediately.
Pause motion stops scheduling. Hidden documents and offscreen ambient stop;
visible input remains usable after the tree has scrolled away. Ambient and
artwork cannot intercept pointer input or focus.

## Geometry, arrival and fallback contract

All **three tree CSS rules and the original SVG/image markup are unchanged**
from `a08512b76862e77d71e921cd71c2793d360dfc8d`. Desktop remains centre
50vw/54vh, height 58vh, width `calc(58vh * 226 / 214)`. Portrait remains centre
50vw/28vh, width `min(68vw,32vh)`; the existing landscape 40vh exception remains.
No crown, leaf or branch articulation is simulated on the low-resolution asset.
Ivan's animated intro is not replaced by a CodePen scene or claimed complete.

The DOM remains ordered by the existing catalog module: Health, AI-d kit,
GrowingApp, TinkerBox, Design Gallery, Artificial Self, My Story. Arrival start
is still `.8 + i*.32`, duration .72 seconds, using the same reversible
smoothstep mathematics. Keyboard traversal follows that DOM, not a second
visual-ranking list. Desktop CSS locates Artificial Self on the middle right;
mobile/compact flow retains catalog order. No positive tabindex reordering.

At small widths, real text and a mechanism thumbnail form flexible rows. This
is a deliberate responsive adaptation: seven full desktop controls would make
small-phone labels unreadable. All entries and footer controls remain reachable
with normal document scrolling, including enlarged text and landscape phones.
Failed workbench assets leave the names, state and route usable; failed region
assets restore the complete base image. Failed/pending warm-world assets cannot
delay the tree or directory.

| Viewport | Fully visible entries | Tree x / y / width / height, CSS px |
|---|---:|---|
| 1920×1080 | 7/7 | 629.242 / 269.992 / 661.516 / 626.391 |
| 1672×941 | 7/7 | 547.813 / 235.242 / 576.375 / 545.766 |
| 390×844 | 5/7 | 62.406 / 110.758 / 265.188 / 251.109 |
| 320×568 | 3/7 | 69.125 / 72.984 / 181.750 / 172.094 |
| 780×390 | 1/7 | 327.602 / 96.914 / 124.797 / 118.172 |

All seven remain present in each layout. No portal overlaps the protected
desktop rectangle, including during arrival or selection. The exact measured
boxes are in [workbench-measurements.json](frontpage-proof/workbench-measurements.json).

## Rendered evidence

| State | Desktop | Mobile |
|---|---|---|
| Opened | [1920×1080](frontpage-proof/workbench-desktop.png) | [390×844 landing](frontpage-proof/workbench-mobile.png), [full continuation](frontpage-proof/workbench-mobile-full.png) |
| Resolve | [Tree only](frontpage-proof/workbench-resolve-desktop.png) | [Tree only](frontpage-proof/workbench-resolve-mobile.png) |
| Selected / still | [AI-d kit pressed](frontpage-proof/workbench-selected.png) | [320px narrow](frontpage-proof/workbench-narrow.png) |
| Reduced / landscape | [Reduced motion](frontpage-proof/workbench-reduced.png) | [780×390](frontpage-proof/workbench-landscape.png) |

The in-browser manual check selected AI-d kit without leaving, visibly pressed
its lever, and followed its existing pool URL only on the next press.
Screenshots are actual renders, not the source concept composited into a page.

## Verification and performance

Browser baseline before this slice: **23/23**. New interaction/layout regression
checks were observed failing before implementation. Current suite: **29/29**,
no skips, covering source and the generated `vercel-public` artifact. Separate
built-page foundation contracts: **6/6**. Full `npm test` source stage:
**191/192**; its sole failure is the explicitly excluded pre-existing Windows
CRLF troubleshooting-source hash artifact (`008ceb…` working copy versus
`c7d630…` committed content). It is unchanged and not counted as a passing test.
Because that stage stops the runner, the 6 foundation checks were run separately.
The four pre-existing quarantined glossary warnings remain visible, not suppressed.

Performance uses installed Brave on BUTCHER, 390×844, DPR 2, touch/mobile context,
4× CPU throttling: a mid-range-phone CPU proxy, **not physical-phone GPU or battery
evidence**. Same-page paused/running pairs use CDP main-thread task duration over
10 seconds divided by elapsed 60Hz frame count. The initial whole-image clipped
version cost 0.625/0.575ms extra per frame. Region textures reduced that cost.
A 650ms recheck still measured 0.5154/0.5466ms extra, so idle samples were reduced
to **900ms** (~1.1/second). The nearest mote advances less than 1.2 CSS pixels
per sample. Input transitions and scrubbing remain frame-rate driven.

| Final uninstrumented pair | Paused task ms / frame | Running task ms / frame | Added ms / frame | 16.67ms budget |
|---|---:|---:|---:|---:|
| 1 | 0.005417 | 0.485353 | 0.479936 | 2.88% |
| 2 | 0.003457 | 0.461016 | 0.457560 | 2.75% |

Mean added cost **0.468748ms / 2.81%**, below the 0.50ms target. Both running
windows recorded **0 layouts** and 11 style recalculations in 10 seconds.
Paused recorded no scripts, layouts or recalculations. [Raw paired results](frontpage-proof/workbench-cost.json).
[The earlier 650ms recheck](frontpage-proof/workbench-cost-650ms-recheck.json) is
retained so the result is not a cherry-picked replacement.

Separate instrumented trace: 560 callbacks; median 0ms at timer resolution,
p95 0.40ms; callback-gap p95 18.1ms; 0 callback gaps over 25ms; 11 draws; 0 paints;
0 layouts; **1 trace-reported dropped-frame event**. Paused trace: **0 callbacks,
draws, paints, layouts and dropped-frame events**. Instrumented task duration is
not substituted for the uninstrumented cost above. [Raw trace summary](frontpage-proof/workbench-trace.json).

No new dependencies, hosting changes, migrations, deployments or route removals.

## Code versus earlier contract

| Superseded statement | Current implementation |
|---|---|
| “first click/tap selects, the separate Enter button navigates” | First press selects; next deliberate press on the same anchor navigates. Explicitly approved interaction revision. |
| “Selection scales an entry by 2.5%” | Anchor box is stable; individual material parts move. |
| “pool-ring opacity and rotation” | Rings replaced by seven independent material mechanisms sharing one wind field. |
| AI-d kit “Slot 2: middle left”; Artificial Self “Slot 6: lower right” | Upper right and middle right respectively, as requested; catalog/arrival order unchanged. |
| “The complete seek() body remains byte-identical” | Its obsolete `positionEnter()` call is removed. Tree-filter and smoothstep/DOM-index arrival maths are unchanged. No timer added. |
| “mist parallax … omitted” | Original mist remains a warm-world plane. A new, original distant horizon receives restrained pointer parallax; no tree parallax. |

The main [resolve contract](frontpage-resolve.md) now states the current rules.
Earlier receipts remain visibly marked historical, rather than quietly erased.
The existing directional word “below” in a retained paragraph is still stale;
the no-copy-edit restriction remains honoured rather than claimed resolved.
