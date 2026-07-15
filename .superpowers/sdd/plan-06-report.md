# Plan 06 — SD Forest Open Overview implementation report

Date: 2026-07-16 (Europe/Sofia)

Worktree: `D:\projects\.worktrees\orchestrator-gpt-open-overview`

Branch: `feat/open-overview-sdforest`

Base: `86a0ea3bd48d9642b6ef37a4e3e896994a5297cc`

## Outcome

All eleven Plan 06 tasks were implemented in one continuous pass. SD Forest now has three direct, route-local Open Overview pages:

- `/web/open-overview/index.html` — default cross-source overview.
- `/web/open-overview/openrouter/index.html` — nine-section OpenRouter dashboard.
- `/web/open-overview/github/index.html` — eight-category GitHub dashboard.

The implementation includes exact schema-v2 validation, exact-string numeric handling, a bounded public client, run-coherence checks, checksum verification, a complete ten-deep snapshot, desktop/portrait/landscape compositions, semantic tables and evidence-gated SVG history, typed unavailable states, and a separately lazy-loaded Three.js relationship canopy built only from observed app-model and returned repository-category edges. Review remediation additionally enforces stable-only manifest tiers, strict real ISO dates/times, recursive forbidden-key rejection, 16,384-character model descriptions, truthful unmanifested provenance status, eight-consecutive-day chart eligibility, bounded exact-history rendering, timeout-bounded config/fallback reads, per-client verified-fallback caching, a four-MiB generated bundle ceiling, and 320px/200% reflow accessibility. The final truth-and-identity pass labels deterministic direct-v2 evidence as fixture on approved preview origins and rejects it on canonical production, binds every response to its requested identity and slice, pins deferred loads to one manifest publication, and exposes GitHub enrichment provenance without describing partial star buckets as exact.

No production deployment or alias change was performed.

## Implementation commits

| Commit | Milestone |
| --- | --- |
| `340dd24` | Isolated route shells, exact validators, API client, semantic renderers, route controllers, responsive layouts, and route-local Three.js module |
| `55ebe22` | Atomic live-refresh script plus checksum-verified complete ten-deep snapshot fallback |
| `c2ab8be` | Static, browser, responsive, Three.js, schema-failure, unavailable-state, and inherited-baseline acceptance coverage |
| `9c87d1f` | Explicit missing-v2 preview policy for the currently undeployed public-v2 manifest |
| `cab91f3` | Initial consolidated Plan 06 verification record and portable browser-launch selection |
| `df8b563` | Browser runner safely reuses the isolated route-specific preview listener |
| `40ba8a1` | Exact validator parity, provenance truth, evidence-gated history, fallback bounds/cache, no-observer semantics, 320px reflow, table semantics, and refreshed proof |
| truth-and-identity fix (this commit) | Direct fixture truth, request/response identity binding, publication-coherent deferred loads, and partial GitHub enrichment disclosure |

## TDD record

- Initial RED: `node --test scratch/tests/open-overview.test.js` — 0/6 passed; all six failed for missing route files/modules.
- Initial GREEN: 6/6 after the isolated route and trust boundary landed.
- Fallback RED: 7/8 passed; the fallback acceptance test failed with `ENOENT` for `fallback-data.json`.
- Fallback GREEN: 8/8 after generation, canonical-path coverage, exact validation, and checksum verification.
- Missing-v2 RED: the explicit policy test failed with `invalid_http_error` for the configured manifest's HTML 404.
- Missing-v2 GREEN: the HTML 404 now selects the complete snapshot only when `fallbackOnMissingV2` is explicitly enabled; schema-major drift still fails closed.
- Browser acceptance first full run: 7/8. The sole application-correct failure used an over-broad selector that counted 10 primary GitHub rows plus 70 exact-history rows. The corrected direct-child selector passed alone and then in the full suite.
- Initial GREEN under Node `v22.23.1`: 10/10 Node tests and 8/8 Playwright tests.
- Post-review RED/GREEN covered finalized Plan 03/05 response compatibility, matrix coherence and bounds, required/optional source aggregation, local-only fixture policy, roving keyboard navigation, Escape/close/focus restoration, exact accessible values, Save-Data behavior, WebGL context-loss recovery, and deferred optional datasets.
- Review-fix RED: 28/33 focused Node tests passed; five failures proved the missing manifest-tier parity, unmanifested provenance row, eight-day history model, timeout/cache path, and aggregate-size guard.
- Review-fix GREEN: 33/33 focused Node tests and 16/16 Playwright scenarios.
- Final visual RED/GREEN: the 320px capture exposed a centered source label clipped from its leading edge; the new text-geometry assertion reproduced `labelLeft 134.3125 < controlLeft 164`, then passed after the mobile source control was changed to left-aligned ellipsis.
- Truth-and-identity RED: 0/4 focused tests passed, proving the direct API mislabeled deterministic evidence as live, request identities were not asserted, publication-incompatible views could merge, and GitHub partial buckets lacked source disclosure.
- Truth-and-identity GREEN: 4/4 focused tests passed. The inherited Open Overview suite remained 33/33 and the browser suite remained 16/16.

## Immutable-home proof

