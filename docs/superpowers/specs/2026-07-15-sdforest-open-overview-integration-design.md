# SD Forest Open Overview Integration and Visualization Design

**Status:** Draft for user review on 2026-07-15.

**Data-contract dependency:** `openrouter-github-dashboard` commit `60dca78` and `docs/superpowers/specs/2026-07-15-open-overview-archive-v2-design.md` are the reviewed source of truth for archive, ranking, completeness and API semantics. SD Forest consumes schema major `2` only.

## Product outcome

Add Open Overview to SD Forest as a compact, animated intelligence subsite that feels native to the Forest without altering or importing the homepage animation. The combined cross-source matrix is the default. Dedicated OpenRouter and GitHub dashboards are one click deeper.

The route is useful even to a frequent expert user: ten model leaders and ten app leaders are visible together, with their observable model relationships when an approved source publishes them; eight GitHub categories are scannable without card sprawl; lifecycle, free-model, task, benchmark and historical signals are immediately reachable; every number can be traced to its source and window.

## Upstream implementation gate

SD implementation begins only after both design specs are committed/reviewed, the v2 OpenAPI document and a preview API exist, and the upstream parity/cutover observation gate has passed for every dataset required by Release 1. `config.json` pins the approved API schema major and preview/production base; the implementation plan records the exact upstream API commit. A spec alone or an untracked route is not treated as a consumable dependency.

## Route and repository boundary

Create a route-local feature under `web/open-overview/`:

```text
web/open-overview/
  index.html                 combined cross-source overview
  openrouter/index.html      dedicated OpenRouter dashboard
  github/index.html          dedicated GitHub dashboard
  open-overview.css          route-only layout and visual system
  open-overview.js           state, rendering and interactions
  open-overview-api.js       bounded fetch, ETag cache and response validation
  open-overview-schema.js    public-v2 schema/version checks
  open-overview-charts.js    accessible SVG chart renderers
  open-overview-three.js     route-only Three.js relationship layer
  config.json                public API base and route configuration
  fallback-data.json         generated last-known live public snapshot; required for production promotion
  README.md                  contract, fallback and local QA notes

scripts/
  sync-open-overview-fallback.mjs
                             validates and atomically refreshes fallback-data.json
```

The existing static build already copies `web/` into `vercel-public/`; no new build system or framework is introduced.

Initial integration must not modify:

- root `index.html`;
- `web/shared/forest-home.css`;
- `web/shared/forest-motion.js`;
- `web/shared/forest-three.js` or its effect modules;
- the current homepage project count, assembly behavior or animation timing.

The Open Overview route may import stable Forest shell tokens and motion helpers without modifying shared files. Its Three.js runtime is imported only by Open Overview pages and cannot select or mutate homepage nodes. The initial diff allow-list is `web/open-overview/**`, `scripts/sync-open-overview-fallback.mjs`, route-specific tests and approved documentation. Verification runs `git diff --exit-code origin/main -- index.html web/shared/`. A homepage portal card is a later, separately reviewed change after direct-route preview approval.

## Information architecture

### Global navigation

- Forest return link.
- Product title: `Open Overview`.
- Three visible destinations using canonical real links: `/web/open-overview/index.html`, `/web/open-overview/openrouter/index.html`, and `/web/open-overview/github/index.html`.
- Source-health control showing per-dataset mode, freshness, completeness, as-of and watermark.
- Compact time-window control where the selected view supports history.

Navigation uses real links to the three static routes so deep links, refresh and no-JavaScript orientation remain truthful. JavaScript may preserve filters through query parameters but does not replace route semantics.

All CSS, JavaScript, configuration and fallback assets use root-absolute `/web/open-overview/...` URLs so nested-route refreshes cannot resolve them relative to `/openrouter/` or `/github/`. Each canonical nested URL and every asset must return HTTP 200 without relying on clean-URL rewrites.

### Combined overview

The main desktop field is one continuous analytical surface rather than a stack of large cards. The matrix region is always reserved but populated only by the single bounded `/api/public/v2/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete` response. When the gated dataset is unavailable, that region explains the missing source contract while the two stable leaderboards remain visible.

