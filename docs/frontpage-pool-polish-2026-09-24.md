# Pool instruments — local motion and depth, BUTCHER

Approved animation pass, 2026-09-24. Existing draft orchestrator-gpt PR #627,
against main. Do not merge or publish an approval event. This corrects the
runtime at `e13788e29c86fd2c2f0599b29404d5953f471e3d`; the rooted-ground asset
preview remains separate and is **not integrated** by this change.

## What happens when used

| Pool | Idle | Hover / focus | Click |
|---|---|---|---|
| Health | Stationary angular ECG, resting intervals, recessed grid and glass | Beat frequency rises from about 1.05 to 2 Hz | Held press and the first 160 ms of activation go flat; the instrument resumes even while selected. Only the instrument reacts, never its bark housing. |
| Artificial Self | A source cell fires, a charge travels, the receiving cell fires; refractory intervals remain quiet | An immediate circuit starts and propagation becomes more frequent | The three-cell cascade completes in about 286 ms; short tails, channel charge and membrane halos use the same causal sample. |
| AI-d kit | Small lever tension and local light movement | Lever takes up tension; cross begins turning | Lever completes a larger hinged stroke and recoils; cross flips to its latched state. |
| GrowingApp | Seed, sapling and tree have different staggered motions | Growth/light activity increases | The three symbols respond in sequence with local rotation and lift, not a shared panel bounce. |
| TinkerBox | Subtle pin tension and recessed light | Pins withdraw in sequence and the seam opens slightly | Lid pivots after the pins release, with a deeper transient opening. |
| Design Gallery | A slow local exhibit-light shift | Shutters open to unequal intermediate angles | Shutters complete their hinged travel with a short settling response. |
| My Story | Existing signal marks remain faintest at the beginning and strongest at the end | Transmission rate increases | One faster transmission passes across the existing marks. No story copy changes. |

All seven outer housings remain planted. Volume comes from the existing painted
parts plus recesses, contact shadows, glass highlights and independent pivots:
this is **2.5D**, not reconstructed 3D meshes or new hidden asset geometry.

First activation still selects; the next deliberate activation confirms entry.
Confirmation gets 360 ms on the **existing clock** before the same route opens.
Escape cancels pending entry. Pause/reduced motion cannot strand a confirmed
navigation behind a stopped clock. Key repeats and physical double-clicks do
not become shortcuts. A cancelled pointer gesture does not arm a pool.

## Rendered evidence

