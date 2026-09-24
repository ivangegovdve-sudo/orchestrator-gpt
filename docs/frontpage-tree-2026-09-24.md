# Tree and sunset correction — BUTCHER, 2026-09-24

Ivan approved a narrow tree/environment correction after comparing the actual
Drive references: faithful illustrated tree, lighter peach/blue-green landscape,
separate depth planes with the far plane moving least. Pool controls, geometry,
catalogue, routes and all narrative copy are out of scope.

## What changed

- The displayed tree now uses a 1254 × 1254 transparent reference-derived
  reconstruction instead of enlarging the 226 × 214 detail region in the Qwen
  layer. Added detail is generated, not recovered original detail.
- The opened page retains the source's peach sky, blue-grey distance and muted
  green/gold tree. The existing bark/control artwork is retained. Bark brightness
  is raised from 0.72 to 0.9; no broad night tint is applied to the new landscape.
- Existing title/subtitle and portrait-phone brand use dark slate ink over the light sky.
  Wording, fonts, title sizes and pool name colours do not change.
- Landscape phones keep the pale brand over dark bark. The background continues
  below the tree contact and fades into the bark continuation instead of ending
  abruptly through the trunk. This changes no tree or control coordinates.
- Mouse movement and dragging share one bounded viewpoint. Far/mist/foreground
  move by 2/6/10px horizontally at full displacement. The fixed tree and contact
  ground do not move. Near bark has an overscan margin to avoid exposed edges.
- Control/vine pointer targets never start a world drag. Touch retains normal
  vertical scrolling. Pause, rewind and reduced motion release capture and
  reset the viewpoint; reduced motion stays completely still.

## Preserved contracts

The desktop/portrait/landscape `.resolve-tree` declarations are byte-identical
to the preceding head. Its outer SVG viewBox remains `93 158 226 214`; only the
nested image source and containment mapping change. `frontpage-resolve.mjs`,
including pure seek, DOM-index arrivals and the sole rAF, is unchanged.

The newer approval supersedes the earlier **opened-page** night palette. The
time-zero resolve frame remains tree-only on the existing dark field. This is
not a replacement seed-to-tree video or a claim that Ivan's video is finished.

## Verification ledger

- Test first: 3 new cases failed against the old tree/drag implementation, then
  passed. Final visual inspection added a fourth regression for landscape contact
  clearance and branding contrast. The browser lane grows from 51 to 55 cases;
  none removed or skipped.
- Source browser: 55/55. Built browser: 55/55. Foundation build: 6/6.
  Source contracts: 191/192; sole
  known failure `scratch/tests/ai-kit-offers.test.js:38`, Windows CRLF checkout
  hash `008ceb…` versus committed `c7d630…`, untouched.
- Manual Brave local page: real drag; seven portals remain; no console errors
  or warnings. Sample horizontal translations: far 1.094px, mist 3.197px,
  foreground 5.470px. Tree box remains x=629.242, y=269.992, w=661.516,
  h=626.391 at 1920 × 1080.
- Desktop and phone comparison: reference linework, tree silhouette, gold rim
  light, peach sky, blue-grey depth and light/dark text contrast checked against
  the generated assets and rendered page. Existing pool artwork deliberately
  stays more textured; changing it would exceed this correction.
- Slow/failed-background coverage now intercepts the new valley and mist too.
  The independent tree still decodes, all seven portals become usable and the
  page does not wait for those background requests. Reduced-motion activation
  during a captured world drag releases it and produces a fully opened still.
- BUTCHER runtime: Node 26.3.0 and Brave; repository engine is Node 22.x.
  Physical iOS/Android toolbar, GPU and thermal behaviour are not verified.

### Rendered frames and fold

These are screenshots of the built HTML, not image-generation mockups:

- [Opened desktop](frontpage-tree-proof/desktop.png)
- [Opened portrait phone](frontpage-tree-proof/mobile.png)
- [Opened landscape phone](frontpage-tree-proof/landscape.png)
- [Desktop resolve](frontpage-tree-proof/resolve-desktop.png)
- [Phone resolve](frontpage-tree-proof/resolve-mobile.png)

Full visible pool entries before/after this correction:

| Viewport | Before | After |
|---|---:|---:|
| 1920 × 1080 | 7 | 7 |
| 1672 × 941 | 7 | 7 |
| 1366 × 768 | 7 | 7 |
| 1920 × 720 | 7 | 7 |
| 390 × 844 | 2 | 2 |
| 320 × 568 | 2 | 2 |
| 780 × 390 | 2 | 2 |

[Measured boxes and protected-diff assertions](frontpage-tree-proof/safety.json).
Compared against `fc929e935687f0f8d93a21cd3148aa0525f502bb`: every tree CSS
rule, the clock/seek module, all seven portal markup blocks and all paragraphs
remain identical after line-ending normalization. No file or route was renamed
or deleted by this correction.

### Frame cost

390 × 844, DPR 2, Chromium 4× CPU slowdown, isolated 10-second windows:

| Mode | Main-thread task ms / 60Hz frame | Layouts |
|---|---:|---:|
| Previous head | 1.1467 | 0 |
| Tree/environment correction | 1.1294 | 0 |
| Paused | 0.00384 | 0 |

[Raw profile](frontpage-tree-proof/cost-summary.json). The −0.0173ms difference
is measurement noise, not a speedup claim. The entire active scene uses about
6.78% of a 16.67ms frame budget; that is **not** below a few percent. This slice
adds no measurable steady-state CPU cost. Paused script time and style recalcs
are zero. This CPU proxy does not measure physical phone GPU/decode/thermal cost.
New runtime WebPs total 1,451,520 bytes; PNG masters are not shipped in the site.

### Animator hand-off

Uploaded into the [existing animation-layer folder](https://drive.google.com/drive/folders/1PDKIbmCwhNBTkWMtrKLkjvtyB0YRYYSH),
without replacing earlier files:

- [Layer ZIP: PNG masters + exact WebPs + manifest](https://drive.google.com/file/d/1xf5vjlgo6ItNaXiay6UvR7D4vI_nhkxR/view)
  — 6,603,218 bytes; SHA256
  `a9f811c3091a8a3de3718b119c3940352cd7eeb9d4fbf21c72c1b02d1e5e3e83`.
- [Transparent tree master](https://drive.google.com/file/d/1-kZmimwd80MWqUpIAWFeXrsPCzRyD-l6/view)
  — 2,108,755 bytes.
- [Far valley master](https://drive.google.com/file/d/1DuRKmyUMfvP9B4sD5ATz_D0HtBE-ynZT/view)
  — 2,492,854 bytes.
- [Transparent mist master](https://drive.google.com/file/d/1gMqeYt9p_o2_Nwf0DW3T3RvE5M85qMTB/view)
  — 593,213 bytes.

All four Drive objects' names, sizes and parent folder were read back. Tree/mist
alpha survives encoding. The ZIP contains precisely the generated layers used
by this revision; the existing pool/grass/vine packages remain separate.

### Branch and review boundary

Rebased the existing correction branch on main
`10c4b8de07e43ba71f083fe3af3ff56c8aa05cd5`; no second PR. The immutable final
head and the independent Sail inference receipt are recorded in the PR comment
after push, avoiding a self-referential commit hash in this document.

No production deployment, migration, merge or formal approval is requested.
Continue draft PR #627 against main. The independent review verdict must stay
unpublished because a formal APPROVE can trigger the repository's auto-merge.

Asset sources, exact prompts and layer integration:
[sunset asset manifest](../web/assets/sdforest-sunset/README.md).