```text
+--------------------------------------------------------------------------+
| source rail | as-of | coverage | window | provenance | view controls     |
+------------------+--------------------------------+----------------------+
| 10 model rows    | 10 x 10 app/model matrix       | 10 app rows          |
| rank/name/change | observed token relationship   | rank/name/top models |
+------------------+--------------------------------+----------------------+
| Free | Deprecations | Tasks | Benchmarks | selected relationship detail |
+--------------------------------------------------------------------------+
| eight GitHub category strips: top 3 visible, expand to ranked top 10      |
+--------------------------------------------------------------------------+
| historical charts / source notes / API + agent archive entry points       |
+--------------------------------------------------------------------------+
```

Target visual row height is 28-36px on fine-pointer desktop. A model or app expands into a side/detail region only after selection; it never consumes half the initial viewport. The default viewport should expose all ten model and app names or make the tenth reachable with one contained scroll, while at least four GitHub category leaders remain visible below the fold cue.

### Dedicated OpenRouter route

Sections are attached to one compact secondary navigation: Usage, Apps, App-to-Model, Free, Deprecations, Tasks, Benchmarks, Providers and Source Status.

- Usage: top ten current models plus historical top-ten-plus-Other area and rank movement.
- Apps: popular/trending top ten with tokens, requests, period and source rank.
- App-to-Model: selected-app model ranking, coverage, matrix and history when published.
- Free: daily complete concrete `:free` inventory, weekly popularity default, filterable frontier views and separate `openrouter/free` router explanation.
- Deprecations: scheduled/past/absent/removed states with first-seen and last-seen history.
- Tasks: task shares and top models using the source's declared window.
- Benchmarks: source-separated rankings and explicit frontier comparisons.
- Providers: current endpoint price, latency, throughput and uptime with null-aware display.

### Dedicated GitHub route

The category selector exposes all eight primary categories:

1. AI harnesses and coding agents.
2. Inference/model serving.
3. AI Skills.
4. MCP.
5. Connectors.
6. A2A.
7. Agent frameworks.
8. General AI orchestration.

Each category defaults to Adoption, using the published versioned formula `0.75 * percentile_cont(log1p(stars)) + 0.25 * percentile_cont(log1p(forks))` within the eligible category population. Rows show `rankMethod`, `ruleVersion`, eligible population and raw stars/forks. Momentum choices remain disabled until their full 7/30/90-day windows exist; incomplete coverage is never zero. Maintenance uses the upstream recency rule. Maturity, Interoperability, Openness and Confidence remain facets until a versioned upstream formula exists. Historical/reference-role projects never compete silently with active executable products. Secondary categories and project-family aggregation appear in detail, not as duplicate cross-ecosystem winners.

## Region-to-dataset contract

| Region | Source/API query | Rank/metric method | Required evidence | Fallback |
|---|---|---|---|---|
| Model rail | `models_top_weekly` through `/models?rank_source=top-weekly&limit=10` | Server response order, selected locally | acquisition-complete requested slice; exact window unknown | live-derived snapshot, else unavailable |
| App rail | `apps_ranked` through `/apps?sort=popular&start=...&end=...&limit=10` | Source absolute rank | explicit inclusive UTC dates and published watermark | live-derived snapshot, else unavailable |
| App/model matrix | `/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete` | Source observation only; no client inference | approved app-model watermark, allowed match-confidence tier, partial/unknown population metadata | typed unavailable region; never fabricated |
| Free strip/page | complete weekly-ordered catalog plus current variants | Preserve server order after filtering concrete `:free` IDs | population-full catalog acquisition; no fixed count | snapshot, else unavailable |
| Deprecations | `/deprecations` | lifecycle state/time ordering | complete catalog watermark; absent and explicit-null distinguished | snapshot, else unavailable |
| Tasks | `/tasks` | source 7-day sampled shares | sampled basis and denominator/as-of caveats | snapshot, else unavailable |
| Benchmarks | `/benchmarks?source=...` | source-native score/rank only | source discriminator, citation and explicit model-match status | snapshot, else unavailable |
| GitHub category strips | `/github/rankings?metric=adoption&category=...&limit=10` | versioned Adoption/Momentum/Maintenance rule | taxonomy/rule versions, eligible population and coverage | snapshot, else unavailable |

