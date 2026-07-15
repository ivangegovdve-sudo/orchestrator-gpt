# Plan 06 — SD Forest Open Overview implementation report

Date: 2026-07-15 (Europe/Sofia)

Worktree: `D:\projects\.worktrees\orchestrator-gpt-open-overview`

Branch: `feat/open-overview-sdforest`

Base: `517de8c5f166e188c9bf7ed10c9c86159bebfe5c`

## Outcome

All eleven Plan 06 tasks were implemented in one continuous pass. SD Forest now has three direct, route-local Open Overview pages:

- `/web/open-overview/index.html` — default cross-source overview.
- `/web/open-overview/openrouter/index.html` — nine-section OpenRouter dashboard.
- `/web/open-overview/github/index.html` — eight-category GitHub dashboard.

The implementation includes exact schema-v2 validation, exact-string numeric handling, a bounded public client, run-coherence checks, checksum verification, a complete ten-deep snapshot, desktop/portrait/landscape compositions, semantic tables and SVG history, typed unavailable states, and a separately lazy-loaded Three.js relationship canopy built only from observed app-model and returned repository-category edges.

No production deployment or alias change was performed.

## Implementation commits

| Commit | Milestone |
| --- | --- |
| `340dd24` | Isolated route shells, exact validators, API client, semantic renderers, route controllers, responsive layouts, and route-local Three.js module |
| `55ebe22` | Atomic live-refresh script plus checksum-verified complete ten-deep snapshot fallback |
| `c2ab8be` | Static, browser, responsive, Three.js, schema-failure, unavailable-state, and inherited-baseline acceptance coverage |
| `9c87d1f` | Explicit missing-v2 preview policy for the currently undeployed public-v2 manifest |

## TDD record

- Initial RED: `node --test scratch/tests/open-overview.test.js` — 0/6 passed; all six failed for missing route files/modules.
- Initial GREEN: 6/6 after the isolated route and trust boundary landed.
- Fallback RED: 7/8 passed; the fallback acceptance test failed with `ENOENT` for `fallback-data.json`.
- Fallback GREEN: 8/8 after generation, canonical-path coverage, exact validation, and checksum verification.
- Missing-v2 RED: the explicit policy test failed with `invalid_http_error` for the configured manifest's HTML 404.
- Missing-v2 GREEN: the HTML 404 now selects the complete snapshot only when `fallbackOnMissingV2` is explicitly enabled; schema-major drift still fails closed.
- Browser acceptance first full run: 7/8. The sole application-correct failure used an over-broad selector that counted 10 primary GitHub rows plus 70 exact-history rows. The corrected direct-child selector passed alone and then in the full suite.
- Final GREEN under Node `v22.23.1`: 10/10 Node tests and 8/8 Playwright tests.

## Immutable-home proof

- `origin/main:index.html` Git blob: `0492a78b0bf5768acdae57b8dc62eb03ef5b691b`
- Current `index.html` Git blob: `0492a78b0bf5768acdae57b8dc62eb03ef5b691b`
- Current homepage SHA-256: `0bcf4ff011111430db6ffef6639f295cad4f81c4d7600821e16b1437b8984ba2`
- `git diff --exit-code origin/main -- index.html web/shared/`: passed.
- `build-vercel-static.cjs` and `vercel.json`: unchanged.

## Final verification

- Runtime: Node `v22.23.1` via the cached npm-packaged Node 22 binary because the machine-wide Node is v26.
- Clean static build: passed.
- Open Overview Node suite: 10 passed, 0 failed.
- Inherited SD Forest guard: passed; underlying suite remains exactly 11 tests / 9 pass / 2 approved inherited failures:
  - `public council exposes exactly two truthful modes`
  - `TinyLM standalone route redirects into Councils`
- Playwright Chromium-engine suite: 8 passed, 0 failed.
- Browser coverage: desktop, 390x844 portrait, 844x390 landscape, direct routes, exact query state, typed matrix/provider failure, schema-major fail-closed, reduced motion, and normal-motion lazy Three.js.
- No-mock preview smoke: overview `10 models / 10 apps / 100 matrix controls`; OpenRouter Free `10 rows`; GitHub MCP Adoption `10 rows`; 0 page errors.
- Core route size excluding Three.js and its vendor: `23,840` gzip bytes (budget: less than 102,400).
- Secret/private-field scan: clean.
- `git diff --check`: passed.
- npm audits: root 0 findings; test dependency tree 0 findings.

Review captures:

- `D:\output\open-overview-plan06-qa\desktop-combined-snapshot.png`
- `D:\output\open-overview-plan06-qa\desktop-matrix-unavailable.png`
- `D:\output\open-overview-plan06-qa\openrouter-free.png`
- `D:\output\open-overview-plan06-qa\github-mcp-adoption.png`
- `D:\output\open-overview-plan06-qa\portrait-combined-matrix.png`
- `D:\output\open-overview-plan06-qa\landscape-matrix.png`

## Snapshot and live-refresh state

- Mode: `snapshot`, visibly labeled in the source rail and page notice.
- Generated/oldest evidence time: `2026-07-15T10:00:00.000Z`.
- SHA-256 checksum: `b9f9703496d74b3cc487ed4cfdeddebd1fffde1f866ec47f0900e4bd18c5ca73`.
- Size: 377,225 bytes.
- Coverage: 10 models, 10 apps, 100 app-model cells, 10 per-app model rows for each top app, providers, free Pareto dimensions, seven history buckets, and 10 repositories for each of eight GitHub categories plus metric/window variants.
- `scripts/sync-open-overview-fallback.mjs` is the production-candidate refresh path. It accepts only strict public-v2 data, rejects fixture/test/seed transforms, validates publication runs and age, and replaces the file atomically.

## Preview handoff

- Local preview: `http://127.0.0.1:4174/web/open-overview/index.html`
- Listener PID at handoff: `1332`.
- All three HTML routes plus `fallback-data.json` returned HTTP 200.
- Port 4174 is intentional: the pre-existing port-4173 `serve` process canonicalized `index.html` URLs and dropped query parameters; the route-specific server preserves the approved query state.

## Deviations and remaining promotion gate

The configured public-v2 manifest currently returns an HTML HTTP 404. Therefore a live-derived production candidate could not truthfully be generated. The committed complete snapshot is deterministic and explicitly labeled; it is suitable for local/preview continuity, not for claiming live production freshness. Production promotion remains gated on the dashboard's strict v2 deployment followed by:

1. running `scripts/sync-open-overview-fallback.mjs --require-live` against the approved HTTPS API;
2. rerunning the full acceptance suite against that artifact; and
3. obtaining explicit production-deployment approval.

The pinned Playwright Chromium download also stalled on this machine. Local QA used Playwright against the installed Chromium-based Chrome executable. The configuration falls back to Playwright's bundled Chromium when that Windows executable is absent, so CI remains portable.