- `origin/main:index.html` Git blob: `0492a78b0bf5768acdae57b8dc62eb03ef5b691b`
- Current `index.html` Git blob: `0492a78b0bf5768acdae57b8dc62eb03ef5b691b`
- Current homepage SHA-256: `0bcf4ff011111430db6ffef6639f295cad4f81c4d7600821e16b1437b8984ba2`
- `git diff --exit-code origin/main -- index.html web/shared/`: passed.
- `build-vercel-static.cjs` and `vercel.json`: unchanged.

## Final verification

- Runtime used for the current proof: Node `v26.3.0`, npm `11.16.0`.
- Clean static build: passed.
- Open Overview Node and fixture-policy suites: 33 passed, 0 failed.
- Truth-and-identity contract suite: 4 passed, 0 failed.
- Inherited SD Forest guard: passed; underlying suite remains exactly 11 tests / 9 pass / 2 approved inherited failures:
  - `public council exposes exactly two truthful modes`
  - `TinyLM standalone route redirects into Councils`
- Playwright Chromium-engine suite: 16 passed, 0 failed in 21.3 seconds.
- Browser coverage: 1440x900 desktop, 390x844 portrait, 844x390 landscape, 320px at 200% page scale, unclipped mobile source-label geometry, direct routes, exact query state, truthful required/optional and unmanifested-provenance status, malformed-matrix rejection, keyboard/focus behavior, semantic row identity, labeled focusable scroll regions, bounded exact-history fallback, missing-IntersectionObserver eager semantic loading, typed matrix/provider failure, schema-major fail-closed, reduced motion, Save-Data, normal-motion lazy Three.js, and WebGL context-loss recovery.
- No-mock preview smoke: overview `10 models / 10 apps / 100 matrix controls`; OpenRouter Free `10 rows`; GitHub MCP Adoption `10 rows`; 0 page errors.
- Core route size excluding Three.js and its vendor: `37,132` gzip bytes (budget: less than 102,400).
- Secret/private-field scan: clean.
- `git diff --check`: passed.
- npm audits: root 0 findings; test dependency tree 0 findings.

Review captures:

- `D:\output\open-overview-qa-2026-07-15-review-fixes\desktop-combined-snapshot.png`
- `D:\output\open-overview-qa-2026-07-15-review-fixes\desktop-matrix-unavailable.png`
- `D:\output\open-overview-qa-2026-07-15-review-fixes\openrouter-free.png`
- `D:\output\open-overview-qa-2026-07-15-review-fixes\github-mcp-adoption.png`
- `D:\output\open-overview-qa-2026-07-15-review-fixes\portrait-combined-matrix.png`
- `D:\output\open-overview-qa-2026-07-15-review-fixes\landscape-matrix.png`

## Snapshot and live-refresh state

- Mode: local/allow-listed preview fixture only, visibly labeled `Fixture · stale · non-production` in the source rail and page notice.
- Generated/oldest evidence time: `2026-07-15T10:00:00.000Z`.
- SHA-256 checksum: `1abdd8aceded7cabc10a076412d5450ce84a42a1966b5c0e04ed7fbc642978f5`.
- Size: 867,520 bytes (generation rejects any final UTF-8 bundle above 4 MiB before writing).
- Production eligibility: `false`; a production origin fails unavailable rather than presenting this fixture.
- Freshness coverage: all 165 bundled responses have per-dataset freshness metadata, including optional datasets; all 80 GitHub enrichment responses carry the exact requested date range.
- Coverage: 10 models, 10 apps, 100 app-model cells, 10 per-app model rows for each top app, providers, free Pareto dimensions, seven history buckets rendered as bounded exact tables until an eighth consecutive complete day exists, and 10 repositories for each of eight GitHub categories plus metric/window variants and maintenance enrichment.
- `scripts/sync-open-overview-fallback.mjs` is the production-candidate refresh path. It accepts only strict public-v2 data, rejects fixture/test/seed transforms, validates publication runs and age, enforces the final aggregate byte ceiling, and replaces the file atomically.

## Preview handoff

- Local preview: `http://127.0.0.1:4174/web/open-overview/index.html`
- All three HTML routes plus `fallback-data.json` returned HTTP 200.
- Port 4174 is intentional: the pre-existing port-4173 `serve` process canonicalized `index.html` URLs and dropped query parameters; the route-specific server preserves the approved query state.

## Deviations and remaining promotion gate

The configured public-v2 manifest currently returns an HTML HTTP 404. Therefore a live-derived production candidate could not truthfully be generated. The committed complete fixture is deterministic, explicitly non-production, and accepted only on localhost or an exact configured HTTPS preview origin. Production fails unavailable until a live-derived candidate exists. Production promotion remains gated on the dashboard's strict v2 deployment followed by:

1. running `scripts/sync-open-overview-fallback.mjs --require-live` against the approved HTTPS API;
2. rerunning the full acceptance suite against that artifact; and
3. obtaining explicit production-deployment approval.

The pinned Playwright Chromium download also stalled on this machine. Local QA used Playwright against the installed Chromium-based Chrome executable. The configuration falls back to Playwright's bundled Chromium when that Windows executable is absent, so CI remains portable.