“Current” therefore means the API's resolved published watermark for that region, not the viewer's wall clock. The client never joins incompatible snapshots or substitutes the unranked model catalog for a ranking.

## Responsive composition

The reviewed composition direction has three first-class layouts; mobile is not a shrunken desktop.

### Large screen, 1440 x 900 reference

- Fixed-density three-column model/matrix/app field.
- Source rail and controls remain one or two compact lines.
- Analysis strip uses horizontal micro-panels, not large cards.
- GitHub categories use a four-by-two grid of dense leaderboard strips.
- Detail opens as a right drawer or lower inspector without reflowing every row.

### Portrait mobile, 390 x 844 reference

- Segmented control: `Models`, `Apps`, `Matrix`.
- Each segment preserves the full top ten; it changes presentation, not data availability.
- Matrix supports deliberate two-axis pan with sticky app/model labels and a selected-cell inspector.
- Free/deprecation/task/benchmark summaries become horizontally scrollable labeled chips with a detail sheet.
- GitHub shows one selected category leaderboard; one control opens a single-level sheet containing all eight categories.

### Landscape mobile, 844 x 390 reference

- Matrix becomes the primary canvas.
- Model labels remain fixed on the top/left edge where space permits.
- Selected relationship detail occupies a compact side panel.
- Header and source status collapse to one line; no modal blocks the matrix.

Breakpoints are driven by available width and orientation, not device names. Mobile interactive rows/cells have non-overlapping hit regions at least 44 by 44px; 28-36px rows are limited to fine-pointer desktop.

## Data client and fallback behavior

`config.json` provides a public API base and expected schema major version. The route consumes only `/api/public/v2` allow-listed endpoints.

Cross-origin access is anonymous `GET`/`OPTIONS` only. The browser sends no credentials, and the API's explicit origin allow-list is verified from the real preview origin before release.

Runtime sequence:

1. Fetch manifest/source status with a bounded timeout; retain its per-dataset watermarks.
2. Validate schema version before rendering data views.
3. Fetch the current view's minimal datasets in parallel.
4. Verify every response watermark against the manifest. Refetch a mismatch once; if it persists, render a labeled mixed-snapshot/partial state rather than joining the responses.
5. Render stable-source data even when best-effort app/model data fails.
6. Cache successful public responses in memory for route transitions; optional browser cache obeys API ETags.

If the API is unreachable, the client may use `fallback-data.json` only when it was generated from a validated live `/api/public/v2` response. The snapshot displays its original as-of and retrieval times plus a `snapshot` label. Live and fallback rows are never merged. A fixture response cannot refresh the fallback file. If neither live data nor a valid live-derived snapshot exists, the route renders the honest unavailable state.

State is orthogonal per dataset:

- `mode: live | snapshot | fixture`.
- `freshness: current | stale` with age/reason.
- `completeness: complete | partial | unavailable`.

The overall badge is derived from required datasets without hiding any per-source state. Fixture mode is allowed only on localhost and explicitly allow-listed previews, always visibly labeled. Canonical production rejects it.

ETag cache entries are `{ url, etag, validatedBody }`. The client sends `If-None-Match` only when the validated body exists, reuses that body on `304`, and retries once without the conditional header if it does not. Fetch uses `credentials: "omit"`. CORS allows `If-None-Match` and exposes `ETag` plus the correlation-ID header.

No browser receives OpenRouter, GitHub, database or cron credentials. The SD route never reads Neon directly. CORS is constrained by the API to canonical SD Forest and explicit preview origins.

## Density and interaction rules

