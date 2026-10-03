# SD Forest pool entries

The authoritative brief is `SDFOREST-BRIEF.md` on `docs/sdforest-brief`.
This pipeline keeps the locked Option A front-page layout and integrates the
six non-Health entry concepts requested in that brief. Health's eukaryotic cell
is implemented separately. All entry art here is rendered in the browser;
there are no generated assets, inference calls, or paid APIs.

The scenes, pool typography and authored pages were selectively reused from
PR #694 (`2d19c23c6a653094315ad97e25a720f4fe7c31e1`) without merging its branch.
The implementation retains catalog membership, lifecycle labels and evidence
records. Per-project Feedback remains usable even when a destination is closed.
Feedback delivery still has the brief's unresolved placeholder endpoint.
Buy Me a Coffee is visible and disabled with the message “The coffee link is
still brewing.” until its destination is provided.

| Pool | Entry gesture |
|---|---|
| Artificial Self | Neuron and circuit approach, meet and exchange signals both ways. |
| My Story | A pencil draws a chair, pauses at an overlong leg, scribbles its correction and repeats. |
| GrowingApp | A seedling reaches pencil height marks on a sunlit door casing. |
| AI-d kit | A request pulse finds a cable, the plug seats and the readout resolves. Prices remain unknown. |
| TinkerBox | An exploded gear train assembles and runs, leaving one spare screw. |
| Design Gallery | Three doorways appear as the gallery lights wall by wall. |

The shared runtime has been corrected to resume the current gesture after
hidden or off-screen time, reject malformed review query parameters and preserve
the reduced-motion still during ResizeObserver's initial delivery. Decorative
canvases cannot intercept navigation. Phone Gallery and Artificial Self copy
reserve room for the lower-corner site controls.

Each entry has a real heading, explanation, small redesign notice and a link
past its scroll stage into the project page. Phone layouts have their own scene
composition. Reduced motion uses a composed still and normal page scrolling.
The scroll engine remains an unchanged copy of the repo's scroll-craft engine.
Font licenses and upstream notices are under
`web/shared/pool-entry/font-licenses/`.

## Verification

Run the source contracts:

```powershell
node --test scratch/tests/sdforest-pool-entry.test.js
```

Run the actual-browser checks against the built server:

```powershell
$env:SDFOREST_TEST_URL = 'http://127.0.0.1:4580'
node scripts/verify-sdforest-pool-entries.cjs
```

`playwright-core` must be resolvable, and `CHROME_PATH` may override the installed
Chrome path. The verifier disables native pointer lock and pointer capture.

The 2026-10-03 source-server run passed 18 cases: six pools at 1440×900 desktop,
390×844 phone and 390×844 reduced motion. It checked live canvas advancement,
stable reduced-motion pixels, scene identity and portrait layout, off-screen
pause, horizontal overflow, working entry skip links, per-project feedback,
focus restoration and browser/resource errors. Screenshots and machine-readable
results are in `docs/sdforest-pipeline-evidence/pool-entries/`; the desktop and
phone contact sheets were visually inspected. These captures are browser
emulation, not verification on physical phone hardware. The root pipeline
verification covers the final built package separately.