[Actual browser recording](https://drive.google.com/file/d/1Ys3EnNvZ0wfQJhbFHf1ZwqKdcOGEsu5M/view)
— 5,805,620 bytes, read back in the existing animation-layer folder. Shows all
seven idle/hover/held-press/activation/cancel interactions. No sharing changes
or old files replaced. This is not a separate animation mock.

[Desktop](frontpage-pool-polish-proof/desktop.png) ·
[Phone](frontpage-pool-polish-proof/phone.png) ·
[Full phone](frontpage-pool-polish-proof/phone-full.png) ·
[Narrow](frontpage-pool-polish-proof/narrow.png) ·
[Landscape](frontpage-pool-polish-proof/landscape.png)

[Sharp ECG](frontpage-pool-polish-proof/health-sharp-beat.png) and
[held press](frontpage-pool-polish-proof/health-press.png) are distinct poses.
The ECG peak capture pauses browser virtual time at an actual rendered QRS
peak, then captures it; it does not redraw the trace. The ordinary interaction
recording includes uninterrupted beats. The other stills are actual browser
captures, not new art assets.

| Viewport | Fully visible entries, before -> after | Horizontal overflow |
|---|---|---|
| 1920x1080 | 7 -> 7 | None |
| 390x844 | 2 -> 2 | None |
| 320x568 | 2 -> 2 | None |
| 780x390 | 2 -> 2 | None |

All seven entries remain reachable. Every recorded selection retains the exact
tree box; each housing's computed transform is `none`. No uncaught page errors.
[Measurements](frontpage-pool-polish-proof/measurements.json).

## Verification and test corrections

- Final source browser suite: **61/61**, no skips.
- Final fresh built-page browser suite: **61/61**, no skips.
- Built foundation: **6/6**.
- General source suite: **191/192**; only the untouched pre-existing Windows
  CRLF hash mismatch `008ceb...` vs `c7d630...`, `ai-kit-offers.test.js:38`.
- Browser plugin absent; existing Playwright/Brave lane used on BUTCHER.
  Node 26.3.0 locally; repository Node 22 engine declaration unchanged.
- Six added browser regressions. The first four targeted checks were observed
  failing before implementation; confirmation-before-entry and completing the
  neural cascade before navigation were separately caught before their fixes.
- The old Health assertion kept the selected state flat indefinitely. It now
  checks flat during press and recovery while selection remains armed.
- The old neural check assumed motion in any arbitrary 180 ms interval and a
  bright selected core. It now observes an actual firing event and its peak.
- The phone visibility check took eight half-second snapshots, which could all
  miss a brief impulse/rest cycle. Both initial final runs were 60/61 because of
  that test. It now observes actual style movement across a complete sparse
  cycle; it still fails if a visible pool stops when the tree leaves the screen.
  Both complete suites were rerun to the 61/61 results above.

Tests exercise keyboard, touch-scroll cancellation, pause, reduced motion,
failed images, hidden controls, reversing the intro, selection cancellation,
single-rAF ownership, static fallbacks and layout-read guards. Physical phone,
Safari, GPU/thermal/battery behaviour and aesthetic acceptance remain unverified.

## Frame cost — isolated 4x CPU phone proxy

Baseline is e13788e, 390x844 at device scale factor 2. Ten-second samples,
no competing browser jobs during measurement. No trace instrumentation.

| View | Before task ms / 60Hz frame | After | Added fraction of 16.67ms |
|---|---:|---:|---:|
| Leading controls | 1.2030 | 1.3755 | 1.04% |
| Artificial Self in view | 1.2472 | 1.5218 | 1.65% |
| Paused leading / neural | — | 0.00438 / 0.00347 | No script time or style recalculation |

Both active measurements have **zero layouts**. Whole-scene cost is about
8.25% / 9.13% of the emulated main-thread budget, not below 3%. The added cost
is the smaller figure in the table. [Leading data](frontpage-pool-polish-proof/cost-leading.json)
and [neural data](frontpage-pool-polish-proof/cost-neural.json). These single
pairs are a diagnostic comparison, not a statistical performance guarantee.

## Scope and reproduction

Direct diff checks: every tree CSS rule, the entire `seek()` function and
`index.html` are unchanged. No routes renamed/deleted. No pool pages, catalog,
ranks, registry, narrative or biographical copy changed. No product dependencies,
migrations or deployment. All animation writes remain transform/opacity on
local layers; the existing tree write remains filter-only. No second clock.

Run `node --test scratch/tests/frontpage-resolve.test.js`, repeat with
`SDFOREST_TEST_ROOT` pointing at fresh `vercel-public`, and run `npm test`.
The reproduction script is `scratch/frontpage-pool-polish-proof.cjs`; set
`SDFOREST_PROOF_DIR`, `SDFOREST_BASE_URL` and `CHROME_PATH` for the local browser.
The editable instruments remain native SVG/HTML/CSS in the committed runtime,
with the original raster parts untouched. Timing and causal samples are in
`web/shared/frontpage-pool-effects.mjs`; pivots are in `frontpage-workbench.mjs`.

For timing, set `SDFOREST_PROFILE_BASELINE=e13788e29c86fd2c2f0599b29404d5953f471e3d`
and run `scratch/frontpage-ambient-profile.cjs baseline,ambient,paused`; repeat
with `SDFOREST_PROFILE_POOL=artificial-self`. Set `SDFOREST_PROFILE_OUT` outside
the repo. Review/head readback is recorded in the PR after push, not as a
formal approval event.