- Tables and matrices are the default; cards are reserved for an active selection or explanation.
- Top lists default to ten. Top three are visually emphasized without hiding ranks four through ten.
- Numbers use tabular figures and compact formatting, with exact values available on focus/selection and in the authoritative table. Identifiers remain opaque strings; token totals use BigInt-safe formatting; money uses decimal/string-safe formatting. `Number()` is never applied to IDs, token totals or prices.
- Every chart/table title includes metric and window; every data region exposes source and as-of metadata.
- Unknown values display `—` plus a reason on focus/selection. Unknown matrix cells are visually distinct from zero.
- Filters are attached to the region they affect. A control never silently changes unrelated regions.
- URL query parameters preserve view, category, metric, window, selected app/model/repository and chart mode.
- Upstream strings are inserted with `textContent`/safe DOM APIs, never `innerHTML`; lengths are bounded. External URLs must be credential-free public HTTP(S), otherwise they render as plain text.
- The matrix is a semantic table with scoped row/column headers and one roving-tabindex cell control. Arrow keys move the active cell; Enter/Space opens detail; Escape closes it and restores focus. Desktop inspectors are nonmodal; mobile sheets trap and restore focus.

## Visualization plan

Use semantic HTML/SVG for quantitative truth and Three.js for verified relationship context.

### Release 1: required surfaces, charts eligible when evidence exists

- Horizontal bars and sparklines for ranked model/app/repository rows.
- Ten-by-ten app/model heatmap with explicit unknown cells.
- Top-ten-plus-Other stacked model usage area when numeric history exists.
- Bump chart for model rank movement.
- GitHub category small multiples for stars/forks and full-window deltas.
- Deprecation timeline from observed events.

Release 1 requires the top-ten model/app rails, the matrix region (observations or typed unavailable), all eight GitHub category leaderboards, Free/Deprecation/Task/Benchmark snapshots, source states and the route-local Three.js enhancement/fallback. Chart gates are: one watermark for current bars; at least eight consecutive daily buckets for model area/bump charts; a complete selected 7/30/90-day window plus at least eight observations for GitHub trends; and at least one observed lifecycle event for a timeline. A chart that lacks its minimum evidence is replaced by its table and an explanation, not placeholder marks.

### Phase 2: denominator-dependent, non-blocking until gated data exists

- Per-app 100% stacked bars.
- Selected-app top-four-plus-Other donut.
- App-to-model flow diagram.

These render only when the app-total denominator and returned model totals share one source payload/window and coverage is at least 95%. Otherwise the UI uses observed ranked rows plus an uncertainty/remainder segment and does not normalize to 100%.

### Phase 3: comparative frontiers, non-blocking until gated data exists

- Free-model benchmark/latency, context/throughput and benchmark/price Pareto plots.
- GitHub adoption-versus-momentum scatter with maintenance/confidence encoded separately.
- Provider performance history after sufficient normalized observations exist.

Free-model frontiers require at least three models with non-null values for both selected dimensions at one compatible source/as-of; provider history requires at least eight daily observations. Benchmark source scales remain separate. Hardware/provider context is visible for performance comparisons. The GitHub Three.js grove and richer historical transitions render only after their taxonomy/history gates pass; their absence does not weaken the required semantic leaderboards.

## Route-local Three.js design

The visual metaphor is an evidence-bearing canopy/network in an adjacent bounded panel. It never sits behind quantitative text, table controls or matrix hit targets:

- App nodes and model nodes exist only for current published entries.
- An edge exists only when a published app/model observation exists.
- Edge width/brightness is derived from the selected metric and declared denominator.
- Missing long-tail relationships are omitted and called out in the coverage legend.
- GitHub category/repository nodes occupy a separate grove. Cross-source edges are prohibited unless a future explicit dataset proves the relationship.
- DOM table/matrix selection highlights matching Three.js nodes. The canvas is unfocusable, `aria-hidden` and has no canvas-only action; pointer events do not bypass the equivalent DOM selection.
- Layout is deterministic for the same data/filter state. Random drift, orbital motion or camera travel cannot imply changing rank or relationship evidence.

The 3D layer is never the sole representation of a value. It is `aria-hidden`; the DOM/SVG equivalent remains authoritative.

### Isolation and lifecycle

- The main route bundle must not statically import Three.js. It dynamically imports `open-overview-three.js`, which then dynamically imports `/web/vendor/three/three.module.min.js`, only after primary content renders and after intersection or explicit user opt-in passes capability, reduced-motion and Save-Data gates.
- Use a route-owned canvas and namespace/debug handle; do not import `web/shared/forest-three.js`.
- Cap device pixel ratio at 1.5 on coarse/mobile input and 1.75 otherwise.
- Pause rendering while the document is hidden and when the canvas is outside its active region.
- Sleep the render loop when transitions settle; wake on selection, filter, resize or visible data change.
- Respect `prefers-reduced-motion`, `?motion=reduce`, WebGL failure and low-capability fallbacks by rendering a static SVG/DOM network or no decorative network.
- Respect `Save-Data` by skipping the Three.js module until the user explicitly requests the ecosystem map.
- Recover from WebGL context loss by falling back to the static DOM/SVG representation; do not loop renderer recreation.
- Dispose geometries, materials, listeners and animation frames on route teardown.

## Forest visual system

- Reuse the Forest's dark ground, warm foreground, muted botanical greens and route accent tokens.
- Use the existing Inter/Space Grotesk stack already present in SD Forest.
- Keep surfaces open and continuous: thin boundaries, restrained blur, low radii, minimal shadow.
- Numeric/chart colors are source- and state-consistent and pass contrast requirements. Color is not the only rank, selection, stale or lifecycle indicator.
- Motion uses transform/opacity for UI transitions, remains brief, and is disabled/reduced according to user preference. Continuous network motion is slow, sparse and bounded by the lifecycle rules above.

## Accessibility

- Semantic headings, landmarks, tables and real links remain useful before JavaScript completes.
- Each visualization has a concise text summary and an accessible table using the same data.
- Matrix cells expose app, model, value, denominator, window and completeness through accessible naming.
- Focus order follows visual reading order; drawers/sheets trap focus only while modal and restore it on close.
- Status does not rely only on color. Icons/text expose mode, freshness and completeness independently.
- Reduced motion, zoom to 200%, high contrast, keyboard-only navigation and screen-reader table traversal are verification requirements.

## Performance budgets

- Initial combined route requests only manifest plus current top-ten model/app/category summaries and the one bounded aggregate matrix response; historical series load on demand.
- Route-local JavaScript and CSS have no framework dependency. Three.js reuses the vendored module.
- Core route JavaScript excluding the separately loaded vendored Three.js module targets less than 100KB gzip.
- Avoid rendering thousands of DOM nodes: virtualize only expanded historical tables, never the initial top tens.
- Limit the Three.js scene to at most 32 visible nodes and 110 verified edges in Release 1; aggregate historical animation rather than instantiating every observation.
- No layout shift from late chart sizing; reserve chart/inspector geometry in CSS.
- Target a responsive 60fps on desktop and 30fps minimum on representative mobile during active motion, then sleep at rest.
- Release targets are LCP below 2.5s, INP below 200ms, CLS below 0.1 and no initial-render long task above 200ms on the agreed representative devices/network profile.
- Automated network assertions prove the Three.js vendor request does not occur in reduced-motion, Save-Data, missing-WebGL or offscreen-without-opt-in cases.

## Failure and honesty behavior

- A failed best-effort app/model collector leaves app rankings visible and marks the matrix `model mix unavailable`.
- A stable source failure may show last-known data only with stale age and last-success time.
- A schema-major mismatch blocks data rendering with a diagnostic link instead of attempting a permissive parse.
- A partial top list shows its true row count and completeness reason; duplicate placeholders are forbidden.
- If fewer than ten GitHub entries pass a category's gates, the category states the eligible population rather than filling with lower-confidence candidates.
- Deprecation dates are labeled `may be removed after`, never an exact shutdown promise.

## Testing and verification

Add route-specific static tests under `scratch/tests/open-overview.test.js` rather than modifying unrelated stale council assertions.

Automated coverage must verify:

- all three routes build into `vercel-public`;
- `git diff --exit-code origin/main -- index.html web/shared/` passes;
- no credential fields or forbidden private keys appear in route assets or fetched fixture data;
- top-ten rendering, partial-list honesty and unknown-versus-zero matrix behavior;
- all eight GitHub categories and all OpenRouter sections are reachable;
- per-dataset mode/freshness/completeness, as-of and watermark labels render for every data region;
- route/query state, keyboard matrix navigation and focus restoration;
- reduced-motion/WebGL failure fallback and render-loop pause behavior;
- API timeout, ETag/304 cache ownership, watermark mismatch/refetch, stale, partial, snapshot, fixture, unavailable and schema-mismatch states;
- fallback generation rejects fixture/mixed-invalid input, preserves live provenance, writes atomically and warns after 48 hours without a live refresh;
- direct refresh and HTTP 200/no asset 404 for all three canonical nested routes;
- desktop 1440x900, portrait 390x844 and landscape 844x390 layouts.

Exact verification commands after implementation are:

```powershell
npm ci
npm run build
node --test scratch/tests/open-overview.test.js
node --test scratch/tests/sdforest-redesign.test.js
npx playwright test scratch/tests/open-overview.browser.spec.js --project=chromium
```

The new Open Overview suite must pass. The inherited SD Forest suite must retain exactly two failures—`public council exposes exactly two truthful modes` and `TinyLM standalone route redirects into Councils`—with no additional failure.

Browser QA covers console/network errors, link destinations, exact API requests, chart/table agreement and touch interaction. Because no visual reference is committed in this repository, executable acceptance uses review screenshots for: desktop combined/live, desktop matrix-unavailable, OpenRouter Free, GitHub category, portrait combined, landscape matrix and reduced-motion fallback. These are reviewed against the approved composition direction rather than treated as pixel-perfect golden images.

The supported build runtime is the repository-declared Node 22.x; a newer local Node warning is not treated as proof of release compatibility.

The two inherited failures in `scratch/tests/sdforest-redesign.test.js` concerning TinyLM naming/routing are recorded as baseline failures from `origin/main`; Open Overview must not broaden scope by silently changing them.

## Preview-first release sequence

1. Implement in the isolated `feat/open-overview-sdforest` worktree from fresh `origin/main`.
2. Verify the direct local route while the homepage remains untouched.
3. Test against the dashboard's preview `/api/public/v2` endpoint and a deliberate unavailable-source scenario.
4. Refresh the production candidate fallback with `node scripts/sync-open-overview-fallback.mjs --api-base $env:OPEN_OVERVIEW_API_BASE --out web/open-overview/fallback-data.json --max-age-hours 48 --require-live`. The artifact contains schema major, dataset watermarks, source as-of/retrieval times, provenance and checksum. Missing/expired/fixture fallback fails production promotion; local development and explicitly labeled preview builds may omit it.
5. Record the current production homepage URL, deployment identity and SHA-256 content hash.
6. Deploy only to a separate preview project or verified non-production target. `--prod` and production alias changes are forbidden in this phase.
7. Verify desktop, portrait and landscape layouts plus the live production homepage separately; confirm its content hash is unchanged after preview deployment.
8. Review API provenance, orthogonal source state and app-model completeness in the rendered preview.
9. Only after direct-route approval, consider a separate homepage portal-card change and preview it independently.
10. Production promotion requires explicit approval, a recorded rollback deployment/alias, and immediate smoke tests of homepage, all three routes, assets, API and fallback.

## Non-goals

- Replacing or refactoring the homepage animation.
- Inventing app/model relationships or cross-source graph edges.
- Embedding the whole Next.js dashboard in an iframe.
- Shipping a large model card as the dominant layout.
- Hiding ranks four through ten to make mobile fit.
- Reading database credentials or private APIs from the browser.
- Treating fixture or stale data as current.
- Applying production database migrations from the SD Forest repository.
