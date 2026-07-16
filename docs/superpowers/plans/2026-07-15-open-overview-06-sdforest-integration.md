# Open Overview 06 SD Forest Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox - [ ] syntax for tracking.

**Goal:** Add three direct, compact Open Overview routes to SD Forest that consume the approved public-v2 API truthfully, expose dense top-ten model/app/repository intelligence plus Plan 04 approved-run history and Plan 05 app-to-model, provider, and free-frontier enrichment, remain useful when gated enrichment is unavailable, preserve the existing homepage byte-for-byte, and ship through an isolated preview before any production promotion.

**Architecture:** Keep the feature inside web/open-overview as framework-free static HTML, CSS, and ES modules. A strict schema module validates public-v2 envelopes; one API client owns timeout, ETag, watermark, and whole-view fallback behavior; semantic DOM/SVG renderers remain authoritative; and a separately loaded Three.js module adds a bounded adjacent relationship view only after capability and user-preference gates pass. Route-specific Node and Playwright tests exercise the same built vercel-public files that Vercel serves.

**Tech Stack:** Node.js 22.x, static HTML5, CSS Grid/Flexbox, browser ES modules, node:test, Playwright via the existing scratch/tests/playwright dependency, vendored Three.js at web/vendor/three/three.module.min.js, Vercel static output.

## Global Constraints

- Ground every implementation decision in SD Forest spec commit 5c276f3a5e72b2b5bc5cdc04431d4ebbc9e4f4f0, upstream archive/API spec commit 8daa26d1a53a2211bd684c287f3ca6388ba2ee6d, and upstream Plans 01–05 commit 16629753dd7d7f1253a572bdcee38e045907eeb2.
- Do not start implementation until Plans 02, 03, 04, and the finalized Plan 05 contracts are reviewed, an approved preview API implements every exact route below, and the upstream seven-complete-daily-cycle parity gate has passed for every stable dataset consumed here. Plan 06 executes after Plan 05 and consumes the reviewed history and gated-enrichment routes without inferring fields or enabling collectors.
- SD Forest consumes public schema major 2 only. A major mismatch blocks data rendering.
- Do not modify root index.html, anything under web/shared, the homepage project count, homepage assembly behavior, or homepage animation timing.
- The implementation diff allow-list is web/open-overview/**, scripts/sync-open-overview-fallback.mjs, scratch/tests/open-overview*, scratch/tests/assert-sdforest-baseline.mjs, and approved documentation.
- The three canonical routes are /web/open-overview/index.html, /web/open-overview/openrouter/index.html, and /web/open-overview/github/index.html.
- Every route-local browser asset URL is root-absolute under /web/open-overview/. Do not rely on clean-URL rewrites.
- Keep the existing static build. npm run build must continue to copy web recursively into vercel-public without modifying build-vercel-static.cjs.
- All public API calls are anonymous GET/OPTIONS with credentials omitted, bounded timeouts, allow-listed paths, strict response validation, and no upstream credentials in browser assets.
- Treat data state as three independent axes: client mode `live|snapshot`, freshness `current|stale`, and completeness `complete|partial|unavailable`. Plans 02 and 03 publish no fixture-mode field, so Plan 06 never infers fixture state from an API response; fixtures remain test-only and cannot enter the generated fallback.
- Never merge live rows with fallback rows. If the live manifest loads, individual dataset failures remain live partial/unavailable states. Use the fallback bundle only when the live manifest itself is unreachable.
- SD Forest is a read-only consumer of the same published Plan 04 v2 surfaces that build the four deterministic agent artifacts. Do not create a browser-side database, duplicate archive, or second ranking pipeline; dashboard rows, history, relationships, providers, and frontier facts keep the same upstream IDs, periods, provenance, and typed availability that agents receive.
- Request the exact Plan 05 10x10 app/model matrix. Render observed cells only from published evidence, render every `state:"unknown"` cell distinctly from an observed zero, and render the typed `status:"unavailable"` reason without removing the stable top-ten model and app rails. The per-app ranking, provider list, and free frontier follow the same gated-enrichment rule: absence or rejection is visible and never synthesized from catalog fields.
- Free-model popularity remains the default ordering from `/free-models`; Pareto membership is a separate, explicitly labeled `benchmarkQuality` x `medianThroughput` view from Plan 05. Never collapse those dimensions into an invented composite efficiency score.
- Keep PostgreSQL bigint identifiers and exact decimals as strings. Never call Number() on identifiers, token totals, or prices.
- Render upstream text with textContent or equivalent safe DOM APIs. Accept only credential-free public HTTP(S) URLs.
- Fine-pointer desktop rows may be 28-36px high. Mobile navigation, segment, disclosure, and opt-in controls require non-overlapping hit regions at least 44px by 44px.
- Semantic tables and SVG carry quantitative truth. The Three.js canvas is adjacent, unfocusable, aria-hidden, and never offers a canvas-only action.
- The main route bundle must not statically import Three.js. The route may dynamically import it only after primary content renders and capability, intersection/opt-in, reduced-motion, and Save-Data gates pass.
- Core route JavaScript excluding the separately loaded Three.js vendor targets less than 100KB gzip. The Three.js scene is capped at 32 visible nodes and 110 verified edges.
- Production promotion requires a live-derived fallback no older than 48 hours. Fixture data can run only on localhost and explicitly allow-listed previews.
- Preserve exactly the two inherited sdforest-redesign.test.js failures named public council exposes exactly two truthful modes and TinyLM standalone route redirects into Councils; no additional baseline failure is allowed.
- Deployment is preview-only until explicit production approval. Do not use --prod and do not change a production alias during implementation.

## Implementation preflight

Run these checks before Task 1. Stop if any command fails.

    git status --short --branch
    git merge-base --is-ancestor 5c276f3a5e72b2b5bc5cdc04431d4ebbc9e4f4f0 HEAD
    git diff --exit-code origin/main -- index.html web/shared/
    if (-not $env:OPEN_OVERVIEW_API_BASE) { throw "OPEN_OVERVIEW_API_BASE is required" }
    $apiBase = ([uri]$env:OPEN_OVERVIEW_API_BASE).GetLeftPart([System.UriPartial]::Authority)
    if (-not $apiBase.StartsWith("https://")) { throw "OPEN_OVERVIEW_API_BASE must be HTTPS" }
    $requiredPaths = @(
      "/api/public/v2/manifest",
      "/api/public/v2/models?limit=10&rank_source=top-weekly",
      "/api/public/v2/apps?limit=10&period=30d&sort=popular",
      "/api/public/v2/free-models?limit=50",
      "/api/public/v2/deprecations?limit=50",
      "/api/public/v2/tasks?limit=50&window=7d",
      "/api/public/v2/benchmarks?limit=50",
      "/api/public/v2/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete",
      "/api/public/v2/history?window=90d&limit=10",
      "/api/public/v2/github/rankings?category=mcp&entity_level=project-family&limit=10&metric=adoption"
    )
    foreach ($path in $requiredPaths) {
      $probe = Invoke-WebRequest -Method Get -Uri ($apiBase + $path) -Headers @{ Accept = "application/json" } -UseBasicParsing
      if ($probe.StatusCode -ne 200) { throw "$path is not available from the approved preview API" }
      $body = $probe.Content | ConvertFrom-Json
      if ($body.schemaVersion -ne "2.0") { throw "$path does not implement schema 2.0" }
    }
    $gatedPaths = @(
      "/api/public/v2/providers?limit=100",
      "/api/public/v2/free-frontiers?x=benchmarkQuality&y=medianThroughput&limit=200"
    )
    foreach ($path in $gatedPaths) {
      $probe = Invoke-WebRequest -Method Get -Uri ($apiBase + $path) -Headers @{ Accept = "application/json" } -UseBasicParsing -SkipHttpErrorCheck
      if ($probe.StatusCode -notin @(200, 503)) { throw "$path returned neither a collection nor typed source-unavailable" }
      $body = $probe.Content | ConvertFrom-Json
      if ($body.schemaVersion -ne "2.0") { throw "$path does not implement schema 2.0" }
      if ($probe.StatusCode -eq 503 -and ($body.error.code -ne "SOURCE_UNAVAILABLE" -or $body.error.retryable -ne $true)) { throw "$path does not return the reviewed typed source-unavailable error" }
    }
    $matrixPath = "/api/public/v2/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete"
    $matrixBody = (Invoke-WebRequest -Method Get -Uri ($apiBase + $matrixPath) -Headers @{ Accept = "application/json" } -UseBasicParsing).Content | ConvertFrom-Json
    if ($matrixBody.status -notin @("available", "unavailable")) { throw "$matrixPath does not implement the Plan 05 status discriminator" }
    $historyPath = "/api/public/v2/history?window=90d&limit=10"
    $historyBody = (Invoke-WebRequest -Method Get -Uri ($apiBase + $historyPath) -Headers @{ Accept = "application/json" } -UseBasicParsing).Content | ConvertFrom-Json
    if ($historyBody.status -notin @("available", "unavailable") -or ($historyBody.status -eq "unavailable" -and $historyBody.reason -ne "insufficient_history")) { throw "$historyPath does not implement the Plan 04 history discriminator" }
    $appsPath = "/api/public/v2/apps?limit=10&period=30d&sort=popular"
    $appsBody = (Invoke-WebRequest -Method Get -Uri ($apiBase + $appsPath) -Headers @{ Accept = "application/json" } -UseBasicParsing).Content | ConvertFrom-Json
    $firstAppId = [string]($appsBody.data | Select-Object -First 1).appId
    if ($firstAppId -notmatch '^\d+$') { throw "$appsPath returned no decimal top-app ID for the Plan 05 per-app probe" }
    $appModelsPath = "/api/public/v2/apps/$([uri]::EscapeDataString($firstAppId))/models?limit=100"
    $appModelsBody = (Invoke-WebRequest -Method Get -Uri ($apiBase + $appModelsPath) -Headers @{ Accept = "application/json" } -UseBasicParsing).Content | ConvertFrom-Json
    if ($appModelsBody.schemaVersion -ne "2.0" -or $appModelsBody.status -notin @("available", "unavailable")) { throw "$appModelsPath does not implement the Plan 05 per-app contract" }
    $previewOrigin = "http://127.0.0.1:4173"
    $corsGet = Invoke-WebRequest -Method Get -Uri "$apiBase/api/public/v2/manifest" -Headers @{
      Origin = $previewOrigin
      Accept = "application/json"
    } -UseBasicParsing
    if ($corsGet.Headers["Access-Control-Allow-Origin"] -ne $previewOrigin) {
      throw "Public-v2 CORS does not allow the local preview origin"
    }

Expected:

- HEAD contains 5c276f3.
- No diff appears for index.html or web/shared/.
- OPEN_OVERVIEW_API_BASE is an HTTPS origin.
- Every stable Plan 02/03 route plus Plan 04 history, Plan 05 matrix, and dynamic first-top-app query returns HTTP 200 with `schemaVersion: "2.0"` and its reviewed discriminator. Provider and free-frontier probes return either a strict collection or the strict retryable `SOURCE_UNAVAILABLE` HTTP 503 error when enrichment is gated. History uses only `/history?window=90d&limit=10` and renders `insufficient_history` as data; no alternate history or OpenAPI route is assumed.
- The local preview origin receives `Access-Control-Allow-Origin`. Plan 02 does not yet expose `ETag` or allow cross-origin `If-None-Match`, so `conditionalRequests` remains false and the browser never triggers that unsupported preflight.

## File map

### Production files

- Create web/open-overview/package.json — marks only this route subtree as ES modules for browser and Node contract tests.
- Create web/open-overview/config.json — pins schema major 2, the approved API origin, timeout, fallback URL, and Three.js feature gate.
- Create web/open-overview/index.html — combined model/matrix/app and GitHub overview shell.
- Create web/open-overview/openrouter/index.html — dedicated OpenRouter shell.
- Create web/open-overview/github/index.html — dedicated GitHub shell.
- Create web/open-overview/open-overview.css — all route-local layout, responsive, state, table, matrix, chart, and Three.js-panel styles.
- Create web/open-overview/open-overview-schema.js — separate strict Plan 02/03 validators plus exact Plan 04 history and Plan 05 matrix, per-app, provider, and free-frontier validators, published-run comparison, safe numeric formatting, public URL validation, canonical JSON, and checksum helpers.
- Create web/open-overview/open-overview-api.js — supported endpoint registry, bounded fetch, ETag cache, published-run retry, availability-only whole-view fallback, and query canonicalization.
- Create web/open-overview/open-overview-charts.js — safe semantic table, bar, sparkline, source-state, and unavailable-state renderers.
- Create web/open-overview/open-overview.js — route controller, URL state, source rail, combined route, dedicated routes, and lazy Three.js coordinator.
- Create web/open-overview/open-overview-three.js — deterministic, bounded, disposable adjacent relationship scene.
- Create web/open-overview/README.md — contract, fallback, local QA, and release commands.
- Generate web/open-overview/fallback-data.json — validated live public snapshot; never hand-edit and never generate from test fixtures.
- Create scripts/sync-open-overview-fallback.mjs — validates live responses, checks age/watermarks, hashes canonical bytes, and replaces the fallback file.

### Test files

- Create scratch/tests/open-overview.test.js — static route, pure module, exact schema, API, fallback, numeric, and source-boundary tests.
- Create scratch/tests/open-overview-static-server.mjs — dependency-free server for built static assets.
- Create scratch/tests/open-overview.playwright.config.js — Chromium project and built-site web server.
- Create scratch/tests/open-overview.browser.spec.js — API-routed desktop/mobile/accessibility/Three.js browser checks and review screenshots.
- Create scratch/tests/assert-sdforest-baseline.mjs — converts the two known inherited failures into a deterministic pass/fail guard.

---

### Task 1: Route boundary, canonical HTML shells, and immutable-home guard

**Files:**

- Create: web/open-overview/package.json
- Create: web/open-overview/config.json
- Create: web/open-overview/index.html
- Create: web/open-overview/openrouter/index.html
- Create: web/open-overview/github/index.html
- Create: web/open-overview/open-overview.css
- Create: web/open-overview/open-overview.js
- Create: web/open-overview/README.md
- Create: scratch/tests/open-overview.test.js

**Interfaces:**

- Consumes: OPEN_OVERVIEW_API_BASE from the implementation preflight.
- Produces: body[data-open-overview-route], #oo-source-status, #oo-source-panel, #oo-view-root, #oo-inspector, and #oo-network-region on every route; a valid config.json with schemaMajor, apiBase, timeoutMs, fallbackUrl, conditionalRequests, and threeEnabled.

- [ ] **Step 1: Write the failing static-boundary tests**

Create scratch/tests/open-overview.test.js with this initial content:

    const test = require("node:test");
    const assert = require("node:assert/strict");
    const fs = require("node:fs");
    const path = require("node:path");
    const { spawnSync } = require("node:child_process");
    const { pathToFileURL } = require("node:url");

    const ROOT = path.resolve(__dirname, "../..");
    const routePath = (...parts) => path.join(ROOT, "web", "open-overview", ...parts);
    const read = (...parts) => fs.readFileSync(routePath(...parts), "utf8");
    const importRouteModule = (name) =>
      import(pathToFileURL(routePath(name)).href + "?test=" + Date.now());

    test("three canonical static routes use route-local absolute assets", () => {
      const routes = [
        ["index.html", "overview"],
        ["openrouter/index.html", "openrouter"],
        ["github/index.html", "github"],
      ];

      for (const [relative, route] of routes) {
        const html = read(...relative.split("/"));
        assert.match(html, new RegExp('data-open-overview-route="' + route + '"'));
        assert.match(html, /href="\/web\/open-overview\/open-overview\.css"/);
        assert.match(html, /src="\/web\/open-overview\/open-overview\.js"/);
        assert.match(html, /id="oo-source-status"/);
        assert.match(html, /id="oo-view-root"/);
        assert.doesNotMatch(html, /web\/shared\/forest-three\.js/);
      }
    });

    test("navigation is real and canonical on every route", () => {
      for (const relative of ["index.html", "openrouter/index.html", "github/index.html"]) {
        const html = read(...relative.split("/"));
        assert.match(html, /href="\/web\/open-overview\/index\.html"/);
        assert.match(html, /href="\/web\/open-overview\/openrouter\/index\.html"/);
        assert.match(html, /href="\/web\/open-overview\/github\/index\.html"/);
      }
    });

    test("route config pins schema 2 and a credential-free HTTPS API origin", () => {
      const config = JSON.parse(read("config.json"));
      const url = new URL(config.apiBase);
      assert.equal(config.schemaMajor, "2");
      assert.equal(url.protocol, "https:");
      assert.equal(url.username, "");
      assert.equal(url.password, "");
      assert.equal(config.timeoutMs, 8000);
      assert.equal(config.fallbackUrl, "/web/open-overview/fallback-data.json");
      assert.equal(config.conditionalRequests, false);
      assert.equal(config.threeEnabled, true);
    });

    test("homepage and shared files remain identical to origin/main", () => {
      const result = spawnSync(
        "git",
        ["diff", "--exit-code", "origin/main", "--", "index.html", "web/shared/"],
        { cwd: ROOT, encoding: "utf8" },
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
    });

- [ ] **Step 2: Run the static test and verify it fails**

Run:

    node --test scratch/tests/open-overview.test.js

Expected: FAIL with ENOENT for web/open-overview/index.html.

- [ ] **Step 3: Create the route-local module marker and approved config**

Create web/open-overview/package.json:

    {
      "private": true,
      "type": "module"
    }

Generate web/open-overview/config.json from the already verified environment input:

    @'
    import { mkdir, writeFile } from "node:fs/promises";

    const raw = process.env.OPEN_OVERVIEW_API_BASE;
    if (!raw) throw new Error("OPEN_OVERVIEW_API_BASE is required");
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("API base must be a credential-free HTTPS URL");
    }

    const config = {
      schemaMajor: "2",
      apiBase: url.origin,
      timeoutMs: 8000,
      fallbackUrl: "/web/open-overview/fallback-data.json",
      conditionalRequests: false,
      threeEnabled: true
    };

    await mkdir("web/open-overview", { recursive: true });
    await writeFile(
      "web/open-overview/config.json",
      JSON.stringify(config, null, 2) + "\n",
      "utf8"
    );
    '@ | node --input-type=module -

Expected: config.json contains the exact approved origin and no credentials or path.

- [ ] **Step 4: Create the three semantic HTML shells**

Create web/open-overview/index.html:

    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="description" content="Open Overview: source-backed model, app, and GitHub ecosystem intelligence inside SD Forest.">
      <meta name="theme-color" content="#050806">
      <title>Open Overview — SD Forest</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="/web/shared/forest-shell.css?v=20260714">
      <link rel="stylesheet" href="/web/open-overview/open-overview.css">
    </head>
    <body data-forest-page="open-overview" data-open-overview-route="overview">
      <nav class="oo-topbar" aria-label="Open Overview navigation">
        <a class="forest-back" href="/">SD Forest</a>
        <div class="oo-destinations">
          <a aria-current="page" href="/web/open-overview/index.html">Overview</a>
          <a href="/web/open-overview/openrouter/index.html">OpenRouter</a>
          <a href="/web/open-overview/github/index.html">GitHub</a>
        </div>
        <button id="oo-source-status" class="oo-source-toggle" type="button" aria-expanded="false" aria-controls="oo-source-panel">Sources · loading</button>
      </nav>
      <main class="oo-page" id="oo-main">
        <header class="oo-header">
          <p class="forest-kicker">Published evidence · bounded public API</p>
          <h1>Open Overview</h1>
          <p>Model usage, public app activity, and verified GitHub ecosystems in one compact field.</p>
        </header>
        <section id="oo-source-panel" class="oo-source-panel" aria-label="Source status" hidden></section>
        <section id="oo-view-root" class="oo-view-root" aria-live="polite" aria-busy="true">
          <p class="oo-loading">Loading validated public data…</p>
        </section>
        <aside id="oo-inspector" class="oo-inspector" tabindex="-1" hidden aria-label="Selected item details"></aside>
        <section id="oo-network-region" class="oo-network-region" aria-label="Observed relationship map"></section>
        <noscript><p class="oo-unavailable">JavaScript is required for the data views. The three destinations above remain direct links.</p></noscript>
      </main>
      <script type="module" src="/web/open-overview/open-overview.js"></script>
    </body>
    </html>

Create web/open-overview/openrouter/index.html:

    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="description" content="OpenRouter ranked models, apps, free models, lifecycle, sampled tasks, and source-separated benchmarks.">
      <meta name="theme-color" content="#050806">
      <title>OpenRouter — Open Overview</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="/web/shared/forest-shell.css?v=20260714">
      <link rel="stylesheet" href="/web/open-overview/open-overview.css">
    </head>
    <body data-forest-page="open-overview" data-open-overview-route="openrouter">
      <nav class="oo-topbar" aria-label="Open Overview navigation">
        <a class="forest-back" href="/">SD Forest</a>
        <div class="oo-destinations">
          <a href="/web/open-overview/index.html">Overview</a>
          <a aria-current="page" href="/web/open-overview/openrouter/index.html">OpenRouter</a>
          <a href="/web/open-overview/github/index.html">GitHub</a>
        </div>
        <button id="oo-source-status" class="oo-source-toggle" type="button" aria-expanded="false" aria-controls="oo-source-panel">Sources · loading</button>
      </nav>
      <main class="oo-page" id="oo-main">
        <header class="oo-header">
          <p class="forest-kicker">Models · apps · lifecycle evidence</p>
          <h1>OpenRouter</h1>
          <p>Current ranked evidence with explicit windows, source modes, and completeness.</p>
        </header>
        <section id="oo-source-panel" class="oo-source-panel" aria-label="Source status" hidden></section>
        <section id="oo-view-root" class="oo-view-root" aria-live="polite" aria-busy="true">
          <p class="oo-loading">Loading validated public data…</p>
        </section>
        <aside id="oo-inspector" class="oo-inspector" tabindex="-1" hidden aria-label="Selected item details"></aside>
        <section id="oo-network-region" class="oo-network-region" aria-label="Observed relationship map"></section>
        <noscript><p class="oo-unavailable">JavaScript is required for the data views. The three destinations above remain direct links.</p></noscript>
      </main>
      <script type="module" src="/web/open-overview/open-overview.js"></script>
    </body>
    </html>

Create web/open-overview/github/index.html:

    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="description" content="Versioned GitHub AI ecosystem category rankings with source, lifecycle, and coverage evidence.">
      <meta name="theme-color" content="#050806">
      <title>GitHub — Open Overview</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="/web/shared/forest-shell.css?v=20260714">
      <link rel="stylesheet" href="/web/open-overview/open-overview.css">
    </head>
    <body data-forest-page="open-overview" data-open-overview-route="github">
      <nav class="oo-topbar" aria-label="Open Overview navigation">
        <a class="forest-back" href="/">SD Forest</a>
        <div class="oo-destinations">
          <a href="/web/open-overview/index.html">Overview</a>
          <a href="/web/open-overview/openrouter/index.html">OpenRouter</a>
          <a aria-current="page" href="/web/open-overview/github/index.html">GitHub</a>
        </div>
        <button id="oo-source-status" class="oo-source-toggle" type="button" aria-expanded="false" aria-controls="oo-source-panel">Sources · loading</button>
      </nav>
      <main class="oo-page" id="oo-main">
        <header class="oo-header">
          <p class="forest-kicker">Eight categories · reproducible rankings</p>
          <h1>GitHub ecosystems</h1>
          <p>Adoption, momentum, and maintenance without blending incompatible evidence.</p>
        </header>
        <section id="oo-source-panel" class="oo-source-panel" aria-label="Source status" hidden></section>
        <section id="oo-view-root" class="oo-view-root" aria-live="polite" aria-busy="true">
          <p class="oo-loading">Loading validated public data…</p>
        </section>
        <aside id="oo-inspector" class="oo-inspector" tabindex="-1" hidden aria-label="Selected item details"></aside>
        <section id="oo-network-region" class="oo-network-region" aria-label="Observed relationship map"></section>
        <noscript><p class="oo-unavailable">JavaScript is required for the data views. The three destinations above remain direct links.</p></noscript>
      </main>
      <script type="module" src="/web/open-overview/open-overview.js"></script>
    </body>
    </html>

- [ ] **Step 5: Add the route foundation CSS and safe initial bootstrap**

Create web/open-overview/open-overview.css:

    :root {
      --oo-accent: #79f2a8;
      --oo-cyan: #73e9ff;
      --oo-warn: #ffc66d;
      --oo-danger: #ff8c8c;
      --oo-cell: 44px;
    }

    body[data-open-overview-route] {
      background:
        radial-gradient(circle at 18% -10%, rgba(121, 242, 168, .1), transparent 30rem),
        radial-gradient(circle at 92% 18%, rgba(115, 233, 255, .08), transparent 34rem),
        var(--forest-bg);
    }

    .oo-topbar {
      position: sticky;
      z-index: 40;
      top: 0;
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 16px;
      min-height: 72px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--forest-line);
      background: rgba(5, 8, 6, .9);
      backdrop-filter: blur(18px);
    }

    .oo-topbar .forest-back {
      position: static;
    }

    .oo-destinations {
      display: flex;
      justify-content: center;
      gap: 8px;
    }

    .oo-destinations a,
    .oo-source-toggle {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 14px;
      border: 1px solid var(--forest-line);
      border-radius: 999px;
      background: rgba(255, 255, 255, .025);
      color: var(--forest-soft);
      font: 700 10px/1 var(--forest-body);
      letter-spacing: .1em;
      text-decoration: none;
      text-transform: uppercase;
    }

    .oo-destinations a[aria-current="page"] {
      border-color: rgba(121, 242, 168, .48);
      color: var(--forest-ink);
      background: rgba(121, 242, 168, .1);
    }

    .oo-source-toggle {
      cursor: pointer;
    }

    .oo-page {
      width: min(1440px, calc(100% - 32px));
      margin: 0 auto;
      padding: 38px 0 80px;
    }

    .oo-header h1 {
      margin: 0;
      font: 700 clamp(42px, 7vw, 86px)/.92 var(--forest-display);
      letter-spacing: -.06em;
    }

    .oo-header > p:last-child {
      max-width: 720px;
      margin: 18px 0 0;
      color: var(--forest-soft);
      font-size: 16px;
      line-height: 1.6;
    }

    .oo-source-panel,
    .oo-view-root,
    .oo-inspector,
    .oo-network-region {
      margin-top: 22px;
      border: 1px solid var(--forest-line);
      background: rgba(8, 15, 12, .74);
    }

    .oo-source-panel,
    .oo-inspector {
      padding: 18px;
    }

    .oo-view-root {
      min-height: 420px;
    }

    .oo-loading,
    .oo-unavailable {
      margin: 0;
      padding: 28px;
      color: var(--forest-muted);
      line-height: 1.6;
    }

    @media (max-width: 760px) {
      .oo-topbar {
        grid-template-columns: 1fr auto;
      }

      .oo-topbar .forest-back {
        justify-self: start;
      }

      .oo-destinations {
        grid-column: 1 / -1;
        grid-row: 2;
        overflow-x: auto;
        justify-content: flex-start;
      }

      .oo-source-toggle {
        justify-self: end;
      }

      .oo-page {
        width: min(100% - 20px, 1440px);
        padding-top: 26px;
      }
    }

Create web/open-overview/open-overview.js:

    const root = document.getElementById("oo-view-root");
    const sourceToggle = document.getElementById("oo-source-status");
    const sourcePanel = document.getElementById("oo-source-panel");

    sourceToggle.addEventListener("click", () => {
      const expanded = sourceToggle.getAttribute("aria-expanded") === "true";
      sourceToggle.setAttribute("aria-expanded", String(!expanded));
      sourcePanel.hidden = expanded;
    });

    root.dataset.bootstrap = "ready";

- [ ] **Step 6: Add the route README**

Create web/open-overview/README.md:

    # Open Overview in SD Forest

    This directory is a route-local static consumer of the public Open Overview v2 API.

    - Schema major: 2
    - API origin: web/open-overview/config.json
    - Canonical routes: overview, OpenRouter, and GitHub index.html files
    - Credentials: none in the browser
    - Quantitative authority: semantic tables and SVG
    - Three.js: optional adjacent enhancement loaded after capability gates
    - Fallback: generated only by scripts/sync-open-overview-fallback.mjs from validated live data

    Local verification:

        npm run build
        node --test scratch/tests/open-overview.test.js
        Push-Location scratch/tests
        npm ci
        npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium
        Pop-Location

    Production promotion requires a fallback no older than 48 hours, explicit approval, a recorded rollback deployment, and unchanged homepage bytes.

- [ ] **Step 7: Run the static tests and verify they pass**

Run:

    node --test scratch/tests/open-overview.test.js

Expected: 4 tests pass, 0 fail.

- [ ] **Step 8: Commit the foundation**

Run:

    git add web/open-overview/package.json web/open-overview/config.json web/open-overview/index.html web/open-overview/openrouter/index.html web/open-overview/github/index.html web/open-overview/open-overview.css web/open-overview/open-overview.js web/open-overview/README.md scratch/tests/open-overview.test.js
    git commit -m "feat(open-overview): add isolated static route shells"

Expected: one commit; git diff origin/main -- index.html web/shared/ remains empty.

### Task 2: Exact Plan 02/03/04/05 validators, precision, and public-URL boundary

**Files:**

- Create: web/open-overview/open-overview-schema.js
- Modify: scratch/tests/open-overview.test.js

**Interfaces:**

- Consumes only the exact Plan 02 OpenRouter collection/manifest shapes, exact Plan 03 GitHub ranking shape, finalized Plan 04 `publicOverviewHistoryResponseSchema`, and finalized Plan 05 `publicAppModelMatrixResponseSchema`, `publicAppModelsResponseSchema`, `providerListResponseSchema`, and `freeFrontierResponseSchema` shapes.
- Produces `ContractError`, `validatePublicError(raw, expectedMajor)`, `validateOpenRouterCollection(raw, kind, expectedMajor)`, `validateHistory(raw, expectedMajor)`, `validateAppModelMatrix(raw, expectedMajor)`, `validateAppModels(raw, expectedMajor)`, `validateProviders(raw, expectedMajor)`, `validateFreeFrontiers(raw, expectedMajor)`, `validateManifest(raw, expectedMajor)`, `validateGitHubRanking(raw, expectedMajor)`, `assertPublishedRun(manifest, sourceId, response)`, `compactIntegerString`, `exactDecimalString`, `safePublicUrl`, `canonicalJson`, and `sha256Hex`.
- Every fixed object rejects unknown keys. Exact integer/decimal fields remain strings. No generic catch-all envelope exists.

- [ ] **Step 1: Append failing exact-contract tests**

Append these local contract fixtures to scratch/tests/open-overview.test.js before the tests (the browser suite repeats the same literal shapes because CommonJS test files do not share globals):

    const RUNS = Object.freeze({
      models_current: "11111111-1111-4111-8111-111111111111",
      apps_ranked: "33333333-3333-4333-8333-333333333333"
    });
    const sourceStatus = (sourceId) => ({
      sourceId, sourceTier: "stable", cadenceSeconds: 86400, staleAfterSeconds: 172800,
      publishedRunId: RUNS[sourceId], publishedAt: "2026-07-15T00:00:00.000Z", nextScheduledAt: "2026-07-16T00:00:00.000Z",
      stale: false, transformVersion: "or-source-v1", citationUrl: "https://openrouter.ai/",
      lastAttemptRunId: RUNS[sourceId], lastAttemptStatus: "published", lastAttemptStartedAt: "2026-07-15T00:00:00.000Z",
      lastAttemptFinishedAt: "2026-07-15T00:00:00.000Z", lastAttemptErrorCode: null,
      lastAttemptAcquisitionComplete: true, lastAttemptPopulationCompleteness: "full"
    });
    const openRouterManifest = () => ({
      schemaVersion: "2.0", publishedAt: "2026-07-15T00:00:00.000Z",
      routes: ["/api/public/v2/manifest", "/api/public/v2/models"],
      sources: [sourceStatus("models_current"), sourceStatus("apps_ranked")], provenance: [],
      window: { start: null, end: null, timezone: "unknown", inclusive: null, basis: "unknown" }
    });
    const openRouterEnvelope = (_kind, data) => ({
      schemaVersion: "2.0", data, cursor: null,
      window: { start: "2026-07-14", end: "2026-07-14", timezone: "UTC", inclusive: true, basis: "source_meta" },
      completeness: { acquisitionComplete: true, populationCompleteness: "full", missingFields: [] },
      stale: false,
      rank: { metric: "weekly_popularity", unit: "response_order", direction: "asc", rankMethod: "response_order", baseline: null, eligiblePopulation: "10", ruleVersion: "or-models-weekly-v1", taxonomyVersion: null },
      provenance: [{ sourceId: "models_current", sourceTier: "stable", runId: RUNS.models_current, fetchedAt: "2026-07-15T00:00:00.000Z", sourceAsOf: "2026-07-14T00:00:00.000Z", transformVersion: "or-models-current-v1", citation: "Source: OpenRouter" }]
    });
    const githubRankingEnvelope = () => ({
      schemaVersion: "2.0", watermark: "77777777-7777-4777-8777-777777777777",
      coverage: { resolvedAsOf: "2026-07-15", acquisitionComplete: true, populationCompleteness: "full" },
      ranking: { metric: "adoption", rankMethod: "locally_calculated", ruleVersion: "github-adoption-v1", taxonomyVersion: "github-ai-v1", category: "mcp", entityLevel: "project-family", eligiblePopulation: 1, windowDays: null },
      data: [{ repositoryId: "9007199254740993", fullName: "owner/repo", stars: "1200", forks: "90", rank: 1, score: "0.875" }],
      page: { limit: 1, nextCursor: null },
      provenance: [{ id: "snapshot-run", sourceUrl: "https://api.github.com/", fetchedAt: "2026-07-15T00:00:00Z" }]
    });

Then append the tests:

    test("exact validators accept Plan 02/03 and reject invented or unknown fields", async () => {
      const {
        ContractError,
        validateOpenRouterCollection,
        validateGitHubRanking
      } = await importRouteModule("open-overview-schema.js");
      const models = openRouterEnvelope("models", [{
        id: "vendor/model:free", canonicalSlug: "vendor/model", name: "Model",
        description: null, contentTrust: "untrusted-source", createdUnix: "1752451200",
        contextLength: "131072", architecture: {}, pricing: { prompt: "0", completion: "0" },
        supportedParameters: ["tools"], expirationDate: null,
        lifecycleState: "no_announced_expiration", freeKind: "concrete_free",
        weeklyRank: 1, rankMethod: "response_order"
      }]);
      assert.equal(validateOpenRouterCollection(models, "models", "2").data[0].weeklyRank, 1);
      assert.throws(
        () => validateOpenRouterCollection({ ...models, mode: "live" }, "models", "2"),
        (error) => error instanceof ContractError && error.code === "unknown_field"
      );
      assert.equal(validateGitHubRanking(githubRankingEnvelope(), "2").ranking.metric, "adoption");
      assert.throws(
        () => validateGitHubRanking({ ...githubRankingEnvelope(), staleness: {} }, "2"),
        (error) => error.code === "unknown_field"
      );
    });

    test("manifest uses Plan 02 sources and published run IDs", async () => {
      const { validateManifest, assertPublishedRun } =
        await importRouteModule("open-overview-schema.js");
      const manifest = validateManifest(openRouterManifest(), "2");
      assert.equal(manifest.sourceIndex.models_current.publishedRunId, RUNS.models_current);
      assert.doesNotThrow(() => assertPublishedRun(
        manifest,
        "models_current",
        openRouterEnvelope("models", [])
      ));
      const mismatched = openRouterEnvelope("models", []);
      mismatched.provenance[0].runId = RUNS.apps_ranked;
      assert.throws(() => assertPublishedRun(manifest, "models_current", mismatched), /published run/i);
    });

    test("formatters do not round exact strings", async () => {
      const { compactIntegerString, exactDecimalString } =
        await importRouteModule("open-overview-schema.js");
      assert.equal(compactIntegerString("90071992547409931234"), "90.0Q");
      assert.equal(exactDecimalString("0.000000123400"), "0.000000123400");
      assert.throws(() => compactIntegerString("1.2"), /integer string/);
    });

    test("public URL validation rejects credentials, private networks, and non-http schemes", async () => {
      const { safePublicUrl } = await importRouteModule("open-overview-schema.js");
      assert.equal(safePublicUrl("https://github.com/openai/openai-node").hostname, "github.com");
      for (const value of [
        "https://user:pass@example.com", "javascript:alert(1)", "http://127.0.0.1/x",
        "http://10.1.2.3/x", "http://169.254.1.1/x", "http://[::1]/x", "http://localhost/x"
      ]) assert.equal(safePublicUrl(value), null, value);
    });

    test("Plan 05 app-model validators preserve observed zero, unknown, and typed unavailable states", async () => {
      const { validateAppModelMatrix, validateAppModels } =
        await importRouteModule("open-overview-schema.js");
      const period = { start: "2026-07-14", end: "2026-07-14", unit: "day", inclusive: true };
      const provenance = [{ sourceId: "openrouter.app-models.1000", sourceTier: "best_effort", runId: RUNS.apps_ranked, fetchedAt: "2026-07-15T00:00:00Z", sourceAsOf: "2026-07-14T00:00:00Z", transformVersion: "openrouter-app-model-daily-v1", citation: "Source: OpenRouter app page" }];
      const matrix = validateAppModelMatrix({
        schemaVersion: "2.0", status: "available", watermark: "matrix:2026-07-14",
        resolvedPeriod: period, appIds: ["1000"], modelIds: ["vendor/model-1"],
        cells: [
          { state: "observed", appId: "1000", modelId: "vendor/model-1", totalTokens: "0", rankWithinPeriod: 1, period, metricSemantics: "observed_daily_total_tokens", evidenceUrl: "https://openrouter.ai/apps/1000" }
        ],
        missingAliases: [], coverage: { observedCells: 1, possibleCells: 1, populationCompleteness: "partial_or_unknown" }, provenance
      }, "2");
      assert.equal(matrix.cells[0].state, "observed");
      assert.equal(matrix.cells[0].totalTokens, "0");
      assert.equal(validateAppModelMatrix({ schemaVersion: "2.0", status: "unavailable", reason: "collection_disabled", lastSuccessAt: null, appIds: ["1000"], modelIds: ["vendor/model-1"], cells: [] }, "2").status, "unavailable");
      assert.equal(validateAppModels({ schemaVersion: "2.0", status: "unavailable", reason: "unmapped_alias", lastSuccessAt: null, appId: "1000", data: [], cursor: null }, "2").reason, "unmapped_alias");
    });

    test("Plan 05 provider and free-frontier validators reject invented efficiency fields", async () => {
      const { validateProviders, validateFreeFrontiers, validatePublicError } =
        await importRouteModule("open-overview-schema.js");
      const providers = openRouterEnvelope("providers", [{
        modelId: "vendor/model-1", provider: "Provider", endpoint: "provider/model-1", quantization: null,
        contextLength: "131072", promptPrice: "0.000001", completionPrice: "0.000003",
        uptime: "99.9", latency: "310.5", throughput: "42.75", status: "online",
        sourceUrl: "https://openrouter.ai/models/vendor/model-1/providers", fetchedAt: "2026-07-15T00:00:00Z"
      }]);
      assert.equal(validateProviders(providers, "2").data[0].throughput, "42.75");
      const frontier = openRouterEnvelope("freeFrontiers", [{
        ruleVersion: "openrouter-free-pareto-v1",
        dimensions: { x: "benchmarkQuality", y: "medianThroughput", xDirection: "max", yDirection: "max" },
        members: [{ modelId: "vendor/model-1:free", x: "71.2", y: "42.75" }], excluded: []
      }]);
      assert.equal(validateFreeFrontiers(frontier, "2").data[0].members[0].modelId, "vendor/model-1:free");
      assert.throws(() => validateFreeFrontiers({ ...frontier, efficiencyScore: "0.91" }, "2"), /schema|field/i);
      assert.equal(validatePublicError({ schemaVersion: "2.0", error: { code: "SOURCE_UNAVAILABLE", message: "Source data is unavailable", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: true } }, "2").error.retryable, true);
    });

    test("Plan 04 history validator preserves complete buckets and typed insufficiency", async () => {
      const { validateHistory } = await importRouteModule("open-overview-schema.js");
      assert.equal(validateHistory({ schemaVersion: "2.0", status: "unavailable", reason: "insufficient_history", lastSuccessAt: null }, "2").reason, "insufficient_history");
      const response = validateHistory({ schemaVersion: "2.0", status: "available", data: {
        modelUsage: [{ date: "2026-07-14", complete: true, rows: [{ id: "model:1", label: "Model 1", scope: null, rank: 1, value: "9007199254740993", remainder: "10", stars: null, forks: null }] }],
        appRanks: [], githubRanks: []
      }, window: { start: "2026-04-16", end: "2026-07-14", timezone: "UTC", inclusive: true, basis: "query" }, completeness: { acquisitionComplete: true, populationCompleteness: "full", missingFields: [] }, stale: false, rank: null, provenance: [] }, "2");
      assert.equal(response.data.modelUsage[0].rows[0].value, "9007199254740993");
    });

- [ ] **Step 2: Run the contract tests and verify RED**

Run:

    node --test --test-name-pattern="exact validators|manifest uses|formatters|public URL|Plan 04|Plan 05" scratch/tests/open-overview.test.js

Expected: FAIL because the exact validator module does not exist.

- [ ] **Step 3: Implement the exact validator module**

Create web/open-overview/open-overview-schema.js. Implement these foundations exactly; all row validators use the same `strictRecord` helper and Plan 02/03 key sets:

    const POPULATION = new Set(["full", "requested_slice", "top_n_plus_other", "partial_or_unknown"]);
    const WINDOW_BASIS = new Set(["source_meta", "query", "derived", "observed", "unknown"]);
    const SOURCE_TIERS = new Set(["stable", "supported", "best_effort"]);
    const RANK_METHODS = new Set(["source_published", "response_order", "locally_calculated"]);
    const LIFECYCLE = new Set([
      "expiration_unknown", "no_announced_expiration", "scheduled_deprecation",
      "past_expiration_still_listed", "absent_from_catalog", "removed_or_unavailable"
    ]);
    const GITHUB_METRICS = new Set(["adoption", "momentum", "maintenance"]);
    const GITHUB_CATEGORIES = new Set(["ai-harnesses", "inference", "ai-skills", "mcp", "connectors", "a2a", "agent-frameworks", "ai-orchestration"]);
    const GITHUB_WINDOWS = new Set([7, 30, 90]);
    const INTEGER = /^(0|[1-9]\d*)$/;
    const DECIMAL = /^(0|[1-9]\d*)(\.\d+)?$/;
    const SIGNED_DECIMAL = /^-?(0|[1-9]\d*)(\.\d+)?$/;
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

    export class ContractError extends Error {
      constructor(code, message, details = null) {
        super(message);
        this.name = "ContractError";
        this.code = code;
        this.details = details;
      }
    }

    const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
    const fail = (code, message, details = null) => { throw new ContractError(code, message, details); };
    const strictRecord = (value, keys, name) => {
      if (!isRecord(value)) fail("invalid_contract", name + " must be an object");
      const allowed = new Set(keys);
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) fail("unknown_field", name + "." + key + " is not in schema 2.0");
      }
      for (const key of keys) {
        if (!Object.hasOwn(value, key)) fail("missing_field", name + "." + key + " is required");
      }
      return value;
    };
    const string = (value, name) => {
      if (typeof value !== "string") fail("invalid_contract", name + " must be a string");
      return value;
    };
    const nullableString = (value, name) => value === null ? null : string(value, name);
    const uuid = (value, name) => { if (typeof value !== "string" || !UUID.test(value)) fail("invalid_contract", name + " must be a UUID"); return value; };
    const date = (value, name) => { if (typeof value !== "string" || !ISO_DATE.test(value) || !Number.isFinite(Date.parse(value + "T00:00:00Z"))) fail("invalid_contract", name + " must be an ISO date"); return value; };
    const dateTime = (value, name) => { if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) fail("invalid_contract", name + " must be an ISO datetime"); return value; };
    const integerString = (value, name) => {
      if (typeof value !== "string" || !INTEGER.test(value)) fail("invalid_contract", name + " must be an unsigned integer string");
      return value;
    };
    const decimalString = (value, name) => {
      if (typeof value !== "string" || !DECIMAL.test(value)) fail("invalid_contract", name + " must be an unsigned decimal string");
      return value;
    };
    const signedDecimalString = (value, name) => {
      if (typeof value !== "string" || !SIGNED_DECIMAL.test(value)) fail("invalid_contract", name + " must be an exact decimal string");
      return value;
    };
    const schema = (value, expectedMajor) => {
      const version = string(value, "schemaVersion");
      if (version !== expectedMajor + ".0") fail("schema_major_mismatch", "Expected schema " + expectedMajor + ".0 and received " + version);
      return version;
    };

    const validateWindow = (raw) => {
      const row = strictRecord(raw, ["start", "end", "timezone", "inclusive", "basis"], "window");
      if (row.start !== null) date(row.start, "window.start");
      if (row.end !== null) date(row.end, "window.end");
      if (!["UTC", "unknown"].includes(row.timezone)) fail("invalid_contract", "window.timezone is invalid");
      if (row.inclusive !== null && typeof row.inclusive !== "boolean") fail("invalid_contract", "window.inclusive is invalid");
      if (!WINDOW_BASIS.has(row.basis)) fail("invalid_contract", "window.basis is invalid");
      return Object.freeze({ ...row });
    };

    const validateCompleteness = (raw) => {
      const row = strictRecord(raw, ["acquisitionComplete", "populationCompleteness", "missingFields"], "completeness");
      if (typeof row.acquisitionComplete !== "boolean" || !POPULATION.has(row.populationCompleteness) || !Array.isArray(row.missingFields) || row.missingFields.some((item) => typeof item !== "string")) fail("invalid_contract", "completeness is invalid");
      return Object.freeze({ acquisitionComplete: row.acquisitionComplete, populationCompleteness: row.populationCompleteness, missingFields: Object.freeze(row.missingFields.slice()) });
    };

    const validateProvenance = (raw) => {
      if (!Array.isArray(raw)) fail("invalid_contract", "provenance must be an array");
      return Object.freeze(raw.map((item, index) => {
        const row = strictRecord(item, ["sourceId", "sourceTier", "runId", "fetchedAt", "sourceAsOf", "transformVersion", "citation"], "provenance[" + index + "]");
        if (!SOURCE_TIERS.has(row.sourceTier)) fail("invalid_contract", "provenance source tier is invalid");
        string(row.sourceId, "provenance.sourceId"); uuid(row.runId, "provenance.runId");
        dateTime(row.fetchedAt, "provenance.fetchedAt"); if (row.sourceAsOf !== null) dateTime(row.sourceAsOf, "provenance.sourceAsOf");
        string(row.transformVersion, "provenance.transformVersion"); nullableString(row.citation, "provenance.citation");
        return Object.freeze({ ...row });
      }));
    };

    const validateRank = (raw) => {
      if (raw === null) return null;
      const row = strictRecord(raw, ["metric", "unit", "direction", "rankMethod", "baseline", "eligiblePopulation", "ruleVersion", "taxonomyVersion"], "rank");
      if (!["asc", "desc"].includes(row.direction) || !RANK_METHODS.has(row.rankMethod)) fail("invalid_contract", "rank metadata is invalid");
      string(row.metric, "rank.metric"); string(row.unit, "rank.unit"); nullableString(row.baseline, "rank.baseline");
      if (row.eligiblePopulation !== null) integerString(row.eligiblePopulation, "rank.eligiblePopulation");
      string(row.ruleVersion, "rank.ruleVersion"); nullableString(row.taxonomyVersion, "rank.taxonomyVersion");
      return Object.freeze({ ...row });
    };

    const MODEL_KEYS = ["id", "canonicalSlug", "name", "description", "contentTrust", "createdUnix", "contextLength", "architecture", "pricing", "supportedParameters", "expirationDate", "lifecycleState", "freeKind", "weeklyRank", "rankMethod"];
    const validateModel = (raw, name) => {
      const row = strictRecord(raw, MODEL_KEYS, name);
      string(row.id, name + ".id"); string(row.canonicalSlug, name + ".canonicalSlug"); string(row.name, name + ".name");
      nullableString(row.description, name + ".description");
      if (row.contentTrust !== "untrusted-source") fail("invalid_contract", name + ".contentTrust is invalid");
      integerString(row.createdUnix, name + ".createdUnix"); if (row.contextLength !== null) integerString(row.contextLength, name + ".contextLength");
      if (!isRecord(row.architecture) || !isRecord(row.pricing) || !Array.isArray(row.supportedParameters)) fail("invalid_contract", name + " capability fields are invalid");
      if (row.supportedParameters.some((item) => typeof item !== "string")) fail("invalid_contract", name + ".supportedParameters is invalid");
      for (const [key, value] of Object.entries(row.pricing)) if (value !== null) decimalString(value, name + ".pricing." + key);
      if (!LIFECYCLE.has(row.lifecycleState) || !["concrete_free", "free_router", "paid_or_unknown"].includes(row.freeKind)) fail("invalid_contract", name + " lifecycle/free kind is invalid");
      if (row.weeklyRank !== null && (!Number.isInteger(row.weeklyRank) || row.weeklyRank < 1)) fail("invalid_contract", name + ".weeklyRank is invalid");
      if (row.rankMethod !== null && row.rankMethod !== "response_order") fail("invalid_contract", name + ".rankMethod is invalid");
      if (row.expirationDate !== null) date(row.expirationDate, name + ".expirationDate");
      return Object.freeze({ ...row });
    };

    const validators = {
      models: validateModel,
      free: validateModel,
      apps(raw, name) {
        const row = strictRecord(raw, ["appId", "appName", "rank", "totalTokens", "totalRequests"], name);
        integerString(row.appId, name + ".appId"); string(row.appName, name + ".appName");
        if (!Number.isInteger(row.rank) || row.rank < 1) fail("invalid_contract", name + ".rank is invalid");
        integerString(row.totalTokens, name + ".totalTokens"); integerString(row.totalRequests, name + ".totalRequests");
        return Object.freeze({ ...row });
      },
      deprecations(raw, name) {
        const row = strictRecord(raw, ["modelId", "state", "expirationDate", "firstObservedAt", "lastObservedAt", "evidenceRunId"], name);
        string(row.modelId, name + ".modelId"); if (!LIFECYCLE.has(row.state)) fail("invalid_contract", name + ".state is invalid");
        if (row.expirationDate !== null) date(row.expirationDate, name + ".expirationDate"); dateTime(row.firstObservedAt, name + ".firstObservedAt"); dateTime(row.lastObservedAt, name + ".lastObservedAt"); uuid(row.evidenceRunId, name + ".evidenceRunId");
        return Object.freeze({ ...row });
      },
      tasks(raw, name) {
        const row = strictRecord(raw, ["tag", "displayName", "macroCategory", "usageShare", "tokenShare", "categoryUsageShare", "categoryTokenShare", "sampled", "absoluteVolumeAvailable", "otherExcluded", "topModelsComplete", "models"], name);
        string(row.tag, name + ".tag"); string(row.displayName, name + ".displayName"); string(row.macroCategory, name + ".macroCategory");
        for (const key of ["usageShare", "tokenShare", "categoryUsageShare", "categoryTokenShare"]) decimalString(row[key], name + "." + key);
        if (row.sampled !== true || row.absoluteVolumeAvailable !== false || row.otherExcluded !== true || row.topModelsComplete !== false || !Array.isArray(row.models)) fail("invalid_contract", name + " sampled caveats are invalid");
        const models = row.models.map((model, index) => {
          const item = strictRecord(model, ["id", "sourcePosition", "usageShare", "tokenShare"], name + ".models[" + index + "]");
          string(item.id, name + ".models.id"); if (!Number.isInteger(item.sourcePosition) || item.sourcePosition < 1) fail("invalid_contract", "task model position is invalid");
          decimalString(item.usageShare, "task model usageShare"); decimalString(item.tokenShare, "task model tokenShare"); return Object.freeze({ ...item });
        });
        return Object.freeze({ ...row, models: Object.freeze(models) });
      },
      benchmarks(raw, name) {
        const artificial = raw?.source === "artificial-analysis";
        const keys = artificial
          ? ["source", "modelPermaslug", "displayName", "matchStatus", "pricing", "citation", "sourceUrl", "intelligenceIndex", "codingIndex", "agenticIndex"]
          : ["source", "modelPermaslug", "displayName", "matchStatus", "pricing", "citation", "sourceUrl", "arena", "category", "elo", "winRate", "avgGenerationTimeMs", "tournamentStats"];
        const row = strictRecord(raw, keys, name);
        if (!["artificial-analysis", "design-arena"].includes(row.source) || !["matched", "unmatched"].includes(row.matchStatus)) fail("invalid_contract", name + " benchmark discriminator is invalid");
        string(row.modelPermaslug, name + ".modelPermaslug"); string(row.displayName, name + ".displayName"); string(row.citation, name + ".citation");
        if (row.sourceUrl !== null && !safePublicUrl(row.sourceUrl)) fail("invalid_contract", name + ".sourceUrl is not public");
        const pricing = strictRecord(row.pricing, ["prompt", "completion"], name + ".pricing");
        if (pricing.prompt !== null) decimalString(pricing.prompt, name + ".pricing.prompt"); if (pricing.completion !== null) decimalString(pricing.completion, name + ".pricing.completion");
        if (artificial) {
          for (const key of ["intelligenceIndex", "codingIndex", "agenticIndex"]) if (row[key] !== null && typeof row[key] !== "number") fail("invalid_contract", name + "." + key + " is invalid");
          return Object.freeze({ ...row, pricing: Object.freeze({ ...pricing }) });
        }
        string(row.arena, name + ".arena"); string(row.category, name + ".category");
        if (typeof row.elo !== "number" || typeof row.winRate !== "number" || row.winRate < 0 || row.winRate > 100 || (row.avgGenerationTimeMs !== null && (typeof row.avgGenerationTimeMs !== "number" || row.avgGenerationTimeMs < 0))) fail("invalid_contract", name + " Design Arena metrics are invalid");
        const stats = strictRecord(row.tournamentStats, ["firstPlace", "secondPlace", "thirdPlace", "fourthPlace", "total"], name + ".tournamentStats");
        for (const [key, value] of Object.entries(stats)) if (value !== null && !Number.isInteger(value)) fail("invalid_contract", name + ".tournamentStats." + key + " is invalid");
        return Object.freeze({ ...row, pricing: Object.freeze({ ...pricing }), tournamentStats: Object.freeze({ ...stats }) });
      },
      providers(raw, name) {
        const row = strictRecord(raw, ["modelId", "provider", "endpoint", "quantization", "contextLength", "promptPrice", "completionPrice", "uptime", "latency", "throughput", "status", "sourceUrl", "fetchedAt"], name);
        string(row.modelId, name + ".modelId"); string(row.provider, name + ".provider"); string(row.endpoint, name + ".endpoint");
        nullableString(row.quantization, name + ".quantization"); if (row.contextLength !== null) integerString(row.contextLength, name + ".contextLength");
        for (const key of ["promptPrice", "completionPrice", "uptime", "latency", "throughput"]) if (row[key] !== null) decimalString(row[key], name + "." + key);
        nullableString(row.status, name + ".status"); if (!safePublicUrl(row.sourceUrl)) fail("invalid_contract", name + ".sourceUrl is not public"); dateTime(row.fetchedAt, name + ".fetchedAt");
        return Object.freeze({ ...row });
      },
      freeFrontiers(raw, name) {
        const row = strictRecord(raw, ["ruleVersion", "dimensions", "members", "excluded"], name);
        if (row.ruleVersion !== "openrouter-free-pareto-v1") fail("invalid_contract", name + ".ruleVersion is invalid");
        const dimensions = strictRecord(row.dimensions, ["x", "y", "xDirection", "yDirection"], name + ".dimensions");
        if (!["benchmarkQuality", "contextLength"].includes(dimensions.x) || !["medianThroughput", "weeklyPopularityRank"].includes(dimensions.y) || !["min", "max"].includes(dimensions.xDirection) || !["min", "max"].includes(dimensions.yDirection)) fail("invalid_contract", name + ".dimensions are invalid");
        if (!Array.isArray(row.members) || !Array.isArray(row.excluded)) fail("invalid_contract", name + " membership is invalid");
        const members = row.members.map((item, index) => {
          const member = strictRecord(item, ["modelId", "x", "y"], name + ".members[" + index + "]");
          string(member.modelId, name + ".members.modelId"); decimalString(member.x, name + ".members.x"); decimalString(member.y, name + ".members.y"); return Object.freeze({ ...member });
        });
        const excluded = row.excluded.map((item, index) => {
          const value = strictRecord(item, ["modelId", "reason"], name + ".excluded[" + index + "]");
          string(value.modelId, name + ".excluded.modelId"); string(value.reason, name + ".excluded.reason"); return Object.freeze({ ...value });
        });
        return Object.freeze({ ...row, dimensions: Object.freeze({ ...dimensions }), members: Object.freeze(members), excluded: Object.freeze(excluded) });
      }
    };

    export function validateOpenRouterCollection(raw, kind, expectedMajor = "2") {
      const free = kind === "free";
      const keys = ["schemaVersion", "data", "cursor", "window", "completeness", "stale", "rank", "provenance", ...(free ? ["router", "concreteFreeCount"] : [])];
      const row = strictRecord(raw, keys, kind + " response");
      schema(row.schemaVersion, expectedMajor);
      if (!validators[kind] || !Array.isArray(row.data) || (row.cursor !== null && typeof row.cursor !== "string") || typeof row.stale !== "boolean") fail("invalid_contract", kind + " response is invalid");
      const result = {
        schemaVersion: row.schemaVersion,
        data: Object.freeze(row.data.map((item, index) => validators[kind](item, kind + ".data[" + index + "]"))),
        cursor: row.cursor, window: validateWindow(row.window), completeness: validateCompleteness(row.completeness),
        stale: row.stale, rank: validateRank(row.rank), provenance: validateProvenance(row.provenance)
      };
      if (free) {
        result.router = row.router === null ? null : validateModel(row.router, "free.router");
        result.concreteFreeCount = integerString(row.concreteFreeCount, "free.concreteFreeCount");
      }
      return Object.freeze(result);
    }

    export const validateProviders = (raw, expectedMajor = "2") =>
      validateOpenRouterCollection(raw, "providers", expectedMajor);

    export const validateFreeFrontiers = (raw, expectedMajor = "2") =>
      validateOpenRouterCollection(raw, "freeFrontiers", expectedMajor);

    const validateObservedPeriod = (raw, name) => {
      const row = strictRecord(raw, ["start", "end", "unit", "inclusive"], name);
      date(row.start, name + ".start"); date(row.end, name + ".end");
      if (row.unit !== "day" || row.inclusive !== true) fail("invalid_contract", name + " must be one inclusive day");
      return Object.freeze({ ...row });
    };

    const validateAppModelCell = (raw, name) => {
      if (raw?.state === "observed") {
        const row = strictRecord(raw, ["state", "appId", "modelId", "totalTokens", "rankWithinPeriod", "period", "metricSemantics", "evidenceUrl"], name);
        integerString(row.appId, name + ".appId"); string(row.modelId, name + ".modelId"); integerString(row.totalTokens, name + ".totalTokens");
        if (!Number.isInteger(row.rankWithinPeriod) || row.rankWithinPeriod < 1 || row.metricSemantics !== "observed_daily_total_tokens" || !safePublicUrl(row.evidenceUrl)) fail("invalid_contract", name + " observed evidence is invalid");
        return Object.freeze({ ...row, period: validateObservedPeriod(row.period, name + ".period") });
      }
      const row = strictRecord(raw, ["state", "appId", "modelId", "reason"], name);
      if (row.state !== "unknown" || !["not_observed", "unmapped_alias", "not_published"].includes(row.reason)) fail("invalid_contract", name + " unknown state is invalid");
      integerString(row.appId, name + ".appId"); string(row.modelId, name + ".modelId");
      return Object.freeze({ ...row });
    };

    export function validateAppModelMatrix(raw, expectedMajor = "2") {
      if (raw?.status === "available") {
        const row = strictRecord(raw, ["schemaVersion", "status", "watermark", "resolvedPeriod", "appIds", "modelIds", "cells", "missingAliases", "coverage", "provenance"], "app-model matrix");
        schema(row.schemaVersion, expectedMajor); string(row.watermark, "matrix.watermark");
        if (!Array.isArray(row.appIds) || row.appIds.length > 10 || !Array.isArray(row.modelIds) || row.modelIds.length > 10 || !Array.isArray(row.cells) || !Array.isArray(row.missingAliases)) fail("invalid_contract", "matrix axes/cells are invalid");
        const appIds = row.appIds.map((value) => integerString(value, "matrix.appId"));
        const modelIds = row.modelIds.map((value) => string(value, "matrix.modelId"));
        const missingAliases = row.missingAliases.map((value) => integerString(value, "matrix.missingAlias"));
        const coverage = strictRecord(row.coverage, ["observedCells", "possibleCells", "populationCompleteness"], "matrix.coverage");
        if (!Number.isInteger(coverage.observedCells) || coverage.observedCells < 0 || !Number.isInteger(coverage.possibleCells) || coverage.possibleCells < 0 || coverage.populationCompleteness !== "partial_or_unknown") fail("invalid_contract", "matrix coverage is invalid");
        return Object.freeze({ ...row, resolvedPeriod: validateObservedPeriod(row.resolvedPeriod, "matrix.resolvedPeriod"), appIds: Object.freeze(appIds), modelIds: Object.freeze(modelIds), cells: Object.freeze(row.cells.map((item, index) => validateAppModelCell(item, "matrix.cells[" + index + "]"))), missingAliases: Object.freeze(missingAliases), coverage: Object.freeze({ ...coverage }), provenance: validateProvenance(row.provenance) });
      }
      const row = strictRecord(raw, ["schemaVersion", "status", "reason", "lastSuccessAt", "appIds", "modelIds", "cells"], "app-model matrix unavailable");
      schema(row.schemaVersion, expectedMajor);
      if (row.status !== "unavailable" || !["collection_disabled", "not_published", "no_common_period"].includes(row.reason) || (row.lastSuccessAt !== null && !Number.isFinite(Date.parse(row.lastSuccessAt))) || !Array.isArray(row.appIds) || row.appIds.length > 10 || !Array.isArray(row.modelIds) || row.modelIds.length > 10 || !Array.isArray(row.cells) || row.cells.length !== 0) fail("invalid_contract", "matrix unavailable state is invalid");
      return Object.freeze({ ...row, appIds: Object.freeze(row.appIds.map((value) => integerString(value, "matrix.appId"))), modelIds: Object.freeze(row.modelIds.map((value) => string(value, "matrix.modelId"))), cells: Object.freeze([]) });
    }

    export function validateAppModels(raw, expectedMajor = "2") {
      if (raw?.status === "available") {
        const row = strictRecord(raw, ["schemaVersion", "status", "watermark", "appId", "appName", "resolvedPeriod", "data", "cursor", "coverage", "provenance"], "app models");
        schema(row.schemaVersion, expectedMajor); string(row.watermark, "appModels.watermark"); integerString(row.appId, "appModels.appId"); string(row.appName, "appModels.appName");
        if (!Array.isArray(row.data) || row.data.length > 100 || row.cursor !== null) fail("invalid_contract", "appModels data/cursor is invalid");
        const data = row.data.map((item, index) => {
          const value = strictRecord(item, ["modelId", "rank", "rankMethod", "totalTokens", "metricSemantics", "evidenceUrl", "period"], "appModels.data[" + index + "]");
          string(value.modelId, "appModels.modelId"); integerString(value.totalTokens, "appModels.totalTokens");
          if (!Number.isInteger(value.rank) || value.rank < 1 || value.rankMethod !== "locally_calculated" || value.metricSemantics !== "observed_daily_total_tokens" || !safePublicUrl(value.evidenceUrl)) fail("invalid_contract", "appModels row is invalid");
          return Object.freeze({ ...value, period: validateObservedPeriod(value.period, "appModels.period") });
        });
        const coverage = strictRecord(row.coverage, ["observedModels", "populationCompleteness"], "appModels.coverage");
        if (!Number.isInteger(coverage.observedModels) || coverage.observedModels < 0 || coverage.populationCompleteness !== "partial_or_unknown") fail("invalid_contract", "appModels coverage is invalid");
        return Object.freeze({ ...row, resolvedPeriod: validateObservedPeriod(row.resolvedPeriod, "appModels.resolvedPeriod"), data: Object.freeze(data), coverage: Object.freeze({ ...coverage }), provenance: validateProvenance(row.provenance) });
      }
      const row = strictRecord(raw, ["schemaVersion", "status", "reason", "lastSuccessAt", "appId", "data", "cursor"], "app models unavailable");
      schema(row.schemaVersion, expectedMajor);
      if (row.status !== "unavailable" || !["collection_disabled", "unmapped_alias", "not_published", "no_observed_period"].includes(row.reason) || (row.lastSuccessAt !== null && !Number.isFinite(Date.parse(row.lastSuccessAt))) || !Array.isArray(row.data) || row.data.length !== 0 || row.cursor !== null) fail("invalid_contract", "appModels unavailable state is invalid");
      integerString(row.appId, "appModels.appId"); return Object.freeze({ ...row, data: Object.freeze([]) });
    }

    const validateHistoryBucket = (raw, name) => {
      const bucket = strictRecord(raw, ["date", "complete", "rows"], name); date(bucket.date, name + ".date");
      if (typeof bucket.complete !== "boolean" || !Array.isArray(bucket.rows)) fail("invalid_contract", name + " is invalid");
      const rows = bucket.rows.map((rawRow, index) => {
        const row = strictRecord(rawRow, ["id", "label", "scope", "rank", "value", "remainder", "stars", "forks"], name + ".rows[" + index + "]");
        string(row.id, name + ".id"); string(row.label, name + ".label"); nullableString(row.scope, name + ".scope");
        if (row.rank !== null && (!Number.isInteger(row.rank) || row.rank < 1)) fail("invalid_contract", name + ".rank is invalid");
        if (row.value !== null) signedDecimalString(row.value, name + ".value"); if (row.remainder !== null) signedDecimalString(row.remainder, name + ".remainder");
        if (row.stars !== null) integerString(row.stars, name + ".stars"); if (row.forks !== null) integerString(row.forks, name + ".forks");
        return Object.freeze({ ...row });
      });
      return Object.freeze({ ...bucket, rows: Object.freeze(rows) });
    };

    export function validateHistory(raw, expectedMajor = "2") {
      if (raw?.status === "available") {
        const row = strictRecord(raw, ["schemaVersion", "status", "data", "window", "completeness", "stale", "rank", "provenance"], "history");
        schema(row.schemaVersion, expectedMajor); if (row.rank !== null || typeof row.stale !== "boolean") fail("invalid_contract", "history rank/stale is invalid");
        const data = strictRecord(row.data, ["modelUsage", "appRanks", "githubRanks"], "history.data");
        const mapBuckets = (key) => { if (!Array.isArray(data[key]) || data[key].length > 365) fail("invalid_contract", "history." + key + " is invalid"); return Object.freeze(data[key].map((bucket, index) => validateHistoryBucket(bucket, "history." + key + "[" + index + "]"))); };
        return Object.freeze({ ...row, data: Object.freeze({ modelUsage: mapBuckets("modelUsage"), appRanks: mapBuckets("appRanks"), githubRanks: mapBuckets("githubRanks") }), window: validateWindow(row.window), completeness: validateCompleteness(row.completeness), provenance: validateProvenance(row.provenance) });
      }
      const row = strictRecord(raw, ["schemaVersion", "status", "reason", "lastSuccessAt"], "history unavailable");
      schema(row.schemaVersion, expectedMajor);
      if (row.status !== "unavailable" || row.reason !== "insufficient_history" || (row.lastSuccessAt !== null && !Number.isFinite(Date.parse(row.lastSuccessAt)))) fail("invalid_contract", "history unavailable state is invalid");
      return Object.freeze({ ...row });
    }

    const SOURCE_KEYS = ["sourceId", "sourceTier", "cadenceSeconds", "staleAfterSeconds", "publishedRunId", "publishedAt", "nextScheduledAt", "stale", "transformVersion", "citationUrl", "lastAttemptRunId", "lastAttemptStatus", "lastAttemptStartedAt", "lastAttemptFinishedAt", "lastAttemptErrorCode", "lastAttemptAcquisitionComplete", "lastAttemptPopulationCompleteness"];
    export function validateManifest(raw, expectedMajor = "2") {
      const row = strictRecord(raw, ["schemaVersion", "publishedAt", "routes", "sources", "provenance", "window"], "manifest");
      schema(row.schemaVersion, expectedMajor);
      if (!Array.isArray(row.routes) || !Array.isArray(row.sources)) fail("invalid_manifest", "manifest routes/sources are invalid");
      const sources = row.sources.map((item, index) => {
        const source = strictRecord(item, SOURCE_KEYS, "manifest.sources[" + index + "]");
        string(source.sourceId, "sourceId"); if (!SOURCE_TIERS.has(source.sourceTier) || typeof source.stale !== "boolean") fail("invalid_manifest", "manifest source state is invalid");
        if (!Number.isInteger(source.cadenceSeconds) || source.cadenceSeconds < 1 || !Number.isInteger(source.staleAfterSeconds) || source.staleAfterSeconds < 1) fail("invalid_manifest", "manifest source cadence is invalid");
        if (source.publishedRunId !== null) uuid(source.publishedRunId, "publishedRunId");
        if (source.publishedAt !== null) dateTime(source.publishedAt, "publishedAt"); if (source.nextScheduledAt !== null) dateTime(source.nextScheduledAt, "nextScheduledAt");
        string(source.transformVersion, "transformVersion");
        if (source.lastAttemptRunId !== null) uuid(source.lastAttemptRunId, "lastAttemptRunId");
        if (source.lastAttemptStatus !== null && !["running", "published", "failed"].includes(source.lastAttemptStatus)) fail("invalid_manifest", "lastAttemptStatus is invalid");
        if (source.lastAttemptStartedAt !== null) dateTime(source.lastAttemptStartedAt, "lastAttemptStartedAt"); if (source.lastAttemptFinishedAt !== null) dateTime(source.lastAttemptFinishedAt, "lastAttemptFinishedAt");
        if (source.lastAttemptErrorCode !== null) string(source.lastAttemptErrorCode, "lastAttemptErrorCode");
        if (source.lastAttemptAcquisitionComplete !== null && typeof source.lastAttemptAcquisitionComplete !== "boolean") fail("invalid_manifest", "lastAttemptAcquisitionComplete is invalid");
        if (source.lastAttemptPopulationCompleteness !== null && !POPULATION.has(source.lastAttemptPopulationCompleteness)) fail("invalid_manifest", "lastAttemptPopulationCompleteness is invalid");
        if (source.citationUrl !== null && !safePublicUrl(source.citationUrl)) fail("invalid_manifest", "citationUrl is not public");
        return Object.freeze({ ...source });
      });
      if (new Set(sources.map((source) => source.sourceId)).size !== sources.length) fail("invalid_manifest", "manifest source IDs must be unique");
      const sourceIndex = Object.freeze(Object.fromEntries(sources.map((source) => [source.sourceId, source])));
      if (row.publishedAt !== null) dateTime(row.publishedAt, "manifest.publishedAt");
      if (row.routes.some((route) => typeof route !== "string" || !route.startsWith("/api/public/v2/"))) fail("invalid_manifest", "manifest route is invalid");
      return Object.freeze({ schemaVersion: row.schemaVersion, publishedAt: row.publishedAt, routes: Object.freeze(row.routes.slice()), sources: Object.freeze(sources), sourceIndex, provenance: validateProvenance(row.provenance), window: validateWindow(row.window) });
    }

    export function assertPublishedRun(manifest, sourceId, response) {
      const expected = manifest.sourceIndex[sourceId]?.publishedRunId;
      const actual = response.provenance.find((item) => item.sourceId === sourceId)?.runId;
      if (!expected || actual !== expected) fail("mixed_snapshot", "Response provenance does not match the manifest published run", { sourceId, expected: expected || null, actual: actual || null });
    }

    export function validatePublicError(raw, expectedMajor = "2") {
      const row = strictRecord(raw, ["schemaVersion", "error"], "public error"); schema(row.schemaVersion, expectedMajor);
      const error = strictRecord(row.error, ["code", "message", "correlationId", "retryable"], "public error.error");
      string(error.code, "error.code"); string(error.message, "error.message"); uuid(error.correlationId, "error.correlationId");
      if (typeof error.retryable !== "boolean") fail("invalid_contract", "error.retryable is invalid");
      return Object.freeze({ schemaVersion: row.schemaVersion, error: Object.freeze({ ...error }) });
    }

    export function validateGitHubRanking(raw, expectedMajor = "2") {
      const row = strictRecord(raw, ["schemaVersion", "watermark", "coverage", "ranking", "data", "page", "provenance"], "github ranking");
      schema(row.schemaVersion, expectedMajor); string(row.watermark, "watermark");
      const coverage = strictRecord(row.coverage, ["resolvedAsOf", "acquisitionComplete", "populationCompleteness"], "coverage");
      string(coverage.resolvedAsOf, "coverage.resolvedAsOf"); if (typeof coverage.acquisitionComplete !== "boolean" || !POPULATION.has(coverage.populationCompleteness)) fail("invalid_contract", "GitHub coverage is invalid");
      const ranking = strictRecord(row.ranking, ["metric", "rankMethod", "ruleVersion", "taxonomyVersion", "category", "entityLevel", "eligiblePopulation", "windowDays"], "ranking");
      if (!GITHUB_METRICS.has(ranking.metric) || !GITHUB_CATEGORIES.has(ranking.category) || ranking.rankMethod !== "locally_calculated" || !["project-family", "repository"].includes(ranking.entityLevel) || !Number.isInteger(ranking.eligiblePopulation) || ranking.eligiblePopulation < 0 || (ranking.windowDays !== null && !GITHUB_WINDOWS.has(ranking.windowDays))) fail("invalid_contract", "GitHub ranking metadata is invalid");
      string(ranking.ruleVersion, "ranking.ruleVersion"); string(ranking.taxonomyVersion, "ranking.taxonomyVersion");
      const data = row.data.map((item, index) => {
        const value = strictRecord(item, ["repositoryId", "fullName", "stars", "forks", "rank", "score"], "github.data[" + index + "]");
        integerString(value.repositoryId, "repositoryId"); string(value.fullName, "fullName"); integerString(value.stars, "stars"); integerString(value.forks, "forks");
        if (!Number.isInteger(value.rank) || value.rank < 1 || (value.score !== null && typeof value.score !== "string")) fail("invalid_contract", "GitHub ranking row is invalid");
        return Object.freeze({ ...value });
      });
      const page = strictRecord(row.page, ["limit", "nextCursor"], "page");
      if (!Number.isInteger(page.limit) || page.limit < 1 || (page.nextCursor !== null && typeof page.nextCursor !== "string")) fail("invalid_contract", "GitHub page is invalid");
      if (!Array.isArray(row.provenance)) fail("invalid_contract", "GitHub provenance is invalid");
      const provenance = row.provenance.map((item, index) => {
        const value = strictRecord(item, ["id", "sourceUrl", "fetchedAt"], "github.provenance[" + index + "]");
        string(value.id, "provenance.id"); if (!safePublicUrl(value.sourceUrl)) fail("invalid_contract", "GitHub sourceUrl is not public"); string(value.fetchedAt, "provenance.fetchedAt");
        return Object.freeze({ ...value });
      });
      return Object.freeze({ schemaVersion: row.schemaVersion, watermark: row.watermark, coverage: Object.freeze({ ...coverage }), ranking: Object.freeze({ ...ranking }), data: Object.freeze(data), page: Object.freeze({ ...page }), provenance: Object.freeze(provenance) });
    }

    export function compactIntegerString(raw) {
      if (!/^-?\d+$/.test(String(raw))) {
        throw new TypeError("Expected an integer string");
      }
      const value = BigInt(raw);
      const negative = value < 0n;
      const absolute = negative ? -value : value;
      const units = [
        [1000000000000000000n, "Q"],
        [1000000000000000n, "q"],
        [1000000000000n, "T"],
        [1000000000n, "B"],
        [1000000n, "M"],
        [1000n, "K"]
      ];
      for (const [divisor, suffix] of units) {
        if (absolute >= divisor) {
          const tenths = (absolute * 10n) / divisor;
          const sign = negative ? "-" : "";
          return sign + String(tenths / 10n) + "." + String(tenths % 10n) + suffix;
        }
      }
      return String(value);
    }

    export function exactDecimalString(raw) {
      const value = String(raw);
      if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
        throw new TypeError("Expected an exact decimal string");
      }
      return value;
    }

    const privateHostname = (hostname) => {
      const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
      if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || (!host.includes(".") && !host.includes(":")) || host === "::" || host === "::1" || host.startsWith("::ffff:") || /^f[cd][0-9a-f]:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)) return true;
      const octets = host.split(".").map(Number);
      if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
      const [a, b] = octets;
      return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
    };

    export function safePublicUrl(raw) {
      try {
        const url = new URL(String(raw));
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || privateHostname(url.hostname)) {
          return null;
        }
        return url;
      } catch {
        return null;
      }
    }

    export function canonicalJson(value) {
      if (Array.isArray(value)) {
        return "[" + value.map(canonicalJson).join(",") + "]";
      }
      if (isRecord(value)) {
        const pairs = Object.keys(value)
          .sort()
          .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]));
        return "{" + pairs.join(",") + "}";
      }
      return JSON.stringify(value);
    }

    export async function sha256Hex(value) {
      const bytes = new TextEncoder().encode(canonicalJson(value));
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }

- [ ] **Step 4: Run the schema tests and verify they pass**

Run:

    node --test --test-name-pattern="schema|manifest|formatters|public URL|Plan 04|Plan 05" scratch/tests/open-overview.test.js

Expected: 7 matching tests pass, 0 fail; invented fields, private URLs, unknown-vs-zero collapse, invented efficiency fields, and history contract drift all fail closed.

- [ ] **Step 5: Commit the public-data trust boundary**

Run:

    git add web/open-overview/open-overview-schema.js scratch/tests/open-overview.test.js
    git commit -m "feat(open-overview): validate public v2 data"

Expected: one commit containing no route UI behavior.

### Task 3: Bounded API client, ETag ownership, and watermark coherence

**Files:**

- Create: web/open-overview/open-overview-api.js
- Modify: scratch/tests/open-overview.test.js

**Interfaces:**

- Consumes: `validateOpenRouterCollection`, `validateHistory`, `validateAppModelMatrix`, `validateAppModels`, `validateProviders`, `validateFreeFrontiers`, `validateManifest`, `validateGitHubRanking`, and `assertPublishedRun` from Task 2; config.json values.
- Produces: ENDPOINTS, OVERVIEW_REQUESTS, createOpenOverviewClient(options), canonicalPath(path), and a loadView(requests) result shaped as { mode, manifest, responses, errors }.

- [ ] **Step 1: Append failing API-client tests**

Append to scratch/tests/open-overview.test.js:

    test("API client owns ETag bodies and reuses a validated body on 304", async () => {
      const { createOpenOverviewClient } =
        await importRouteModule("open-overview-api.js");
      const { validateManifest } = await importRouteModule("open-overview-schema.js");
      const calls = [];
      const responses = [
        new Response(JSON.stringify(openRouterEnvelope("models", [])), {
          status: 200,
          headers: { "Content-Type": "application/json", ETag: '"models-1"' }
        }),
        new Response(null, { status: 304, headers: { ETag: '"models-1"' } })
      ];
      const fetchImpl = async (url, options) => {
        calls.push({ url, headers: new Headers(options.headers) });
        return responses.shift();
      };
      const client = createOpenOverviewClient({
        apiBase: "https://api.example.test",
        schemaMajor: "2",
        timeoutMs: 8000,
        conditionalRequests: true,
        fetchImpl
      });

      const spec = { key: "models", path: "/models?limit=10&rank_source=top-weekly", kind: "models", sourceId: "models_current" };
      const first = await client.load(spec, validateManifest(openRouterManifest(), "2"));
      const second = await client.load(spec, validateManifest(openRouterManifest(), "2"));

      assert.equal(second, first);
      assert.equal(calls[0].headers.has("If-None-Match"), false);
      assert.equal(calls[1].headers.get("If-None-Match"), '"models-1"');
    });

    test("API client retries one watermark mismatch and then fails closed", async () => {
      const { createOpenOverviewClient } =
        await importRouteModule("open-overview-api.js");
      const { validateManifest } = await importRouteModule("open-overview-schema.js");
      let calls = 0;
      const fetchImpl = async () => {
        calls += 1;
        const body = openRouterEnvelope("models", []);
        body.provenance[0].runId = RUNS.apps_ranked;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      };
      const client = createOpenOverviewClient({
        apiBase: "https://api.example.test",
        schemaMajor: "2",
        timeoutMs: 8000,
        fetchImpl
      });

      await assert.rejects(
        () => client.load(
          { key: "models", path: "/models?limit=10&rank_source=top-weekly", kind: "models", sourceId: "models_current" },
          validateManifest(openRouterManifest(), "2")
        ),
        (error) => error.code === "mixed_snapshot"
      );
      assert.equal(calls, 2);
    });

    test("API client aborts at its configured timeout and clears the timer", async () => {
      const { createOpenOverviewClient } =
        await importRouteModule("open-overview-api.js");
      const { validateManifest } = await importRouteModule("open-overview-schema.js");
      const fetchImpl = async (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true }
          );
        });
      const client = createOpenOverviewClient({
        apiBase: "https://api.example.test",
        schemaMajor: "2",
        timeoutMs: 5,
        fetchImpl
      });
      await assert.rejects(() => client.load(
        { key: "models", path: "/models?limit=10&rank_source=top-weekly", kind: "models", sourceId: "models_current" },
        validateManifest(openRouterManifest(), "2")
      ), /timed out/);
    });

    test("API client dispatches every finalized Plan 05 response kind", async () => {
      const { createOpenOverviewClient, ENDPOINTS } = await importRouteModule("open-overview-api.js");
      const { validateManifest } = await importRouteModule("open-overview-schema.js");
      const fetchImpl = async (url) => {
        const path = new URL(url).pathname;
        const body = path.endsWith("/app-model-matrix")
          ? { schemaVersion: "2.0", status: "unavailable", reason: "collection_disabled", lastSuccessAt: null, appIds: [], modelIds: [], cells: [] }
          : /\/apps\/1000\/models$/.test(path)
            ? { schemaVersion: "2.0", status: "unavailable", reason: "collection_disabled", lastSuccessAt: null, appId: "1000", data: [], cursor: null }
            : path.endsWith("/providers")
              ? openRouterEnvelope("providers", [])
              : openRouterEnvelope("freeFrontiers", []);
        return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      };
      const client = createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, fetchImpl });
      const manifest = validateManifest(openRouterManifest(), "2");
      assert.equal((await client.load({ key: "matrix", path: ENDPOINTS.appModelMatrix, kind: "matrix" }, manifest)).status, "unavailable");
      assert.equal((await client.load({ key: "appModels", path: ENDPOINTS.appModels("1000"), kind: "appModels" }, manifest)).appId, "1000");
      assert.equal((await client.load({ key: "providers", path: ENDPOINTS.providers, kind: "providers" }, manifest)).data.length, 0);
      assert.equal((await client.load({ key: "frontier", path: ENDPOINTS.freeFrontier, kind: "freeFrontiers" }, manifest)).data.length, 0);
    });

- [ ] **Step 2: Run the API tests and verify they fail**

Run:

    node --test --test-name-pattern="API client" scratch/tests/open-overview.test.js

Expected: FAIL with ERR_MODULE_NOT_FOUND for open-overview-api.js.

- [ ] **Step 3: Implement the endpoint registry and API client**

Create web/open-overview/open-overview-api.js:

    import {
      ContractError,
      assertPublishedRun,
      safePublicUrl,
      validateAppModelMatrix,
      validateAppModels,
      validateFreeFrontiers,
      validateGitHubRanking,
      validateHistory,
      validateManifest,
      validateOpenRouterCollection,
      validateProviders,
      validatePublicError
    } from "./open-overview-schema.js";

    export const GITHUB_CATEGORIES = Object.freeze([
      ["ai-harnesses", "AI harnesses and coding agents"],
      ["inference", "Inference/model serving"],
      ["ai-skills", "AI Skills"],
      ["mcp", "MCP"],
      ["connectors", "Connectors"],
      ["a2a", "A2A"],
      ["agent-frameworks", "Agent frameworks"],
      ["ai-orchestration", "General AI orchestration"]
    ]);

    export const ENDPOINTS = Object.freeze({
      manifest: "/manifest",
      sourceStatus: "/source-status",
      modelsTopWeekly: "/models?limit=10&rank_source=top-weekly",
      appsPopular: "/apps?limit=10&period=30d&sort=popular",
      freeModels: "/free-models?limit=50",
      deprecations: "/deprecations?limit=50",
      tasks: "/tasks?limit=50&window=7d",
      benchmarks: "/benchmarks?limit=50",
      appModelMatrix: "/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete",
      appModels: (appId) => {
        if (!/^\d+$/.test(String(appId))) throw new TypeError("appId must be a decimal string");
        return "/apps/" + encodeURIComponent(String(appId)) + "/models?limit=100";
      },
      providers: "/providers?limit=100",
      freeFrontier: "/free-frontiers?x=benchmarkQuality&y=medianThroughput&limit=200",
      history: "/history?window=90d&limit=10",
      githubRanking: (category, metric = "adoption", windowDays = null, limit = 10) => {
        const query = new URLSearchParams({
          category,
          entity_level: "project-family",
          limit: String(limit),
          metric
        });
        if (windowDays !== null) query.set("window", String(windowDays));
        return "/github/rankings?" + query.toString();
      }
    });

    const request = (key, path, kind, sourceId = null, optional = false) =>
      Object.freeze({ key, path, kind, sourceId, optional });

    export const OVERVIEW_REQUESTS = Object.freeze([
      request("models", ENDPOINTS.modelsTopWeekly, "models", "models_current"),
      request("apps", ENDPOINTS.appsPopular, "apps", "apps_ranked"),
      request("matrix", ENDPOINTS.appModelMatrix, "matrix", null, true),
      request("free", ENDPOINTS.freeModels, "free", "models_current"),
      request("deprecations", ENDPOINTS.deprecations, "deprecations", "models_current"),
      request("tasks", ENDPOINTS.tasks, "tasks", "task_classifications"),
      request("benchmarks", ENDPOINTS.benchmarks, "benchmarks", "benchmarks_current"),
      request("providers", ENDPOINTS.providers, "providers", null, true),
      request("freeFrontier", ENDPOINTS.freeFrontier, "freeFrontiers", null, true),
      request("history", ENDPOINTS.history, "history", null, true),
      ...GITHUB_CATEGORIES.map(([slug]) =>
        request(
          "github:" + slug,
          ENDPOINTS.githubRanking(slug),
          "github",
          null,
          true
        )
      )
    ]);

    export const FALLBACK_REQUESTS = Object.freeze([
      request("models", ENDPOINTS.modelsTopWeekly, "models", "models_current"),
      request("apps", ENDPOINTS.appsPopular, "apps", "apps_ranked"),
      request("matrix", ENDPOINTS.appModelMatrix, "matrix", null, true),
      request("free", ENDPOINTS.freeModels, "free", "models_current"),
      request("deprecations", ENDPOINTS.deprecations, "deprecations", "models_current"),
      request("tasks", ENDPOINTS.tasks, "tasks", "task_classifications"),
      request("benchmarks", ENDPOINTS.benchmarks, "benchmarks", "benchmarks_current"),
      request("providers", ENDPOINTS.providers, "providers", null, true),
      request("freeFrontier", ENDPOINTS.freeFrontier, "freeFrontiers", null, true),
      request("history", ENDPOINTS.history, "history", null, true),
      ...GITHUB_CATEGORIES.flatMap(([slug]) => [
        request("fallback:" + slug + ":adoption", ENDPOINTS.githubRanking(slug, "adoption"), "github"),
        request("fallback:" + slug + ":maintenance", ENDPOINTS.githubRanking(slug, "maintenance"), "github"),
        ...[7, 30, 90].map((days) => request("fallback:" + slug + ":momentum:" + days, ENDPOINTS.githubRanking(slug, "momentum", days), "github"))
      ])
    ]);

    export function canonicalPath(path) {
      const url = new URL(path, "https://open-overview.invalid");
      const sorted = new URLSearchParams(
        Array.from(url.searchParams.entries()).sort(([a, av], [b, bv]) =>
          a === b ? av.localeCompare(bv) : a.localeCompare(b)
        )
      );
      return url.pathname + (sorted.size ? "?" + sorted.toString() : "");
    }

    export function createOpenOverviewClient({
      apiBase,
      schemaMajor,
      timeoutMs,
      conditionalRequests = false,
      fetchImpl = globalThis.fetch
    }) {
      const base = safePublicUrl(apiBase);
      if (!base || base.protocol !== "https:" || base.pathname !== "/" || base.search || base.hash) throw new TypeError("apiBase must be a public credential-free HTTPS origin");
      const cache = new Map();

      const validate = (spec, raw) => spec.kind === "manifest"
        ? validateManifest(raw, schemaMajor)
        : spec.kind === "github"
          ? validateGitHubRanking(raw, schemaMajor)
          : spec.kind === "matrix"
            ? validateAppModelMatrix(raw, schemaMajor)
            : spec.kind === "appModels"
              ? validateAppModels(raw, schemaMajor)
              : spec.kind === "providers"
                ? validateProviders(raw, schemaMajor)
                : spec.kind === "freeFrontiers"
                  ? validateFreeFrontiers(raw, schemaMajor)
                  : spec.kind === "history"
                    ? validateHistory(raw, schemaMajor)
                    : validateOpenRouterCollection(raw, spec.kind, schemaMajor);

      async function fetchJson(spec, { conditional = true } = {}) {
        const key = canonicalPath(spec.path);
        const cached = cache.get(key);
        const headers = new Headers({ Accept: "application/json" });
        if (conditionalRequests && conditional && cached) headers.set("If-None-Match", cached.etag);
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(new DOMException("timed out", "TimeoutError")),
          timeoutMs
        );

        try {
          const response = await fetchImpl(
            new URL("/api/public/v2" + key, base).href,
            {
              method: "GET",
              headers,
              credentials: "omit",
              signal: controller.signal,
              cache: "no-store"
            }
          );
          if (response.status === 304) {
            if (!cached) {
              return fetchJson(spec, { conditional: false });
            }
            return cached.body;
          }
          if (!response.ok) {
            const publicError = validatePublicError(await response.json(), schemaMajor);
            throw new ContractError(
              "http_error",
              publicError.error.message,
              { status: response.status, availability: response.status >= 500, apiCode: publicError.error.code, retryable: publicError.error.retryable }
            );
          }
          const raw = await response.json();
          const body = validate(spec, raw);
          const etag = response.headers.get("ETag");
          if (etag) cache.set(key, { etag, body });
          return body;
        } catch (error) {
          if (controller.signal.aborted) {
            throw new ContractError("timeout", "Public API request timed out");
          }
          if (error instanceof TypeError) {
            throw new ContractError("network_unavailable", "Public API network request failed");
          }
          throw error;
        } finally {
          clearTimeout(timer);
        }
      }

      async function load(spec, manifest) {
        let mismatch = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (attempt === 1) cache.delete(canonicalPath(spec.path));
          const envelope = await fetchJson(spec, { conditional: attempt === 0 });
          try {
            if (spec.sourceId) assertPublishedRun(manifest, spec.sourceId, envelope);
            return envelope;
          } catch (error) {
            if (error.code !== "mixed_snapshot") throw error;
            mismatch = error;
          }
        }
        throw mismatch;
      }

      async function loadView(requests) {
        const manifest = await fetchJson({ key: "manifest", path: ENDPOINTS.manifest, kind: "manifest" });
        const settled = await Promise.allSettled(
          requests.map((spec) =>
            load(spec, manifest)
          )
        );
        const responses = {};
        const errors = {};
        settled.forEach((result, index) => {
          const spec = requests[index];
          if (result.status === "fulfilled") responses[spec.key] = result.value;
          else errors[spec.key] = result.reason;
        });
        return Object.freeze({
          mode: "live",
          manifest,
          responses: Object.freeze(responses),
          errors: Object.freeze(errors)
        });
      }

      return Object.freeze({
        load,
        loadManifest: () => fetchJson({ key: "manifest", path: ENDPOINTS.manifest, kind: "manifest" }),
        loadView,
        clear: () => cache.clear()
      });
    }

- [ ] **Step 4: Run the API tests and verify they pass**

Run:

    node --test --test-name-pattern="API client" scratch/tests/open-overview.test.js

Expected: 4 matching tests pass, 0 fail.

- [ ] **Step 5: Commit the API client**

Run:

    git add web/open-overview/open-overview-api.js scratch/tests/open-overview.test.js
    git commit -m "feat(open-overview): add bounded public API client"

Expected: the route still does not make live requests because open-overview.js has not imported the client.

### Task 4: Live-derived fallback generator and all-or-nothing fallback loading

**Files:**

- Create: scripts/sync-open-overview-fallback.mjs
- Modify: web/open-overview/open-overview-api.js
- Modify: scratch/tests/open-overview.test.js
- Generate at release only: web/open-overview/fallback-data.json

**Interfaces:**

- Consumes: exact `FALLBACK_REQUESTS`, exact response-kind validators, `assertPublishedRun`, and `OPEN_OVERVIEW_API_BASE`.
- Produces: `buildFallback(options)`, `parseCli(argv)`, `verifyFallbackBundle(bundle)`, and API-client fallback mode that activates only for a timeout, network failure, or HTTP 5xx while loading the manifest. Schema drift, unknown fields, 4xx responses, and invalid JSON fail closed and never trigger fallback.

- [ ] **Step 1: Append failing fallback tests**

Append to scratch/tests/open-overview.test.js:

    test("fallback builder accepts only fresh live envelopes and writes a checksum", async () => {
      const os = require("node:os");
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), "oo-fallback-"));
      const outPath = path.join(temp, "fallback-data.json");
      const { buildFallback } = await import(
        pathToFileURL(path.join(ROOT, "scripts", "sync-open-overview-fallback.mjs")).href +
        "?test=" + Date.now()
      );
      const manifest = openRouterManifest();
      const fetchImpl = async (url) => {
        if (url.endsWith("/manifest")) {
          return new Response(JSON.stringify(manifest), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(openRouterEnvelope("models", [])), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      };

      const bundle = await buildFallback({
        apiBase: "https://api.example.test",
        outPath,
        maxAgeHours: 48,
        requireLive: true,
        now: new Date("2026-07-15T01:00:00Z"),
        fetchImpl,
        requests: [{
          key: "models",
          path: "/models?limit=10&rank_source=top-weekly",
          kind: "models",
          sourceId: "models_current",
          optional: false
        }]
      });
      assert.equal(bundle.mode, "snapshot");
      assert.match(bundle.checksum, /^[a-f0-9]{64}$/);
      assert.equal(JSON.parse(fs.readFileSync(outPath, "utf8")).checksum, bundle.checksum);
      assert.equal(
        fs.readdirSync(temp).some((name) => name.includes(".tmp-")),
        false
      );
    });

    test("fallback builder rejects invented fixture fields and the oldest stale required response", async () => {
      const { buildFallback } = await import(
        pathToFileURL(path.join(ROOT, "scripts", "sync-open-overview-fallback.mjs")).href +
        "?reject=" + Date.now()
      );
      const fixtureManifest = { ...openRouterManifest(), mode: "fixture" };
      await assert.rejects(
        () => buildFallback({
          apiBase: "https://api.example.test",
          outPath: path.join(require("node:os").tmpdir(), "rejected-fallback.json"),
          maxAgeHours: 48,
          requireLive: true,
          now: new Date("2026-07-15T01:00:00Z"),
          fetchImpl: async () => new Response(JSON.stringify(fixtureManifest), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }),
          requests: []
        }),
        /schema|field/i
      );
      const stale = openRouterEnvelope("models", []);
      stale.provenance[0].fetchedAt = "2026-07-12T00:00:00Z";
      await assert.rejects(() => buildFallback({
        apiBase: "https://api.example.test", outPath: path.join(require("node:os").tmpdir(), "stale-fallback.json"),
        maxAgeHours: 48, requireLive: true, now: new Date("2026-07-15T01:00:00Z"),
        fetchImpl: async (url) => new Response(JSON.stringify(String(url).endsWith("/manifest") ? openRouterManifest() : stale), { status: 200, headers: { "Content-Type": "application/json" } }),
        requests: [{ key: "models", path: "/models?limit=10&rank_source=top-weekly", kind: "models", sourceId: "models_current", optional: false }]
      }), /oldest required response/i);
    });

    test("client uses one complete snapshot only when the live manifest fails", async () => {
      const { createOpenOverviewClient } =
        await importRouteModule("open-overview-api.js");
      const fallbackEnvelope = openRouterEnvelope("models", []);
      const unsigned = {
        schemaVersion: "2",
        mode: "snapshot",
        sourceApiBase: "https://api.example.test",
        generatedAt: "2026-07-15T00:00:00Z",
        oldestFetchedAt: "2026-07-15T00:00:00Z",
        manifest: openRouterManifest(),
        responses: { "/models?limit=10&rank_source=top-weekly": fallbackEnvelope }
      };
      const { sha256Hex } = await importRouteModule("open-overview-schema.js");
      const bundle = { ...unsigned, checksum: await sha256Hex(unsigned) };
      const fetchImpl = async (url) => {
        if (String(url).endsWith("/fallback-data.json")) {
          return new Response(JSON.stringify(bundle), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        throw new TypeError("network unavailable");
      };
      const client = createOpenOverviewClient({
        apiBase: "https://api.example.test",
        schemaMajor: "2",
        timeoutMs: 8000,
        fallbackUrl: "https://site.example.test/fallback-data.json",
        fetchImpl
      });
      const view = await client.loadView([{
        key: "models",
        path: "/models?limit=10&rank_source=top-weekly",
        kind: "models",
        sourceId: "models_current",
        optional: false
      }]);
      assert.equal(view.mode, "snapshot");
      assert.equal(view.responses.models.schemaVersion, "2.0");
    });

    test("schema mismatch never falls back", async () => {
      const { createOpenOverviewClient } = await importRouteModule("open-overview-api.js");
      let fallbackRequests = 0;
      const client = createOpenOverviewClient({
        apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000,
        fallbackUrl: "https://site.example.test/fallback-data.json",
        fetchImpl: async (url) => {
          if (String(url).endsWith("/fallback-data.json")) fallbackRequests += 1;
          return new Response(JSON.stringify({ ...openRouterManifest(), schemaVersion: "3.0" }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      });
      await assert.rejects(() => client.loadView([]), (error) => error.code === "schema_major_mismatch");
      assert.equal(fallbackRequests, 0);
    });

- [ ] **Step 2: Run the fallback tests and verify they fail**

Run:

    node --test --test-name-pattern="fallback|complete snapshot" scratch/tests/open-overview.test.js

Expected: FAIL because sync-open-overview-fallback.mjs and fallbackUrl support do not exist.

- [ ] **Step 3: Implement the live fallback generator**

Create scripts/sync-open-overview-fallback.mjs:

    import { mkdir, rename, rm, writeFile } from "node:fs/promises";
    import path from "node:path";
    import { pathToFileURL } from "node:url";
    import {
      FALLBACK_REQUESTS,
      canonicalPath,
      ENDPOINTS
    } from "../web/open-overview/open-overview-api.js";
    import {
      ContractError,
      assertPublishedRun,
      safePublicUrl,
      sha256Hex,
      validateAppModelMatrix,
      validateAppModels,
      validateFreeFrontiers,
      validateGitHubRanking,
      validateHistory,
      validateManifest,
      validateOpenRouterCollection,
      validateProviders,
      validatePublicError
    } from "../web/open-overview/open-overview-schema.js";

    const fetchJson = async (apiBase, relative, fetchImpl) => {
      const response = await fetchImpl(
        new URL("/api/public/v2" + relative, apiBase),
        { headers: { Accept: "application/json" }, credentials: "omit" }
      );
      if (!response.ok) {
        const publicError = validatePublicError(await response.json(), "2");
        throw new ContractError("http_error", publicError.error.message, { status: response.status, availability: response.status >= 500, apiCode: publicError.error.code, retryable: publicError.error.retryable });
      }
      return response.json();
    };

    const validateFor = (spec, raw) => spec.kind === "github"
      ? validateGitHubRanking(raw, "2")
      : spec.kind === "matrix"
        ? validateAppModelMatrix(raw, "2")
        : spec.kind === "appModels"
          ? validateAppModels(raw, "2")
          : spec.kind === "providers"
            ? validateProviders(raw, "2")
            : spec.kind === "freeFrontiers"
              ? validateFreeFrontiers(raw, "2")
              : spec.kind === "history"
                ? validateHistory(raw, "2")
                : validateOpenRouterCollection(raw, spec.kind, "2");

    export async function buildFallback({
      apiBase,
      outPath,
      maxAgeHours,
      requireLive,
      now = new Date(),
      fetchImpl = globalThis.fetch,
      requests = FALLBACK_REQUESTS
    }) {
      const origin = safePublicUrl(apiBase);
      if (!origin || origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash) {
        throw new Error("apiBase must be a credential-free HTTPS origin");
      }

      const rawManifest = await fetchJson(origin, ENDPOINTS.manifest, fetchImpl);
      const manifest = validateManifest(rawManifest, "2");
      if (requireLive !== true) throw new Error("Fallback generation requires --require-live");
      if (manifest.sources.some((source) => /fixture|test/i.test(source.transformVersion))) throw new Error("Fallback generation rejects fixture/test transform versions");

      const responses = {};
      const fetchedTimes = [];
      const queue = requests.slice();
      for (let index = 0; index < queue.length; index += 1) {
        const spec = queue[index];
        let raw;
        try {
          raw = await fetchJson(origin, spec.path, fetchImpl);
        } catch (error) {
          if (spec.optional && error?.details?.availability === true) continue;
          throw error;
        }
        const response = validateFor(spec, raw);
        if (spec.sourceId) assertPublishedRun(manifest, spec.sourceId, response);
        if (Array.isArray(response.provenance) && response.provenance.some((item) => /fixture|test/i.test(item.transformVersion || "") || /fixture/i.test(item.citation || ""))) throw new Error(spec.key + " contains fixture/test provenance");
        if (!spec.optional && Array.isArray(response.provenance)) for (const item of response.provenance) fetchedTimes.push(Date.parse(item.fetchedAt));
        responses[canonicalPath(spec.path)] = response;
        if (spec.key === "apps") {
          for (const app of response.data.slice(0, 10)) {
            queue.push({ key: "appModels:" + app.appId, path: ENDPOINTS.appModels(app.appId), kind: "appModels", sourceId: null, optional: true });
          }
        }
      }
      if (!fetchedTimes.length || fetchedTimes.some((value) => !Number.isFinite(value))) throw new Error("Required responses have no valid fetchedAt provenance");
      const oldestFetchedAtMs = Math.min(...fetchedTimes);
      const ageHours = (now.getTime() - oldestFetchedAtMs) / 3_600_000;
      if (ageHours < 0 || ageHours > maxAgeHours) throw new Error("The oldest required response is older than " + maxAgeHours + " hours");

      const unsigned = {
        schemaVersion: "2",
        mode: "snapshot",
        sourceApiBase: origin.origin,
        generatedAt: now.toISOString(),
        oldestFetchedAt: new Date(oldestFetchedAtMs).toISOString(),
        manifest,
        responses
      };
      const bundle = { ...unsigned, checksum: await sha256Hex(unsigned) };
      const directory = path.dirname(outPath);
      const temporary = path.join(
        directory,
        "." + path.basename(outPath) + ".tmp-" + process.pid
      );
      await mkdir(directory, { recursive: true });
      await writeFile(temporary, JSON.stringify(bundle, null, 2) + "\n", "utf8");
      try {
        await rename(temporary, outPath);
      } finally {
        await rm(temporary, { force: true });
      }
      return bundle;
    }

    export function parseCli(argv) {
      const values = new Map();
      for (let index = 0; index < argv.length; index += 1) {
        const key = argv[index];
        if (key === "--require-live") values.set(key, true);
        else if (key.startsWith("--")) values.set(key, argv[++index]);
      }
      const apiBase = values.get("--api-base");
      const outPath = values.get("--out");
      const maxAgeHours = Number(values.get("--max-age-hours"));
      if (!apiBase || !outPath || !Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
        throw new Error(
          "Usage: --api-base URL --out FILE --max-age-hours HOURS --require-live"
        );
      }
      return {
        apiBase,
        outPath: path.resolve(outPath),
        maxAgeHours,
        requireLive: values.get("--require-live") === true
      };
    }

    const invoked = process.argv[1] &&
      import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
    if (invoked) {
      buildFallback(parseCli(process.argv.slice(2)))
        .then((bundle) => {
          process.stdout.write(
            "Wrote live fallback " + bundle.checksum + " to disk\n"
          );
        })
        .catch((error) => {
          process.stderr.write(error.message + "\n");
          process.exitCode = 1;
        });
    }

- [ ] **Step 4: Add checksum verification and whole-view fallback to the API client**

In web/open-overview/open-overview-api.js, add sha256Hex to the schema import and add this exported verifier before createOpenOverviewClient:

    export async function verifyFallbackBundle(bundle, requests, schemaMajor, now = new Date()) {
      if (!bundle || Object.keys(bundle).sort().join(",") !== "checksum,generatedAt,manifest,mode,oldestFetchedAt,responses,schemaVersion,sourceApiBase" || bundle.schemaVersion !== "2" || bundle.mode !== "snapshot") {
        throw new ContractError("invalid_fallback", "Fallback metadata is invalid");
      }
      const { checksum, ...unsigned } = bundle;
      if (!/^[a-f0-9]{64}$/.test(checksum || "")) {
        throw new ContractError("invalid_fallback", "Fallback checksum is missing");
      }
      const calculated = await sha256Hex(unsigned);
      if (calculated !== checksum) {
        throw new ContractError("invalid_fallback", "Fallback checksum does not match");
      }
      const sourceApiBase = safePublicUrl(bundle.sourceApiBase);
      if (!sourceApiBase || sourceApiBase.protocol !== "https:" || sourceApiBase.pathname !== "/" || sourceApiBase.search || sourceApiBase.hash) throw new ContractError("invalid_fallback", "Fallback sourceApiBase is not public HTTPS");
      if (!Number.isFinite(Date.parse(bundle.generatedAt))) throw new ContractError("invalid_fallback", "Fallback generatedAt is invalid");
      const manifest = validateManifest(bundle.manifest, schemaMajor);
      const responses = {};
      const errors = {};
      for (const spec of requests) {
        const responseKey = canonicalPath(spec.path);
        if (!Object.hasOwn(bundle.responses, responseKey)) {
          if (spec.optional) {
            errors[spec.key] = new ContractError("unavailable", "Optional fallback response is unavailable", { path: responseKey });
            continue;
          }
          throw new ContractError("invalid_fallback", "Fallback is missing " + responseKey);
        }
        const response = spec.kind === "github"
          ? validateGitHubRanking(bundle.responses[responseKey], schemaMajor)
          : spec.kind === "matrix"
            ? validateAppModelMatrix(bundle.responses[responseKey], schemaMajor)
            : spec.kind === "appModels"
              ? validateAppModels(bundle.responses[responseKey], schemaMajor)
              : spec.kind === "providers"
                ? validateProviders(bundle.responses[responseKey], schemaMajor)
                  : spec.kind === "freeFrontiers"
                    ? validateFreeFrontiers(bundle.responses[responseKey], schemaMajor)
                    : spec.kind === "history"
                      ? validateHistory(bundle.responses[responseKey], schemaMajor)
                      : validateOpenRouterCollection(bundle.responses[responseKey], spec.kind, schemaMajor);
        if (spec.sourceId) assertPublishedRun(manifest, spec.sourceId, response);
        responses[spec.key] = response;
      }
      const oldest = Date.parse(bundle.oldestFetchedAt);
      if (!Number.isFinite(oldest)) throw new ContractError("invalid_fallback", "Fallback oldestFetchedAt is invalid");
      return Object.freeze({ ...bundle, manifest, responses: Object.freeze(responses), errors: Object.freeze(errors), snapshotStale: now.getTime() - oldest > 48 * 3_600_000 });
    }

Update the schema import:

    import {
      ContractError,
      assertPublishedRun,
      sha256Hex,
      validateAppModelMatrix,
      validateAppModels,
      validateFreeFrontiers,
      validateGitHubRanking,
      validateHistory,
      validateManifest,
      validateOpenRouterCollection,
      validateProviders,
      validatePublicError
    } from "./open-overview-schema.js";

Replace the createOpenOverviewClient signature so the fallback option is explicit:

    export function createOpenOverviewClient({
      apiBase,
      schemaMajor,
      timeoutMs,
      fallbackUrl = null,
      conditionalRequests = false,
      fetchImpl = globalThis.fetch
    }) {

Then add these functions inside it:

    async function loadFallbackView(requests) {
      if (!fallbackUrl) throw new ContractError("unavailable", "No fallback URL is configured");
      const response = await fetchImpl(fallbackUrl, {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        throw new ContractError("unavailable", "Fallback snapshot is unavailable");
      }
      const bundle = await verifyFallbackBundle(await response.json(), requests, schemaMajor);
      return Object.freeze({
        mode: "snapshot",
        manifest: bundle.manifest,
        responses: bundle.responses,
        errors: bundle.errors,
        snapshotStale: bundle.snapshotStale,
        oldestFetchedAt: bundle.oldestFetchedAt
      });
    }

Add this predicate and replace the first line of `loadView` with the guarded manifest load:

    const fallbackEligible = (error) =>
      error?.code === "timeout" ||
      error?.code === "network_unavailable" ||
      (error?.code === "http_error" && error?.details?.availability === true);

    let manifest;
    try {
      manifest = await fetchJson({ key: "manifest", path: ENDPOINTS.manifest, kind: "manifest" });
    } catch (error) {
      if (!fallbackEligible(error)) throw error;
      return loadFallbackView(requests);
    }

- [ ] **Step 5: Run the fallback tests and verify they pass**

Run:

    node --test --test-name-pattern="fallback|complete snapshot" scratch/tests/open-overview.test.js

Expected: 4 matching tests pass, 0 fail; schema drift does not request fallback, oldest-required freshness is enforced, and tests create no repository fallback file.

- [ ] **Step 6: Commit fallback code without generated test data**

Run:

    git add scripts/sync-open-overview-fallback.mjs web/open-overview/open-overview-api.js scratch/tests/open-overview.test.js
    git commit -m "feat(open-overview): add verified live fallback pipeline"

Expected: fallback-data.json is absent until the release task generates it from the approved live API.

### Task 5: Accessible table, bar, sparkline, source-state, and unavailable renderers

**Files:**

- Create: web/open-overview/open-overview-charts.js
- Modify: web/open-overview/open-overview.css
- Modify: scratch/tests/open-overview.test.js

**Interfaces:**

- Consumes: validated envelopes and safe numeric/URL helpers from Task 2.
- Produces: `barWidthBasisPoints`, `matrixCellModel`, `renderAppModelMatrix`, `renderRankTable`, `renderHorizontalBars`, `renderSparkline`, `renderSourceStates`, and `renderUnavailable`. The matrix renderer consumes only Plan 05 cells and joins labels from the already validated top-ten app/model rows; it never derives relationships from aggregate rankings.

- [ ] **Step 1: Append failing renderer-boundary and exact-value tests**

Append to scratch/tests/open-overview.test.js:

    test("chart module never uses innerHTML for upstream content", () => {
      const source = read("open-overview-charts.js");
      assert.doesNotMatch(source, /\.innerHTML\s*=/);
      assert.match(source, /textContent/);
      assert.match(source, /scope/);
    });

    test("horizontal bars preserve bigint strings in labels and geometry", async () => {
      const { barWidthBasisPoints } = await importRouteModule("open-overview-charts.js");
      assert.equal(barWidthBasisPoints("90071992547409931234", "90071992547409931234"), 10000n);
      assert.equal(barWidthBasisPoints("45035996273704965617", "90071992547409931234"), 5000n);
    });

    test("matrix model keeps an observed zero distinct from an unknown cell", async () => {
      const { matrixCellModel } = await importRouteModule("open-overview-charts.js");
      const observed = matrixCellModel({ state: "observed", totalTokens: "0", rankWithinPeriod: 1, evidenceUrl: "https://openrouter.ai/" });
      const unknown = matrixCellModel({ state: "unknown", reason: "not_observed" });
      assert.deepEqual(observed, { state: "observed", label: "0", exact: "0", rank: 1, reason: null, evidenceUrl: "https://openrouter.ai/" });
      assert.deepEqual(unknown, { state: "unknown", label: "?", exact: null, rank: null, reason: "not_observed", evidenceUrl: null });
    });

- [ ] **Step 2: Run the renderer tests and verify they fail**

Run:

    node --test --test-name-pattern="chart module|horizontal bars|matrix model" scratch/tests/open-overview.test.js

Expected: FAIL with ERR_MODULE_NOT_FOUND for open-overview-charts.js.

- [ ] **Step 3: Implement the semantic renderers**

Create web/open-overview/open-overview-charts.js:

    import {
      compactIntegerString,
      exactDecimalString,
      safePublicUrl
    } from "./open-overview-schema.js";

    const node = (document, tag, className, text) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined && text !== null) element.textContent = String(text);
      return element;
    };

    export function renderRankTable({
      document,
      title,
      rows,
      columns,
      sourceLabel,
      asOf,
      className = ""
    }) {
      const region = node(document, "section", "oo-data-region " + className);
      const heading = node(document, "h2", "oo-region-title", title);
      region.appendChild(heading);
      const meta = node(
        document,
        "p",
        "oo-region-meta",
        sourceLabel + " · as of " + (asOf || "unknown")
      );
      region.appendChild(meta);
      const scroll = node(document, "div", "oo-table-scroll");
      const table = node(document, "table", "oo-table");
      table.appendChild(node(document, "caption", "sr-only", title));
      const head = node(document, "thead");
      const headRow = node(document, "tr");
      for (const column of columns) {
        const header = node(document, "th", "", column.label);
        header.scope = "col";
        headRow.appendChild(header);
      }
      head.appendChild(headRow);
      table.appendChild(head);
      const body = node(document, "tbody");
      for (const row of rows) {
        const tr = node(document, "tr");
        columns.forEach((column, index) => {
          const cell = node(document, index === 0 ? "th" : "td");
          if (index === 0) cell.scope = "row";
          const value = column.value(row);
          const href = column.href ? safePublicUrl(column.href(row)) : null;
          if (href) {
            const link = node(document, "a", "", value);
            link.href = href.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            cell.appendChild(link);
          } else {
            cell.textContent = value === null || value === undefined ? "—" : String(value);
          }
          if (column.exact) cell.title = String(column.exact(row));
          tr.appendChild(cell);
        });
        body.appendChild(tr);
      }
      table.appendChild(body);
      scroll.appendChild(table);
      region.appendChild(scroll);
      return region;
    }

    export function barWidthBasisPoints(value, maximum) {
      const max = BigInt(maximum);
      return max === 0n ? 0n : (BigInt(value) * 10000n) / max;
    }

    export function matrixCellModel(cell) {
      if (cell.state === "observed") return Object.freeze({
        state: "observed", label: compactIntegerString(cell.totalTokens), exact: cell.totalTokens,
        rank: cell.rankWithinPeriod, reason: null, evidenceUrl: cell.evidenceUrl
      });
      return Object.freeze({ state: "unknown", label: "?", exact: null, rank: null, reason: cell.reason, evidenceUrl: null });
    }

    export function renderAppModelMatrix({ document, response, apps, models, onInspect = () => {} }) {
      if (!response || response.status === "unavailable") {
        return renderUnavailable({
          document,
          title: "Observed app/model relationships",
          reason: response
            ? "Plan 05 enrichment unavailable: " + response.reason + (response.lastSuccessAt ? " · last success " + response.lastSuccessAt : "")
            : "Plan 05 enrichment request failed; stable rankings remain available."
        });
      }
      const appNames = new Map(apps.map((row) => [row.appId, row.appName]));
      const modelNames = new Map(models.map((row) => [row.id, row.name]));
      const cells = new Map(response.cells.map((cell) => [cell.appId + "\u0000" + cell.modelId, cell]));
      const region = node(document, "section", "oo-data-region oo-matrix-region");
      region.append(
        node(document, "h2", "oo-region-title", "Observed app/model relationships"),
        node(document, "p", "oo-region-meta", response.resolvedPeriod.start + " · observed daily tokens · " + response.coverage.observedCells + "/" + response.coverage.possibleCells + " cells observed")
      );
      const scroll = node(document, "div", "oo-matrix-scroll");
      const table = node(document, "table", "oo-matrix");
      table.appendChild(node(document, "caption", "sr-only", "Top app by top model observed daily token matrix"));
      const head = node(document, "thead"); const headRow = node(document, "tr");
      const corner = node(document, "th", "", "App / model"); corner.scope = "col"; headRow.appendChild(corner);
      for (const modelId of response.modelIds) { const header = node(document, "th", "", modelNames.get(modelId) || modelId); header.scope = "col"; header.title = modelId; headRow.appendChild(header); }
      head.appendChild(headRow); table.appendChild(head);
      const body = node(document, "tbody");
      for (const appId of response.appIds) {
        const row = node(document, "tr"); const header = node(document, "th", "", appNames.get(appId) || appId); header.scope = "row"; header.title = appId; row.appendChild(header);
        for (const modelId of response.modelIds) {
          const cell = cells.get(appId + "\u0000" + modelId);
          const td = node(document, "td", "oo-matrix-cell " + (!cell ? "is-missing" : cell.state === "unknown" ? "is-unknown" : cell.totalTokens === "0" ? "is-zero" : "is-observed"));
          if (!cell) {
            td.textContent = "—"; td.title = "Cell not returned by the API";
          } else {
            const model = matrixCellModel(cell); const control = node(document, "button", "oo-matrix-control", model.label); control.type = "button";
            control.setAttribute("aria-label", (appNames.get(appId) || appId) + " and " + (modelNames.get(modelId) || modelId) + ": " + (model.state === "observed" ? model.exact + " observed tokens" : "unknown, " + model.reason));
            control.addEventListener("click", () => onInspect({ appId, modelId, cell, model })); td.appendChild(control);
          }
          row.appendChild(td);
        }
        body.appendChild(row);
      }
      table.appendChild(body); scroll.appendChild(table); region.appendChild(scroll); return region;
    }

    export function renderHorizontalBars({ document, title, rows, label, value }) {
      const region = node(document, "section", "oo-data-region oo-bars");
      region.appendChild(node(document, "h2", "oo-region-title", title));
      const list = node(document, "ol", "oo-bar-list");
      const maximum = rows.reduce(
        (largest, row) => {
          const current = BigInt(value(row));
          return current > largest ? current : largest;
        },
        0n
      );
      for (const row of rows) {
        const item = node(document, "li", "oo-bar-row");
        const text = node(document, "span", "oo-bar-label", label(row));
        const exact = String(value(row));
        const bar = node(document, "span", "oo-bar-track");
        const fill = node(document, "span", "oo-bar-fill");
        const basisPoints = barWidthBasisPoints(exact, maximum);
        fill.style.width = String(basisPoints / 100n) + "." +
          String(basisPoints % 100n).padStart(2, "0") + "%";
        bar.appendChild(fill);
        item.append(text, bar, node(document, "span", "oo-bar-value", compactIntegerString(exact)));
        list.appendChild(item);
      }
      region.appendChild(list);
      return region;
    }

    export function renderSparkline({ document, values, label }) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "oo-sparkline");
      svg.setAttribute("viewBox", "0 0 100 24");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", label);
      const parsed = values.map((raw) => { const match = String(raw).match(/^(-?)(\d+)(?:\.(\d+))?$/); if (!match) throw new TypeError("Sparkline values must be exact decimal strings"); return { negative: match[1] === "-", whole: match[2], fraction: match[3] || "" }; });
      const scale = parsed.reduce((largest, value) => Math.max(largest, value.fraction.length), 0);
      const numeric = parsed.map((value) => { const magnitude = BigInt(value.whole + value.fraction.padEnd(scale, "0")); return value.negative ? -magnitude : magnitude; });
      const minimum = numeric.reduce((smallest, value) => value < smallest ? value : smallest, numeric[0]);
      const maximum = numeric.reduce((largest, value) => value > largest ? value : largest, numeric[0]);
      const span = maximum - minimum;
      const points = numeric.map((value, index) => {
        const x = numeric.length === 1 ? 50 : (index * 100) / (numeric.length - 1);
        const verticalBasisPoints = span === 0n ? 1000n : ((value - minimum) * 2000n) / span;
        const y = 22 - Number(verticalBasisPoints) / 100;
        return x.toFixed(2) + "," + y.toFixed(2);
      }).join(" ");
      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      polyline.setAttribute("points", points);
      svg.appendChild(polyline);
      return svg;
    }

    export function renderSourceStates({ document, datasets }) {
      const list = node(document, "ul", "oo-source-list");
      for (const dataset of Object.values(datasets)) {
        const item = node(document, "li", "oo-source-row");
        item.dataset.mode = dataset.mode;
        item.dataset.freshness = dataset.freshness;
        item.dataset.completeness = dataset.completeness;
        item.append(
          node(document, "strong", "", dataset.sourceId),
          node(
            document,
            "span",
            "",
            dataset.mode + " · " + dataset.freshness + " · " + dataset.completeness
          ),
          node(document, "time", "", dataset.asOf || "as-of unknown")
        );
        list.appendChild(item);
      }
      return list;
    }

    export function renderUnavailable({ document, title, reason }) {
      const region = node(document, "section", "oo-data-region oo-unavailable");
      region.setAttribute("role", "status");
      region.append(
        node(document, "h2", "oo-region-title", title),
        node(document, "p", "", reason)
      );
      return region;
    }

- [ ] **Step 4: Add exact table, matrix, and chart styles**

Append to web/open-overview/open-overview.css:

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .oo-data-region {
      min-width: 0;
      padding: 14px;
      border-right: 1px solid var(--forest-line);
    }

    .oo-region-title {
      margin: 0;
      font: 650 15px/1.2 var(--forest-display);
      letter-spacing: -.02em;
    }

    .oo-region-meta {
      margin: 5px 0 10px;
      color: var(--forest-muted);
      font-size: 10px;
      line-height: 1.4;
    }

    .oo-table-scroll,
    .oo-matrix-scroll {
      max-width: 100%;
      overflow: auto;
      overscroll-behavior: contain;
    }

    .oo-table,
    .oo-matrix {
      width: 100%;
      border-collapse: collapse;
      color: var(--forest-soft);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }

    .oo-table th,
    .oo-table td,
    .oo-matrix th,
    .oo-matrix td {
      padding: 5px 7px;
      border-bottom: 1px solid rgba(213, 239, 215, .08);
      text-align: left;
      white-space: nowrap;
    }

    .oo-table thead th,
    .oo-matrix thead th {
      position: sticky;
      z-index: 2;
      top: 0;
      background: #08100c;
      color: var(--forest-muted);
      font-size: 9px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .oo-matrix tbody th {
      position: sticky;
      z-index: 1;
      left: 0;
      min-width: 110px;
      background: #08100c;
    }

    .oo-matrix-cell {
      width: var(--oo-cell);
      min-width: var(--oo-cell);
      padding: 0 !important;
      text-align: center !important;
    }

    .oo-matrix-control {
      width: var(--oo-cell);
      height: var(--oo-cell);
      border: 0;
      background: rgba(121, 242, 168, .08);
      color: var(--forest-soft);
      font: 700 9px/1 var(--forest-body);
      cursor: pointer;
    }

    .oo-matrix-cell.is-zero .oo-matrix-control {
      background: rgba(115, 233, 255, .05);
      color: var(--forest-muted);
    }

    .oo-matrix-cell.is-unknown .oo-matrix-control {
      background:
        repeating-linear-gradient(
          135deg,
          rgba(134, 148, 134, .08) 0 4px,
          transparent 4px 8px
        );
      color: var(--forest-muted);
    }

    .oo-bar-list {
      display: grid;
      gap: 8px;
      padding: 0;
      list-style: none;
    }

    .oo-bar-row {
      display: grid;
      grid-template-columns: minmax(100px, 1fr) minmax(90px, 2fr) auto;
      align-items: center;
      gap: 8px;
      min-height: 30px;
      font-size: 10px;
    }

    .oo-bar-track {
      height: 5px;
      overflow: hidden;
      background: rgba(255, 255, 255, .06);
    }

    .oo-bar-fill {
      display: block;
      height: 100%;
      background: var(--oo-accent);
    }

    .oo-sparkline {
      width: 90px;
      height: 24px;
      overflow: visible;
    }

    .oo-sparkline polyline {
      fill: none;
      stroke: var(--oo-cyan);
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
    }

    .oo-source-list {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .oo-source-row {
      display: grid;
      grid-template-columns: minmax(150px, 1fr) auto auto;
      gap: 12px;
      color: var(--forest-muted);
      font-size: 10px;
    }

    .oo-source-row strong {
      color: var(--forest-soft);
    }

- [ ] **Step 5: Run the renderer tests and verify they pass**

Run:

    node --test --test-name-pattern="matrix model|chart module|horizontal bars" scratch/tests/open-overview.test.js

Expected: 3 matching tests pass, 0 fail.

- [ ] **Step 6: Commit the accessible renderers**

Run:

    git add web/open-overview/open-overview-charts.js web/open-overview/open-overview.css scratch/tests/open-overview.test.js
    git commit -m "feat(open-overview): add accessible data renderers"

Expected: semantic rendering code lands before route-specific orchestration.

### Task 6: Combined overview controller and browser harness

**Files:**

- Create: scratch/tests/open-overview-static-server.mjs
- Create: scratch/tests/open-overview.playwright.config.js
- Create: scratch/tests/open-overview.browser.spec.js
- Modify: web/open-overview/open-overview.js
- Modify: web/open-overview/open-overview.css

**Interfaces:**

- Consumes: config.json, OVERVIEW_REQUESTS, createOpenOverviewClient, and Task 5 renderers.
- Produces: bootOpenOverview(options), renderSourceRail(manifest), renderOverview(view), `renderHistoryPanel(view, seriesKey, title)`, and selectors #oo-model-rail, #oo-matrix-field, #oo-app-rail, #oo-analysis-strip, #oo-history-grid, and #oo-github-grid.

- [ ] **Step 1: Create the static server and Playwright configuration**

Create scratch/tests/open-overview-static-server.mjs:

    import { createReadStream } from "node:fs";
    import { stat } from "node:fs/promises";
    import { createServer } from "node:http";
    import path from "node:path";

    const root = path.resolve(process.argv[2] || "vercel-public");
    const port = Number(process.argv[3] || 4173);
    const types = {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".mjs": "text/javascript; charset=utf-8"
    };

    const server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url, "http://127.0.0.1");
        let relative = decodeURIComponent(url.pathname);
        if (relative.endsWith("/")) relative += "index.html";
        const file = path.resolve(root, "." + relative);
        if (file !== root && !file.startsWith(root + path.sep)) {
          response.writeHead(403).end("Forbidden");
          return;
        }
        const info = await stat(file);
        const resolved = info.isDirectory() ? path.join(file, "index.html") : file;
        response.writeHead(200, {
          "Content-Type": types[path.extname(resolved)] || "application/octet-stream",
          "Cache-Control": "no-store"
        });
        createReadStream(resolved).pipe(response);
      } catch {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
      }
    });

    server.listen(port, "127.0.0.1", () => {
      process.stdout.write("Open Overview static server listening on " + port + "\n");
    });

Create scratch/tests/open-overview.playwright.config.js:

    const path = require("node:path");
    const { defineConfig, devices } = require("playwright/test");

    module.exports = defineConfig({
      testDir: __dirname,
      testMatch: "open-overview.browser.spec.js",
      timeout: 30_000,
      expect: { timeout: 5_000 },
      fullyParallel: false,
      workers: 1,
      use: {
        baseURL: "http://127.0.0.1:4173",
        trace: "retain-on-failure"
      },
      webServer: {
        command: "node open-overview-static-server.mjs ../../vercel-public 4173",
        cwd: __dirname,
        url: "http://127.0.0.1:4173/web/open-overview/index.html",
        reuseExistingServer: false,
        timeout: 15_000
      },
      projects: [{
        name: "chromium",
        use: { ...devices["Desktop Chrome"] }
      }],
      outputDir: path.join(__dirname, ".open-overview-results")
    });

- [ ] **Step 2: Write the failing combined-route browser test**

Create scratch/tests/open-overview.browser.spec.js:

    const { test, expect } = require("playwright/test");

    const RUNS = Object.freeze({
      models_current: "11111111-1111-4111-8111-111111111111",
      models_top_weekly: "22222222-2222-4222-8222-222222222222",
      apps_ranked: "33333333-3333-4333-8333-333333333333",
      task_classifications: "44444444-4444-4444-8444-444444444444",
      benchmarks_current: "55555555-5555-4555-8555-555555555555",
      models_ranked_history: "66666666-6666-4666-8666-666666666666"
    });
    const MODELS = Array.from({ length: 10 }, (_, index) => ({
      id: "vendor/model-" + (index + 1),
      canonicalSlug: "vendor/model-" + (index + 1),
      name: "Model " + (index + 1),
      description: null,
      contentTrust: "untrusted-source",
      createdUnix: String(1752451200 + index),
      contextLength: "131072",
      architecture: {},
      pricing: { prompt: "0.000001", completion: "0.000003" },
      supportedParameters: ["tools"],
      expirationDate: null,
      lifecycleState: "no_announced_expiration",
      freeKind: "paid_or_unknown",
      weeklyRank: index + 1,
      rankMethod: "response_order"
    }));
    const APPS = Array.from({ length: 10 }, (_, index) => ({
      appId: String(1000 + index),
      appName: "App " + (index + 1),
      rank: index + 1,
      totalTokens: String(10_000_000_000n - BigInt(index) * 500_000_000n),
      totalRequests: String(100_000 - index * 5_000)
    }));
    const SOURCE_BY_KIND = Object.freeze({
      models: "models_current", free: "models_current", deprecations: "models_current", providers: "models_current", freeFrontiers: "models_current",
      apps: "apps_ranked", tasks: "task_classifications", benchmarks: "benchmarks_current"
    });
    const openRouterEnvelope = (kind, data, overrides = {}) => {
      const sourceId = SOURCE_BY_KIND[kind];
      const base = {
      schemaVersion: "2.0",
      data,
      cursor: null,
      window: { start: "2026-07-14", end: "2026-07-14", timezone: "UTC", inclusive: true, basis: "source_meta" },
      completeness: { acquisitionComplete: true, populationCompleteness: kind === "apps" ? "requested_slice" : "full", missingFields: [] },
      stale: false,
      rank: kind === "models" || kind === "free"
        ? { metric: "weekly_popularity", unit: "response_order", direction: "asc", rankMethod: "response_order", baseline: null, eligiblePopulation: "10", ruleVersion: "or-models-weekly-v1", taxonomyVersion: null }
        : kind === "apps"
          ? { metric: "popular", unit: "source_units", direction: "desc", rankMethod: "source_published", baseline: null, eligiblePopulation: null, ruleVersion: "or-app-rankings-v1", taxonomyVersion: null }
          : null,
      provenance: [{ sourceId, sourceTier: "stable", runId: RUNS[sourceId], fetchedAt: "2026-07-15T00:00:00.000Z", sourceAsOf: "2026-07-14T00:00:00.000Z", transformVersion: "fixture-" + kind + "-v1", citation: "Source fixture" }]
      };
      if (kind === "free") {
        base.router = null;
        base.concreteFreeCount = String(data.length);
      }
      return { ...base, ...overrides };
    };

    const openRouterManifest = () => ({
      schemaVersion: "2.0",
      publishedAt: "2026-07-15T00:00:00.000Z",
      routes: ["/api/public/v2/manifest", "/api/public/v2/source-status", "/api/public/v2/models", "/api/public/v2/free-models", "/api/public/v2/deprecations", "/api/public/v2/apps", "/api/public/v2/tasks", "/api/public/v2/benchmarks", "/api/public/v2/history", "/api/public/v2/app-model-matrix", "/api/public/v2/apps/{id}/models", "/api/public/v2/providers", "/api/public/v2/free-frontiers"],
      sources: Object.keys(RUNS).map((sourceId) => ({
        sourceId, sourceTier: "stable", cadenceSeconds: 86400, staleAfterSeconds: 172800,
        publishedRunId: RUNS[sourceId], publishedAt: "2026-07-15T00:00:00.000Z", nextScheduledAt: "2026-07-16T00:00:00.000Z",
        stale: false, transformVersion: "fixture-" + sourceId + "-v1", citationUrl: "https://openrouter.ai/",
        lastAttemptRunId: RUNS[sourceId], lastAttemptStatus: "published", lastAttemptStartedAt: "2026-07-15T00:00:00.000Z",
        lastAttemptFinishedAt: "2026-07-15T00:00:00.000Z", lastAttemptErrorCode: null,
        lastAttemptAcquisitionComplete: true, lastAttemptPopulationCompleteness: "full"
      })),
      provenance: [],
      window: { start: null, end: null, timezone: "unknown", inclusive: null, basis: "unknown" }
    });

    const githubRankingEnvelope = ({ category = "mcp", metric = "adoption", windowDays = null, eligiblePopulation = 10 } = {}) => ({
      schemaVersion: "2.0", watermark: "77777777-7777-4777-8777-777777777777",
      coverage: { resolvedAsOf: "2026-07-15", acquisitionComplete: true, populationCompleteness: "full" },
      ranking: { metric, rankMethod: "locally_calculated", ruleVersion: "github-" + metric + "-v1", taxonomyVersion: "github-ai-v1", category, entityLevel: "project-family", eligiblePopulation, windowDays },
      data: Array.from({ length: eligiblePopulation ? 10 : 0 }, (_, index) => ({
        repositoryId: String(9_000_000_000_000_000_000n + BigInt(index)),
        fullName: "owner/repository-" + (index + 1), stars: String(50_000 - index * 1_000), forks: String(5_000 - index * 100),
        rank: index + 1, score: String((1000 - index * 50) / 1000)
      })),
      page: { limit: 10, nextCursor: null },
      provenance: [{ id: "snapshot-run", sourceUrl: "https://api.github.com/", fetchedAt: "2026-07-15T00:00:00Z" }]
    });

    const PERIOD = Object.freeze({ start: "2026-07-14", end: "2026-07-14", unit: "day", inclusive: true });
    const APP_MODEL_PROVENANCE = Object.freeze([{ sourceId: "openrouter.app-models.1000", sourceTier: "best_effort", runId: RUNS.apps_ranked, fetchedAt: "2026-07-15T00:00:00Z", sourceAsOf: "2026-07-14T00:00:00Z", transformVersion: "openrouter-app-model-daily-v1", citation: "Source: OpenRouter app page" }]);
    const appModelMatrixEnvelope = (unavailable = false) => unavailable
      ? { schemaVersion: "2.0", status: "unavailable", reason: "collection_disabled", lastSuccessAt: null, appIds: APPS.map((row) => row.appId), modelIds: MODELS.map((row) => row.id), cells: [] }
      : {
          schemaVersion: "2.0", status: "available", watermark: "matrix:2026-07-14", resolvedPeriod: PERIOD,
          appIds: APPS.map((row) => row.appId), modelIds: MODELS.map((row) => row.id),
          cells: APPS.flatMap((app, appIndex) => MODELS.map((model, modelIndex) =>
            appIndex === 9 && modelIndex === 9
              ? { state: "unknown", appId: app.appId, modelId: model.id, reason: "not_observed" }
              : { state: "observed", appId: app.appId, modelId: model.id, totalTokens: appIndex === 0 && modelIndex === 0 ? "0" : String(1_000_000_000n - BigInt(appIndex * 10 + modelIndex) * 5_000_000n), rankWithinPeriod: modelIndex + 1, period: PERIOD, metricSemantics: "observed_daily_total_tokens", evidenceUrl: "https://openrouter.ai/apps/" + app.appId }
          )),
          missingAliases: [], coverage: { observedCells: 99, possibleCells: 100, populationCompleteness: "partial_or_unknown" }, provenance: APP_MODEL_PROVENANCE
        };
    const appModelsEnvelope = (appId, unavailable = false) => unavailable
      ? { schemaVersion: "2.0", status: "unavailable", reason: "collection_disabled", lastSuccessAt: null, appId, data: [], cursor: null }
      : { schemaVersion: "2.0", status: "available", watermark: "app:" + appId + ":2026-07-14", appId, appName: APPS.find((row) => row.appId === appId)?.appName || appId, resolvedPeriod: PERIOD,
          data: MODELS.map((model, index) => ({ modelId: model.id, rank: index + 1, rankMethod: "locally_calculated", totalTokens: String(900_000_000n - BigInt(index) * 50_000_000n), metricSemantics: "observed_daily_total_tokens", evidenceUrl: "https://openrouter.ai/apps/" + appId, period: PERIOD })),
          cursor: null, coverage: { observedModels: 10, populationCompleteness: "partial_or_unknown" }, provenance: APP_MODEL_PROVENANCE };
    const providerEnvelope = () => openRouterEnvelope("providers", MODELS.map((model, index) => ({
      modelId: model.id, provider: "Provider " + (index + 1), endpoint: "provider/model-" + (index + 1), quantization: null,
      contextLength: model.contextLength, promptPrice: model.pricing.prompt, completionPrice: model.pricing.completion,
      uptime: "99.9", latency: String(300 + index), throughput: String(50 - index), status: "online",
      sourceUrl: "https://openrouter.ai/models/" + model.canonicalSlug, fetchedAt: "2026-07-15T00:00:00Z"
    })));
    const freeFrontierEnvelope = () => openRouterEnvelope("freeFrontiers", [{
      ruleVersion: "openrouter-free-pareto-v1", dimensions: { x: "benchmarkQuality", y: "medianThroughput", xDirection: "max", yDirection: "max" },
      members: MODELS.slice(0, 4).map((model, index) => ({ modelId: model.id + ":free", x: String(70 - index), y: String(50 - index) })), excluded: []
    }]);
    const historyEnvelope = (unavailable = false) => unavailable
      ? { schemaVersion: "2.0", status: "unavailable", reason: "insufficient_history", lastSuccessAt: null }
      : { schemaVersion: "2.0", status: "available", data: {
          modelUsage: ["2026-07-13", "2026-07-14"].map((date, index) => ({ date, complete: true, rows: MODELS.map((model, rank) => ({ id: model.id, label: model.name, scope: null, rank: rank + 1, value: String(1_000_000_000n - BigInt(rank * 10_000_000 + index)), remainder: rank === 0 ? "1000000" : null, stars: null, forks: null })) })),
          appRanks: ["2026-07-13", "2026-07-14"].map((date) => ({ date, complete: true, rows: APPS.map((app) => ({ id: app.appId, label: app.appName, scope: null, rank: app.rank, value: app.totalTokens, remainder: null, stars: null, forks: null })) })),
          githubRanks: ["2026-07-13", "2026-07-14"].map((date) => ({ date, complete: true, rows: githubRankingEnvelope().data.map((repo) => ({ id: repo.repositoryId, label: repo.fullName, scope: "mcp", rank: repo.rank, value: repo.score, remainder: null, stars: repo.stars, forks: repo.forks })) }))
        }, window: { start: "2026-04-16", end: "2026-07-14", timezone: "UTC", inclusive: true, basis: "query" }, completeness: { acquisitionComplete: true, populationCompleteness: "full", missingFields: [] }, stale: false, rank: null,
        provenance: [{ sourceId: "models_ranked_history", sourceTier: "stable", runId: RUNS.models_ranked_history, fetchedAt: "2026-07-15T00:00:00Z", sourceAsOf: "2026-07-14T00:00:00Z", transformVersion: "overview-history-v1", citation: "Published history" }] };

    async function routePublicV2(page, options = {}) {
      await page.route("**/api/public/v2/**", async (route) => {
        const url = new URL(route.request().url());
        let body;
        if (options.gatedEnrichmentUnavailable === true && (url.pathname.endsWith("/providers") || url.pathname.endsWith("/free-frontiers"))) {
          await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ schemaVersion: "2.0", error: { code: "SOURCE_UNAVAILABLE", message: "Source data is unavailable", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: true } }) });
          return;
        }
        if (url.pathname.endsWith("/manifest")) body = openRouterManifest();
        else if (/\/apps\/\d+\/models$/.test(url.pathname)) body = appModelsEnvelope(url.pathname.split("/").at(-2), options.appModelsUnavailable === true);
        else if (url.pathname.endsWith("/app-model-matrix")) body = appModelMatrixEnvelope(options.matrixUnavailable === true);
        else if (url.pathname.endsWith("/providers")) body = providerEnvelope();
        else if (url.pathname.endsWith("/free-frontiers")) body = freeFrontierEnvelope();
        else if (url.pathname.endsWith("/history")) body = historyEnvelope(options.historyUnavailable === true);
        else if (url.pathname.endsWith("/models")) body = openRouterEnvelope("models", MODELS);
        else if (url.pathname.endsWith("/apps")) body = openRouterEnvelope("apps", APPS);
        else if (url.pathname.endsWith("/free-models")) {
          body = openRouterEnvelope("free", MODELS.map((row) => ({ ...row, id: row.id + ":free", freeKind: "concrete_free" })));
        } else if (url.pathname.endsWith("/deprecations")) {
          body = openRouterEnvelope("deprecations", [{ modelId: "model-old", state: "scheduled_deprecation", expirationDate: "2026-08-01", firstObservedAt: "2026-07-15T00:00:00Z", lastObservedAt: "2026-07-15T00:00:00Z", evidenceRunId: RUNS.models_current }]);
        } else if (url.pathname.endsWith("/tasks")) {
          body = openRouterEnvelope("tasks", [{ tag: "code:general_impl", displayName: "Coding", macroCategory: "code", usageShare: "0.42", tokenShare: "0.48", categoryUsageShare: "0.51", categoryTokenShare: "0.55", sampled: true, absoluteVolumeAvailable: false, otherExcluded: true, topModelsComplete: false, models: [{ id: MODELS[0].id, sourcePosition: 1, usageShare: "0.55", tokenShare: "0.60" }] }]);
        } else if (url.pathname.endsWith("/benchmarks")) {
          body = openRouterEnvelope("benchmarks", [{ source: "artificial-analysis", modelPermaslug: MODELS[0].id, displayName: MODELS[0].name, matchStatus: "matched", pricing: { prompt: "0.000001", completion: "0.000003" }, citation: "Artificial Analysis", sourceUrl: "https://artificialanalysis.ai/", intelligenceIndex: 71.2, codingIndex: 65.8, agenticIndex: null }]);
        } else if (url.pathname.endsWith("/github/rankings")) {
          const metric = url.searchParams.get("metric") || "adoption";
          const windowDays = metric === "momentum"
            ? Number(url.searchParams.get("window") || "7")
            : null;
          const momentumWindows = options.momentumWindows || [];
          const eligiblePopulation = metric !== "momentum" || momentumWindows.includes(windowDays)
            ? 10
            : 0;
          body = githubRankingEnvelope({ category: url.searchParams.get("category"), metric, windowDays, eligiblePopulation });
        } else {
          await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ schemaVersion: "2.0", error: { code: "NOT_FOUND", message: "Resource not found", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: false } }) });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { ETag: '"fixture-v2"', "Access-Control-Allow-Origin": "http://127.0.0.1:4173", "Access-Control-Expose-Headers": "ETag" },
          body: JSON.stringify(body)
        });
      });
    }

    test("combined route renders two top tens, a validated 10x10 matrix, and eight GitHub strips", async ({ page }, testInfo) => {
      await routePublicV2(page);
      await page.goto("/web/open-overview/index.html");
      await expect(page.locator("#oo-model-rail tbody tr")).toHaveCount(10);
      await expect(page.locator("#oo-app-rail tbody tr")).toHaveCount(10);
      await expect(page.locator("#oo-matrix-field .oo-matrix tbody tr")).toHaveCount(10);
      await expect(page.locator("#oo-matrix-field .oo-matrix-control")).toHaveCount(100);
      await expect(page.locator("#oo-matrix-field .is-zero")).toHaveCount(1);
      await expect(page.locator("#oo-matrix-field .is-unknown")).toHaveCount(1);
      await expect(page.locator("#oo-history-grid .oo-history-panel")).toHaveCount(3);
      await expect(page.locator("#oo-history-grid .oo-sparkline")).toHaveCount(30);
      await expect(page.locator("#oo-github-grid .oo-data-region")).toHaveCount(8);
      await expect(page.locator("#oo-source-status")).toContainText("live");
      await page.screenshot({
        path: testInfo.outputPath("desktop-combined-live.png"),
        fullPage: false
      });
    });

- [ ] **Step 3: Build and run the combined browser test to verify it fails**

Run:

    npm run build
    Push-Location scratch/tests
    npm ci
    npx playwright install chromium
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium --grep "combined route"
    Pop-Location

Expected: FAIL because #oo-model-rail does not exist.

- [ ] **Step 4: Implement the combined route controller**

Replace web/open-overview/open-overview.js with:

    import {
      GITHUB_CATEGORIES,
      OVERVIEW_REQUESTS,
      createOpenOverviewClient
    } from "./open-overview-api.js";
    import {
      compactIntegerString
    } from "./open-overview-schema.js";
    import {
      renderAppModelMatrix,
      renderRankTable,
      renderSparkline,
      renderSourceStates,
      renderUnavailable
    } from "./open-overview-charts.js";

    const documentRef = document;
    const root = documentRef.getElementById("oo-view-root");
    const sourceToggle = documentRef.getElementById("oo-source-status");
    const sourcePanel = documentRef.getElementById("oo-source-panel");
    const inspector = documentRef.getElementById("oo-inspector");

    const section = (id, className) => {
      const element = documentRef.createElement("section");
      element.id = id;
      element.className = className;
      return element;
    };

    const exactOrDash = (value) =>
      value === null || value === undefined ? "—" : String(value);

    const showMatrixEvidence = ({ appId, modelId, cell, model }) => {
      const heading = documentRef.createElement("h2"); heading.textContent = "App/model evidence";
      const identity = documentRef.createElement("p"); identity.textContent = appId + " -> " + modelId;
      const detail = documentRef.createElement("p"); detail.textContent = model.state === "observed"
        ? model.exact + " observed tokens · rank " + model.rank + " · " + cell.period.start
        : "Unknown: " + model.reason;
      inspector.replaceChildren(heading, identity, detail);
      if (model.evidenceUrl) { const link = documentRef.createElement("a"); link.href = model.evidenceUrl; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "Open source evidence"; inspector.appendChild(link); }
      inspector.hidden = false;
    };

    const envelopeRows = (view, key) => {
      const envelope = view.responses[key];
      return envelope && Array.isArray(envelope.data) ? envelope.data : [];
    };

    const renderHistoryPanel = (view, seriesKey, title) => {
      const history = view.responses.history;
      if (!history || history.status === "unavailable") return renderUnavailable({ document: documentRef, title, reason: history ? history.reason : "History request failed" });
      const buckets = history.data[seriesKey].filter((bucket) => bucket.complete);
      if (buckets.length < 2) return renderUnavailable({ document: documentRef, title, reason: "insufficient_history" });
      const region = section("", "oo-data-region oo-history-panel"); const heading = documentRef.createElement("h2"); heading.className = "oo-region-title"; heading.textContent = title; region.appendChild(heading);
      for (const target of buckets.at(-1).rows.slice(0, 10)) {
        const values = buckets.map((bucket) => bucket.rows.find((row) => row.id === target.id)).filter(Boolean).map((row) => row.value ?? String(row.rank));
        if (values.length !== buckets.length) continue;
        const line = documentRef.createElement("div"); line.className = "oo-history-line"; const label = documentRef.createElement("span"); label.textContent = target.label; line.append(label, renderSparkline({ document: documentRef, values, label: target.label + " exact series: " + values.join(", ") })); region.appendChild(line);
      }
      const exact = documentRef.createElement("details"); const summary = documentRef.createElement("summary"); summary.textContent = "Exact history values"; exact.append(summary, renderRankTable({ document: documentRef, title: title + " exact values", rows: buckets.flatMap((bucket) => bucket.rows.map((row) => ({ ...row, date: bucket.date }))), sourceLabel: "Plan 04 approved-run history", asOf: buckets.at(-1).date,
        columns: [{ label: "Date", value: (row) => row.date }, { label: "Item", value: (row) => row.label }, { label: "Scope", value: (row) => exactOrDash(row.scope) }, { label: "Rank", value: (row) => exactOrDash(row.rank) }, { label: "Value", value: (row) => exactOrDash(row.value) }, { label: "Remainder", value: (row) => exactOrDash(row.remainder) }, { label: "Stars", value: (row) => exactOrDash(row.stars) }, { label: "Forks", value: (row) => exactOrDash(row.forks) }]
      })); region.appendChild(exact); return region;
    };

    const populationState = (acquisitionComplete, populationCompleteness) =>
      acquisitionComplete === false
        ? "partial"
        : populationCompleteness === "partial_or_unknown"
          ? "partial"
          : "complete";

    const sourceRows = (view) => {
      const rows = view.manifest.sources.map((source) => {
        const publishedResponse = Object.values(view.responses).find((response) =>
          Array.isArray(response?.provenance) && response.provenance.some((item) => item.sourceId === source.sourceId)
        );
        return {
          sourceId: source.sourceId,
          mode: view.mode,
          freshness: source.stale || publishedResponse?.stale || view.snapshotStale ? "stale" : "current",
          completeness: source.publishedRunId === null
            ? "unavailable"
            : publishedResponse?.completeness
              ? populationState(publishedResponse.completeness.acquisitionComplete, publishedResponse.completeness.populationCompleteness)
              : publishedResponse?.coverage
                ? "partial"
              : populationState(source.lastAttemptAcquisitionComplete ?? true, source.lastAttemptPopulationCompleteness ?? "partial_or_unknown"),
          asOf: publishedResponse?.provenance[0]?.sourceAsOf ?? source.publishedAt
        };
      });
      for (const [key, response] of Object.entries(view.responses)) {
        if (!key.startsWith("github:")) continue;
        rows.push({
          sourceId: "github.rankings." + response.ranking.metric + ":" + response.ranking.category,
          mode: view.mode,
          freshness: view.snapshotStale ? "stale" : "current",
          completeness: populationState(response.coverage.acquisitionComplete, response.coverage.populationCompleteness),
          asOf: response.coverage.resolvedAsOf
        });
      }
      return rows;
    };

    export function renderSourceRail(view) {
      const datasets = sourceRows(view);
      sourcePanel.replaceChildren(
        renderSourceStates({ document: documentRef, datasets })
      );
      const mode = view.mode;
      const freshness = datasets.some((item) => item.freshness === "stale")
        ? "stale"
        : "current";
      const completeness = datasets.some((item) => item.completeness === "unavailable")
        ? "unavailable"
        : datasets.some((item) => item.completeness === "partial")
          ? "partial"
          : "complete";
      sourceToggle.textContent = "Sources · " + mode + " · " + freshness + " · " + completeness;
    }

    const leaderboard = (id, title, rows, source, asOf, kind) => {
      const rankTable = renderRankTable({
        document: documentRef,
        title,
        rows,
        sourceLabel: source,
        asOf,
        columns: kind === "model"
          ? [
              { label: "Rank", value: (row) => row.weeklyRank },
              { label: "Model", value: (row) => row.name },
              { label: "Lifecycle", value: (row) => row.lifecycleState }
            ]
          : [
              { label: "Rank", value: (row) => row.rank },
              { label: "App", value: (row) => row.appName },
              {
                label: "Tokens",
                value: (row) => compactIntegerString(row.totalTokens),
                exact: (row) => row.totalTokens
              }
            ]
      });
      rankTable.id = id;
      return rankTable;
    };

    export function renderOverview(view) {
      root.replaceChildren();
      renderSourceRail(view);
      const field = section("oo-overview-field", "oo-overview-field");
      const models = envelopeRows(view, "models");
      const apps = envelopeRows(view, "apps");
      const modelAsOf = view.responses.models?.provenance[0]?.sourceAsOf ?? view.responses.models?.window.end ?? null;
      const appAsOf = view.responses.apps?.provenance[0]?.sourceAsOf ?? view.responses.apps?.window.end ?? null;
      field.appendChild(
        leaderboard(
          "oo-model-rail",
          "Weekly model leaders",
          models,
          "OpenRouter models_top_weekly",
          modelAsOf,
          "model"
        )
      );

      const matrix = renderAppModelMatrix({
        document: documentRef,
        response: view.responses.matrix,
        apps,
        models,
        onInspect: ({ appId, modelId, cell, model }) => showMatrixEvidence({ appId, modelId, cell, model })
      });
      matrix.id = "oo-matrix-field";
      field.appendChild(matrix);

      field.appendChild(
        leaderboard(
          "oo-app-rail",
          "Popular app leaders",
          apps,
          "OpenRouter apps_ranked",
          appAsOf,
          "app"
        )
      );
      root.appendChild(field);

      const analysis = section("oo-analysis-strip", "oo-analysis-strip");
      const summaries = [
        ["Free", envelopeRows(view, "free"), "Concrete :free variants"],
        ["Deprecations", envelopeRows(view, "deprecations"), "Observed lifecycle"],
        ["Tasks", envelopeRows(view, "tasks"), "Source 7-day sample"],
        ["Benchmarks", envelopeRows(view, "benchmarks"), "Source-separated"],
        ["Providers", envelopeRows(view, "providers"), view.errors.providers ? "Gated enrichment unavailable" : "Published endpoints"],
        ["Pareto free", envelopeRows(view, "freeFrontier"), view.errors.freeFrontier ? "Gated enrichment unavailable" : "Quality x throughput; no composite"]
      ];
      for (const [title, rows, note] of summaries) {
        const article = documentRef.createElement("article");
        article.className = "oo-micro-panel";
        const heading = documentRef.createElement("h2");
        heading.textContent = title;
        const count = documentRef.createElement("strong");
        count.textContent = String(rows.length);
        const text = documentRef.createElement("p");
        text.textContent = note;
        article.append(heading, count, text);
        analysis.appendChild(article);
      }
      root.appendChild(analysis);

      const history = section("oo-history-grid", "oo-history-grid");
      history.append(renderHistoryPanel(view, "modelUsage", "Model usage over time"), renderHistoryPanel(view, "appRanks", "App rank over time"), renderHistoryPanel(view, "githubRanks", "GitHub rank over time"));
      root.appendChild(history);

      const github = section("oo-github-grid", "oo-github-grid");
      for (const [slug, label] of GITHUB_CATEGORIES) {
        const rows = envelopeRows(view, "github:" + slug);
        github.appendChild(renderRankTable({
          document: documentRef,
          title: label,
          rows: rows.slice(0, 10),
          sourceLabel: "GitHub adoption · percent_rank",
          asOf: view.responses["github:" + slug]?.coverage.resolvedAsOf ?? null,
          columns: [
            { label: "Rank", value: (row) => row.rank },
            { label: "Project", value: (row) => row.fullName, href: (row) => "https://github.com/" + row.fullName },
            {
              label: "Stars",
              value: (row) => compactIntegerString(row.stars),
              exact: (row) => row.stars
            }
          ]
        }));
      }
      root.appendChild(github);
      root.setAttribute("aria-busy", "false");
    }

    async function readConfig(fetchImpl) {
      const response = await fetchImpl(
        "/web/open-overview/config.json",
        { credentials: "omit", cache: "no-store" }
      );
      if (!response.ok) throw new Error("Open Overview config is unavailable");
      return response.json();
    }

    export async function bootOpenOverview({
      fetchImpl = globalThis.fetch.bind(globalThis)
    } = {}) {
      sourceToggle.addEventListener("click", () => {
        const expanded = sourceToggle.getAttribute("aria-expanded") === "true";
        sourceToggle.setAttribute("aria-expanded", String(!expanded));
        sourcePanel.hidden = expanded;
      });
      try {
        const config = await readConfig(fetchImpl);
        const client = createOpenOverviewClient({
          ...config,
          fetchImpl
        });
        const route = documentRef.body.dataset.openOverviewRoute;
        if (route === "overview") {
          renderOverview(await client.loadView(OVERVIEW_REQUESTS));
        }
      } catch (error) {
        root.replaceChildren(renderUnavailable({
          document: documentRef,
          title: "Open Overview unavailable",
          reason: error.message
        }));
        root.setAttribute("aria-busy", "false");
        sourceToggle.textContent = "Sources · unavailable";
      }
    }

    bootOpenOverview();

- [ ] **Step 5: Add the combined-field layout**

Append to web/open-overview/open-overview.css:

    .oo-overview-field {
      display: grid;
      grid-template-columns: minmax(190px, .75fr) minmax(460px, 1.5fr) minmax(210px, .8fr);
      border-bottom: 1px solid var(--forest-line);
    }

    .oo-overview-field > :last-child {
      border-right: 0;
    }

    .oo-analysis-strip {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      border-bottom: 1px solid var(--forest-line);
    }

    .oo-micro-panel {
      min-height: 70px;
      padding: 10px;
      border-right: 1px solid var(--forest-line);
    }

    .oo-micro-panel h2,
    .oo-micro-panel p {
      margin: 0;
    }

    .oo-micro-panel h2 {
      color: var(--forest-muted);
      font: 700 9px/1 var(--forest-body);
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .oo-micro-panel strong {
      display: block;
      margin-top: 7px;
      font: 650 18px/1 var(--forest-display);
    }

    .oo-micro-panel p {
      margin-top: 7px;
      color: var(--forest-muted);
      font-size: 10px;
    }

    .oo-github-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .oo-history-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border-bottom: 1px solid var(--forest-line);
    }

    .oo-history-line {
      min-height: 28px;
      display: grid;
      grid-template-columns: minmax(90px, 1fr) 90px;
      align-items: center;
      gap: 6px;
      font-size: 10px;
    }

    .oo-inspector:not([hidden]) {
      position: fixed;
      z-index: 60;
      right: 16px;
      bottom: 16px;
      width: min(420px, calc(100% - 32px));
      box-shadow: 0 24px 80px rgba(0, 0, 0, .5);
    }

- [ ] **Step 6: Rebuild and run the combined browser test**

Run:

    npm run build
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium --grep "combined route"
    Pop-Location

Expected: 1 browser test passes and writes desktop-combined-live.png under scratch/tests/.open-overview-results.

- [ ] **Step 7: Commit the combined route**

Run:

    git add web/open-overview/open-overview.js web/open-overview/open-overview.css scratch/tests/open-overview-static-server.mjs scratch/tests/open-overview.playwright.config.js scratch/tests/open-overview.browser.spec.js
    git commit -m "feat(open-overview): render combined evidence view"

Expected: combined route is independently reviewable against mocked strict-v2 data.

### Task 7: Dedicated OpenRouter route and bounded section navigation

**Files:**

- Modify: web/open-overview/open-overview.js
- Modify: web/open-overview/open-overview.css
- Modify: scratch/tests/open-overview.browser.spec.js

**Interfaces:**

- Consumes: exact Plan 02 plus finalized Plan 05 ENDPOINTS, API client loadView(), validated envelopes, and the `view`, `app`, and `freeMode` query parameters.
- Produces: OPENROUTER_VIEWS, parseOpenRouterState(url), renderOpenRouter(view, state), and nine real query-linked sections.

- [ ] **Step 1: Append the failing OpenRouter browser test**

Append to scratch/tests/open-overview.browser.spec.js:

    test("OpenRouter route exposes nine sections and renders the Free contract", async ({ page }, testInfo) => {
      await routePublicV2(page);
      await page.goto("/web/open-overview/openrouter/index.html?view=free");
      await expect(page.locator(".oo-section-nav a")).toHaveCount(9);
      await expect(page.locator(".oo-section-nav a[aria-current=page]")).toHaveText("Free");
      await expect(page.locator("#oo-openrouter-content tbody tr")).toHaveCount(10);
      await expect(page.locator("#oo-openrouter-content")).toContainText(":free");
      await expect(page.locator("#oo-openrouter-content")).toContainText("openrouter/free is a router");
      await page.screenshot({
        path: testInfo.outputPath("openrouter-free.png"),
        fullPage: false
      });
    });

    test("OpenRouter route exposes Plan 05 per-app, provider, and Pareto evidence", async ({ page }) => {
      await routePublicV2(page);
      await page.goto("/web/open-overview/openrouter/index.html?view=app-to-model&app=1000");
      await expect(page.locator(".oo-app-picker a")).toHaveCount(10);
      await expect(page.getByRole("heading", { name: "App 1 model ranking" }).locator("..").locator("tbody tr")).toHaveCount(10);
      await page.goto("/web/open-overview/openrouter/index.html?view=providers");
      await expect(page.locator("#oo-openrouter-content tbody tr")).toHaveCount(10);
      await page.goto("/web/open-overview/openrouter/index.html?view=free&freeMode=pareto");
      await expect(page.locator(".oo-mode-nav a[aria-current=page]")).toHaveText("Pareto: quality x throughput");
      await expect(page.locator("#oo-openrouter-content")).toContainText("benchmarkQuality");
      await expect(page.locator("#oo-openrouter-content")).toContainText("medianThroughput");
      await expect(page.locator("#oo-openrouter-content")).not.toContainText("efficiency score");
    });

- [ ] **Step 2: Run the OpenRouter browser test and verify it fails**

Run:

    npm run build
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium --grep "OpenRouter route"
    Pop-Location

Expected: FAIL because .oo-section-nav does not exist.

- [ ] **Step 3: Add OpenRouter view state and request definitions**

In web/open-overview/open-overview.js, add ENDPOINTS to the API import and add:

    export const OPENROUTER_VIEWS = Object.freeze({
      usage: {
        label: "Usage",
        requests: [{ key: "models", path: ENDPOINTS.modelsTopWeekly, kind: "models", sourceId: "models_current" }, { key: "history", path: ENDPOINTS.history, kind: "history", sourceId: null, optional: true }]
      },
      apps: {
        label: "Apps",
        requests: [{ key: "apps", path: ENDPOINTS.appsPopular, kind: "apps", sourceId: "apps_ranked" }, { key: "history", path: ENDPOINTS.history, kind: "history", sourceId: null, optional: true }]
      },
      "app-to-model": {
        label: "App-to-Model",
        requests: [
          { key: "models", path: ENDPOINTS.modelsTopWeekly, kind: "models", sourceId: "models_current" },
          { key: "apps", path: ENDPOINTS.appsPopular, kind: "apps", sourceId: "apps_ranked" },
          { key: "matrix", path: ENDPOINTS.appModelMatrix, kind: "matrix", sourceId: null, optional: true }
        ]
      },
      free: {
        label: "Free",
        requests: [
          { key: "free", path: ENDPOINTS.freeModels, kind: "free", sourceId: "models_current" },
          { key: "freeFrontier", path: ENDPOINTS.freeFrontier, kind: "freeFrontiers", sourceId: null, optional: true }
        ]
      },
      deprecations: {
        label: "Deprecations",
        requests: [{ key: "deprecations", path: ENDPOINTS.deprecations, kind: "deprecations", sourceId: "models_current" }]
      },
      tasks: {
        label: "Tasks",
        requests: [{ key: "tasks", path: ENDPOINTS.tasks, kind: "tasks", sourceId: "task_classifications" }]
      },
      benchmarks: {
        label: "Benchmarks",
        requests: [{ key: "benchmarks", path: ENDPOINTS.benchmarks, kind: "benchmarks", sourceId: "benchmarks_current" }]
      },
      providers: {
        label: "Providers",
        requests: [{ key: "providers", path: ENDPOINTS.providers, kind: "providers", sourceId: null, optional: true }]
      },
      "source-status": {
        label: "Source Status",
        requests: []
      }
    });

    export function parseOpenRouterState(url) {
      const query = new URL(url).searchParams;
      const requested = query.get("view") || "usage";
      const appId = query.get("app");
      const freeMode = query.get("freeMode") === "pareto" ? "pareto" : "popularity";
      return Object.freeze({
        view: requested in OPENROUTER_VIEWS ? requested : "usage",
        appId: appId && /^\d{1,40}$/.test(appId) ? appId : null,
        freeMode
      });
    }

- [ ] **Step 4: Add the OpenRouter renderer and boot branch**

Add to web/open-overview/open-overview.js:

    const openRouterNav = (state) => {
      const nav = documentRef.createElement("nav");
      nav.className = "oo-section-nav";
      nav.setAttribute("aria-label", "OpenRouter sections");
      for (const [key, definition] of Object.entries(OPENROUTER_VIEWS)) {
        const link = documentRef.createElement("a");
        link.href = "/web/open-overview/openrouter/index.html?view=" + encodeURIComponent(key);
        link.textContent = definition.label;
        if (key === state.view) link.setAttribute("aria-current", "page");
        nav.appendChild(link);
      }
      return nav;
    };

    const openRouterColumns = {
      usage: [
        { label: "Rank", value: (row) => row.weeklyRank },
        { label: "Model", value: (row) => row.name },
        { label: "Lifecycle", value: (row) => row.lifecycleState }
      ],
      apps: [
        { label: "Rank", value: (row) => row.rank },
        { label: "App", value: (row) => row.appName },
        { label: "Tokens", value: (row) => compactIntegerString(row.totalTokens), exact: (row) => row.totalTokens },
        { label: "Requests", value: (row) => compactIntegerString(row.totalRequests), exact: (row) => row.totalRequests }
      ],
      free: [
        { label: "Rank", value: (row) => row.weeklyRank },
        { label: "Concrete model", value: (row) => row.id },
        { label: "Context", value: (row) => row.contextLength }
      ],
      deprecations: [
        { label: "Model", value: (row) => row.modelId },
        { label: "State", value: (row) => row.state },
        { label: "May be removed after", value: (row) => exactOrDash(row.expirationDate) }
      ],
      tasks: [
        { label: "Task", value: (row) => row.displayName },
        { label: "Usage share", value: (row) => row.usageShare },
        { label: "Token share", value: (row) => row.tokenShare }
      ],
      benchmarks: [
        { label: "Model", value: (row) => row.displayName },
        { label: "Source", value: (row) => row.source },
        { label: "Score", value: (row) => row.source === "artificial-analysis" ? exactOrDash(row.intelligenceIndex) : exactOrDash(row.elo) }
      ]
    };

    const freeModeNav = (state) => {
      const nav = documentRef.createElement("nav"); nav.className = "oo-mode-nav"; nav.setAttribute("aria-label", "Free model ranking mode");
      for (const [key, label] of [["popularity", "Weekly popularity"], ["pareto", "Pareto: quality x throughput"]]) {
        const link = documentRef.createElement("a"); link.href = "/web/open-overview/openrouter/index.html?view=free&freeMode=" + key; link.textContent = label; if (state.freeMode === key) link.setAttribute("aria-current", "page"); nav.appendChild(link);
      }
      return nav;
    };

    export function renderOpenRouter(view, state) {
      root.replaceChildren(openRouterNav(state));
      renderSourceRail(view);
      const content = section("oo-openrouter-content", "oo-route-content");
      const key = state.view === "usage" ? "models" : state.view;

      if (state.view === "source-status") {
        content.appendChild(renderSourceStates({
          document: documentRef,
          datasets: sourceRows(view)
        }));
      } else if (state.view === "app-to-model") {
        const apps = envelopeRows(view, "apps");
        const models = envelopeRows(view, "models");
        const picker = documentRef.createElement("nav"); picker.className = "oo-app-picker"; picker.setAttribute("aria-label", "Top apps");
        for (const app of apps.slice(0, 10)) { const link = documentRef.createElement("a"); link.href = "/web/open-overview/openrouter/index.html?view=app-to-model&app=" + encodeURIComponent(app.appId); link.textContent = app.rank + ". " + app.appName; if (app.appId === state.appId) link.setAttribute("aria-current", "page"); picker.appendChild(link); }
        content.appendChild(picker);
        content.appendChild(renderAppModelMatrix({ document: documentRef, response: view.responses.matrix, apps, models, onInspect: showMatrixEvidence }));
        if (state.appId) {
          const response = view.responses.appModels;
          content.appendChild(response?.status === "available" ? renderRankTable({
            document: documentRef, title: response.appName + " model ranking", rows: response.data,
            sourceLabel: "OpenRouter observed daily tokens", asOf: response.resolvedPeriod.end,
            columns: [{ label: "Rank", value: (row) => row.rank }, { label: "Model", value: (row) => row.modelId }, { label: "Tokens", value: (row) => compactIntegerString(row.totalTokens), exact: (row) => row.totalTokens }]
          }) : renderUnavailable({ document: documentRef, title: "Per-app model ranking", reason: response ? "Plan 05 enrichment unavailable: " + response.reason : "Plan 05 per-app request failed." }));
        }
      } else if (state.view === "providers") {
        const rows = envelopeRows(view, "providers");
        content.appendChild(rows.length ? renderRankTable({ document: documentRef, title: "Providers", rows, sourceLabel: "OpenRouter published endpoints", asOf: view.responses.providers?.provenance[0]?.fetchedAt ?? null,
          columns: [{ label: "Model", value: (row) => row.modelId }, { label: "Provider", value: (row) => row.provider }, { label: "Quant", value: (row) => exactOrDash(row.quantization) }, { label: "Context", value: (row) => exactOrDash(row.contextLength) }, { label: "Prompt", value: (row) => exactOrDash(row.promptPrice) }, { label: "Completion", value: (row) => exactOrDash(row.completionPrice) }, { label: "Uptime", value: (row) => exactOrDash(row.uptime) }, { label: "Latency", value: (row) => exactOrDash(row.latency) }, { label: "Throughput", value: (row) => exactOrDash(row.throughput) }, { label: "Status", value: (row) => exactOrDash(row.status) }]
        }) : renderUnavailable({ document: documentRef, title: "Providers", reason: "Plan 05 provider enrichment is unavailable (" + (view.errors.providers?.details?.apiCode || "unavailable") + "); no provider values are inferred." }));
      } else if (state.view === "free" && state.freeMode === "pareto") {
        const controls = freeModeNav(state); content.appendChild(controls);
        const frontier = envelopeRows(view, "freeFrontier")[0];
        content.appendChild(frontier ? renderRankTable({ document: documentRef, title: "Free Pareto frontier", rows: frontier.members, sourceLabel: frontier.ruleVersion + " · " + frontier.dimensions.x + " " + frontier.dimensions.xDirection + " x " + frontier.dimensions.y + " " + frontier.dimensions.yDirection, asOf: view.responses.freeFrontier?.window.end ?? null,
          columns: [{ label: "Model", value: (row) => row.modelId }, { label: frontier.dimensions.x, value: (row) => row.x }, { label: frontier.dimensions.y, value: (row) => row.y }]
        }) : renderUnavailable({ document: documentRef, title: "Free Pareto frontier", reason: "Plan 05 frontier enrichment is unavailable (" + (view.errors.freeFrontier?.details?.apiCode || "unavailable") + "). Popularity remains available; no composite efficiency score is substituted." }));
      } else {
        const rows = envelopeRows(view, key);
        content.appendChild(renderRankTable({
          document: documentRef,
          title: OPENROUTER_VIEWS[state.view].label,
          rows,
          sourceLabel: "OpenRouter public v2",
          asOf: view.responses[key]?.provenance[0]?.sourceAsOf ?? view.responses[key]?.window.end ?? null,
          columns: openRouterColumns[state.view]
        }));
        if (state.view === "usage") content.appendChild(renderHistoryPanel(view, "modelUsage", "Model usage over time"));
        if (state.view === "apps") content.appendChild(renderHistoryPanel(view, "appRanks", "App rank over time"));
        if (state.view === "free") {
          content.prepend(freeModeNav(state));
          const note = documentRef.createElement("p");
          note.className = "oo-router-note";
          note.textContent = "openrouter/free is a router and is never counted as a concrete :free model.";
          content.appendChild(note);
        }
      }
      root.appendChild(content);
      root.setAttribute("aria-busy", "false");
    }

Replace the route dispatch inside bootOpenOverview with:

    if (route === "overview") {
      renderOverview(await client.loadView(OVERVIEW_REQUESTS));
    } else if (route === "openrouter") {
      const state = parseOpenRouterState(globalThis.location.href);
      const definition = OPENROUTER_VIEWS[state.view];
      const requests = definition.requests.slice();
      if (state.view === "app-to-model" && state.appId) requests.push({ key: "appModels", path: ENDPOINTS.appModels(state.appId), kind: "appModels", sourceId: null, optional: true });
      renderOpenRouter(await client.loadView(requests), state);
    }

- [ ] **Step 5: Add compact section navigation styles**

Append to web/open-overview/open-overview.css:

    .oo-section-nav {
      display: flex;
      gap: 7px;
      overflow-x: auto;
      padding: 12px;
      border-bottom: 1px solid var(--forest-line);
    }

    .oo-section-nav a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      flex: 0 0 auto;
      padding: 0 13px;
      border: 1px solid var(--forest-line);
      color: var(--forest-muted);
      font: 700 9px/1 var(--forest-body);
      letter-spacing: .08em;
      text-decoration: none;
      text-transform: uppercase;
    }

    .oo-section-nav a[aria-current="page"] {
      border-color: rgba(121, 242, 168, .5);
      color: var(--forest-ink);
      background: rgba(121, 242, 168, .08);
    }

    .oo-app-picker,
    .oo-mode-nav {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 8px 12px;
      border-bottom: 1px solid var(--forest-line);
    }

    .oo-app-picker a,
    .oo-mode-nav a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      flex: 0 0 auto;
      padding: 0 10px;
      border: 1px solid var(--forest-line);
      color: var(--forest-muted);
      font-size: 10px;
      text-decoration: none;
    }

    .oo-app-picker a[aria-current="page"],
    .oo-mode-nav a[aria-current="page"] {
      border-color: rgba(121, 242, 168, .5);
      color: var(--forest-ink);
    }

    .oo-route-content {
      padding: 0;
    }

    .oo-router-note {
      margin: 0;
      padding: 14px;
      border-top: 1px solid var(--forest-line);
      color: var(--forest-muted);
      font-size: 11px;
      line-height: 1.6;
    }

- [ ] **Step 6: Rebuild and run the OpenRouter browser test**

Run:

    npm run build
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium --grep "OpenRouter route"
    Pop-Location

Expected: 2 browser tests pass; the first writes openrouter-free.png and the second proves exact per-app, provider, and Pareto contracts.

- [ ] **Step 7: Commit the dedicated OpenRouter route**

Run:

    git add web/open-overview/open-overview.js web/open-overview/open-overview.css scratch/tests/open-overview.browser.spec.js
    git commit -m "feat(open-overview): add OpenRouter evidence sections"

Expected: all nine sections are reachable through real query-linked anchors.

### Task 8: Dedicated GitHub route and three responsive compositions

**Files:**

- Modify: web/open-overview/open-overview.js
- Modify: web/open-overview/open-overview.css
- Modify: scratch/tests/open-overview.browser.spec.js

**Interfaces:**

- Consumes: GITHUB_CATEGORIES, ENDPOINTS.githubRanking(), exact Plan 04 history, Adoption/Momentum/Maintenance ranked responses with ranking.windowDays and ranking.eligiblePopulation, and URL query parameters category, metric, and window.
- Produces: parseGithubState(url), renderGithub(view, state), a single-level eight-category control, three ranking choices, independently gated 7/30/90-day Momentum choices, four explicit facets, and Models/Apps/Matrix mobile segments on the combined route.

- [ ] **Step 1: Append failing GitHub and responsive browser tests**

Append to scratch/tests/open-overview.browser.spec.js:

    test("GitHub route exposes eight categories and the percent-rank adoption contract", async ({ page }, testInfo) => {
      await routePublicV2(page);
      await page.goto("/web/open-overview/github/index.html?category=mcp&metric=adoption");
      await expect(page.locator(".oo-category-list a")).toHaveCount(8);
      await expect(page.locator(".oo-ranking-nav > *")).toHaveCount(3);
      await expect(page.locator(".oo-ranking-nav a")).toHaveCount(2);
      await expect(page.locator('.oo-ranking-nav [aria-disabled="true"]')).toHaveText("Momentum");
      await expect(page.locator(".oo-momentum-windows > *")).toHaveCount(3);
      await expect(page.locator('.oo-momentum-windows [aria-disabled="true"]')).toHaveCount(3);
      await expect(page.locator("#oo-github-content tbody tr")).toHaveCount(10);
      await expect(page.locator("#oo-github-content")).toContainText("percent_rank");
      await expect(page.locator("#oo-github-content")).toContainText("raw stars and forks");
      await expect(page.locator("#oo-github-content")).toContainText("github-adoption-v1");
      await expect(page.locator("#oo-github-content")).toContainText("Eligible population: 10");
      await page.screenshot({
        path: testInfo.outputPath("github-mcp-adoption.png"),
        fullPage: false
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      const categorySummary = page.locator(".oo-category-sheet > summary");
      await expect(categorySummary).toBeVisible();
      await expect(page.locator(".oo-category-list")).toBeHidden();
      await categorySummary.click();
      await expect(page.locator(".oo-category-list a").first()).toBeVisible();
    });

    test("portrait overview exposes all data through three 44px segments", async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await routePublicV2(page);
      await page.goto("/web/open-overview/index.html");
      await expect(page.locator(".oo-mobile-segments button")).toHaveCount(3);
      await expect(page.locator(".oo-mobile-segments button").first()).toHaveCSS("min-height", "44px");
      await page.getByRole("button", { name: "Matrix" }).click();
      await expect(page.locator("#oo-matrix-field")).toBeVisible();
      await expect(page.locator("#oo-model-rail")).toBeHidden();
      await page.screenshot({
        path: testInfo.outputPath("portrait-combined-matrix.png"),
        fullPage: false
      });
    });

- [ ] **Step 2: Run the GitHub and portrait tests and verify they fail**

Run:

    npm run build
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium --grep "GitHub route|portrait overview"
    Pop-Location

Expected: both tests fail because the category sheet, gated Momentum state, and mobile segments do not exist.

- [ ] **Step 3: Add strict GitHub URL state and renderer**

Add to web/open-overview/open-overview.js:

    const GITHUB_METRICS = Object.freeze([
      ["adoption", "Adoption"],
      ["momentum", "Momentum"],
      ["maintenance", "Maintenance"]
    ]);

    const GITHUB_FACETS = Object.freeze([
      "Maturity",
      "Interoperability",
      "Openness",
      "Confidence"
    ]);

    export function parseGithubState(url) {
      const query = new URL(url).searchParams;
      const allowedCategories = new Set(GITHUB_CATEGORIES.map(([slug]) => slug));
      const allowedMetrics = new Set(GITHUB_METRICS.map(([slug]) => slug));
      const allowedWindows = new Set([7, 30, 90]);
      const category = query.get("category") || GITHUB_CATEGORIES[0][0];
      const metric = query.get("metric") || "adoption";
      const requestedWindow = Number(query.get("window") || "7");
      return Object.freeze({
        category: allowedCategories.has(category) ? category : GITHUB_CATEGORIES[0][0],
        metric: allowedMetrics.has(metric) ? metric : "adoption",
        windowDays: allowedWindows.has(requestedWindow) ? requestedWindow : 7
      });
    }

    const githubControls = (state, view) => {
      const controls = documentRef.createElement("div");
      controls.className = "oo-github-controls";
      const categorySheet = documentRef.createElement("details");
      categorySheet.className = "oo-category-sheet";
      const categorySummary = documentRef.createElement("summary");
      categorySummary.textContent = "Categories";
      const categories = documentRef.createElement("nav");
      categories.className = "oo-category-list";
      categories.setAttribute("aria-label", "GitHub categories");
      for (const [slug, label] of GITHUB_CATEGORIES) {
        const link = documentRef.createElement("a");
        link.href = "/web/open-overview/github/index.html?category=" +
          encodeURIComponent(slug) + "&metric=" + encodeURIComponent(state.metric);
        link.textContent = label;
        if (slug === state.category) link.setAttribute("aria-current", "page");
        categories.appendChild(link);
      }
      const categoryMedia = globalThis.matchMedia("(max-width: 760px)");
      categorySheet.open = !categoryMedia.matches;
      categoryMedia.addEventListener("change", (event) => {
        categorySheet.open = !event.matches;
      });
      categorySheet.append(categorySummary, categories);

      const rankings = documentRef.createElement("nav");
      rankings.className = "oo-ranking-nav";
      rankings.setAttribute("aria-label", "GitHub ranking");
      const availableMomentumWindows = [7, 30, 90].filter((windowDays) => {
        const response = view.responses["momentum:" + windowDays];
        return response?.ranking?.metric === "momentum" &&
          response.ranking.windowDays === windowDays &&
          response.ranking.eligiblePopulation > 0 &&
          response.coverage.acquisitionComplete === true &&
          response.coverage.populationCompleteness === "full";
      });
      for (const [slug, label] of GITHUB_METRICS) {
        if (slug === "momentum" && availableMomentumWindows.length === 0) {
          const unavailable = documentRef.createElement("span");
          unavailable.textContent = label;
          unavailable.setAttribute("aria-disabled", "true");
          unavailable.title = "Requires a fully covered 7, 30, or 90-day window";
          rankings.appendChild(unavailable);
          continue;
        }
        const link = documentRef.createElement("a");
        link.href = "/web/open-overview/github/index.html?category=" +
          encodeURIComponent(state.category) + "&metric=" + encodeURIComponent(slug) +
          (slug === "momentum"
            ? "&window=" + encodeURIComponent(
                availableMomentumWindows.includes(state.windowDays)
                  ? state.windowDays
                  : availableMomentumWindows[0]
              )
            : "");
        link.textContent = label;
        if (slug === state.metric) link.setAttribute("aria-current", "page");
        rankings.appendChild(link);
      }

      const momentumWindows = documentRef.createElement("nav");
      momentumWindows.className = "oo-momentum-windows";
      momentumWindows.setAttribute("aria-label", "Momentum window");
      for (const windowDays of [7, 30, 90]) {
        if (!availableMomentumWindows.includes(windowDays)) {
          const unavailable = documentRef.createElement("span");
          unavailable.textContent = windowDays + " days";
          unavailable.setAttribute("aria-disabled", "true");
          unavailable.title = "No fully covered " + windowDays + "-day population";
          momentumWindows.appendChild(unavailable);
          continue;
        }
        const link = documentRef.createElement("a");
        link.href = "/web/open-overview/github/index.html?category=" +
          encodeURIComponent(state.category) + "&metric=momentum&window=" + windowDays;
        link.textContent = windowDays + " days";
        if (state.metric === "momentum" && state.windowDays === windowDays) {
          link.setAttribute("aria-current", "page");
        }
        momentumWindows.appendChild(link);
      }

      const facets = documentRef.createElement("div");
      facets.className = "oo-facet-list";
      facets.setAttribute("aria-label", "GitHub evidence facets");
      for (const label of GITHUB_FACETS) {
        const facet = documentRef.createElement("span");
        facet.textContent = label + " facet";
        facets.appendChild(facet);
      }
      controls.append(categorySheet, rankings, momentumWindows, facets);
      return controls;
    };

    export function renderGithub(view, state) {
      const envelope = view.responses.ranking;
      root.replaceChildren(githubControls(state, view));
      renderSourceRail(view);
      const content = section("oo-github-content", "oo-route-content");
      const rows = envelope && Array.isArray(envelope.data) ? envelope.data : [];
      const definition = GITHUB_METRICS.find(([slug]) => slug === state.metric)[1];
      content.appendChild(renderRankTable({
        document: documentRef,
        title: definition + " · " +
          GITHUB_CATEGORIES.find(([slug]) => slug === state.category)[1],
        rows,
        sourceLabel: "GitHub project-family ranking",
        asOf: envelope?.coverage.resolvedAsOf ?? null,
        columns: [
          { label: "Rank", value: (row) => row.rank },
          { label: "Project", value: (row) => row.fullName, href: (row) => "https://github.com/" + row.fullName },
          { label: "Stars", value: (row) => compactIntegerString(row.stars), exact: (row) => row.stars },
          { label: "Forks", value: (row) => compactIntegerString(row.forks), exact: (row) => row.forks },
          { label: definition, value: (row) => exactOrDash(row.score) }
        ]
      }));
      const rankingMeta = documentRef.createElement("p");
      rankingMeta.className = "oo-ranking-meta";
      rankingMeta.textContent = envelope?.ranking
        ? envelope.ranking.rankMethod + " · " + envelope.ranking.ruleVersion +
          " · Taxonomy: " + envelope.ranking.taxonomyVersion +
          " · Eligible population: " + envelope.ranking.eligiblePopulation
        : "Ranking metadata unavailable";
      content.appendChild(rankingMeta);
      const method = documentRef.createElement("p");
      method.className = "oo-ranking-method";
      method.textContent = state.metric === "adoption"
        ? "Adoption = 0.75 × percent_rank(log1p(stars)) + 0.25 × percent_rank(log1p(forks)); raw stars and forks remain visible."
        : state.metric === "momentum"
          ? "Momentum requires a fully covered 7, 30, or 90-day window; incomplete windows are ineligible."
          : "Maintenance is a recency ranking using default-branch commit and stable-release evidence, not a health score.";
      content.appendChild(method);
      content.appendChild(renderHistoryPanel(view, "githubRanks", "GitHub rank over time"));
      root.appendChild(content);
      root.setAttribute("aria-busy", "false");
    }

Add this branch to bootOpenOverview after the OpenRouter branch:

    else if (route === "github") {
      const state = parseGithubState(globalThis.location.href);
      const request = {
        key: "ranking",
        path: ENDPOINTS.githubRanking(
          state.category,
          state.metric,
          state.metric === "momentum" ? state.windowDays : null
        ),
        kind: "github",
        sourceId: null
      };
      const momentumAvailability = [7, 30, 90].map((windowDays) => ({
        key: "momentum:" + windowDays,
        path: ENDPOINTS.githubRanking(state.category, "momentum", windowDays, 1),
        kind: "github",
        sourceId: null,
        optional: true
      }));
      renderGithub(await client.loadView([request, ...momentumAvailability, { key: "history", path: ENDPOINTS.history, kind: "history", sourceId: null, optional: true }]), state);
    }

- [ ] **Step 4: Add the combined-route mobile segment controls**

At the beginning of renderOverview(), immediately after root.replaceChildren(), add:

    const segments = documentRef.createElement("div");
    segments.className = "oo-mobile-segments";
    segments.setAttribute("role", "group");
    segments.setAttribute("aria-label", "Combined overview data");
    for (const [key, label] of [
      ["models", "Models"],
      ["apps", "Apps"],
      ["matrix", "Matrix"]
    ]) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset.segment = key;
      button.setAttribute("aria-pressed", String(key === "models"));
      button.addEventListener("click", () => {
        for (const control of segments.querySelectorAll("button")) {
          control.setAttribute(
            "aria-pressed",
            String(control.dataset.segment === key)
          );
        }
        field.dataset.mobileSegment = key;
      });
      segments.appendChild(button);
    }
    root.appendChild(segments);

After each of the three field children is created, add these exact attributes:

    field.querySelector("#oo-model-rail").dataset.mobilePanel = "models";
    field.querySelector("#oo-matrix-field").dataset.mobilePanel = "matrix";
    field.querySelector("#oo-app-rail").dataset.mobilePanel = "apps";
    field.dataset.mobileSegment = "models";

- [ ] **Step 5: Add GitHub and responsive CSS**

Append to web/open-overview/open-overview.css:

    .oo-github-controls {
      display: grid;
      gap: 10px;
      padding: 12px;
      border-bottom: 1px solid var(--forest-line);
    }

    .oo-category-list,
    .oo-ranking-nav,
    .oo-momentum-windows,
    .oo-facet-list {
      display: flex;
      gap: 7px;
      overflow-x: auto;
    }

    .oo-category-list a,
    .oo-ranking-nav a,
    .oo-ranking-nav span[aria-disabled="true"],
    .oo-momentum-windows a,
    .oo-momentum-windows span[aria-disabled="true"],
    .oo-facet-list span,
    .oo-mobile-segments button {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      flex: 0 0 auto;
      padding: 0 12px;
      border: 1px solid var(--forest-line);
      background: rgba(255, 255, 255, .025);
      color: var(--forest-muted);
      font: 700 9px/1 var(--forest-body);
      letter-spacing: .06em;
      text-decoration: none;
      text-transform: uppercase;
    }

    .oo-category-sheet > summary {
      display: none;
    }

    .oo-ranking-nav span[aria-disabled="true"],
    .oo-momentum-windows span[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: .48;
    }

    .oo-category-list a[aria-current="page"],
    .oo-ranking-nav a[aria-current="page"],
    .oo-momentum-windows a[aria-current="page"],
    .oo-mobile-segments button[aria-pressed="true"] {
      border-color: rgba(121, 242, 168, .5);
      color: var(--forest-ink);
      background: rgba(121, 242, 168, .08);
    }

    .oo-ranking-meta,
    .oo-ranking-method {
      margin: 0;
      padding: 14px;
      border-top: 1px solid var(--forest-line);
      color: var(--forest-muted);
      font-size: 11px;
      line-height: 1.6;
    }

    .oo-mobile-segments {
      display: none;
      gap: 7px;
      padding: 10px;
      border-bottom: 1px solid var(--forest-line);
    }

    @media (max-width: 760px) {
      .oo-category-sheet > summary {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        padding: 0 12px;
        border: 1px solid var(--forest-line);
        background: rgba(255, 255, 255, .025);
        color: var(--forest-ink);
        font: 700 9px/1 var(--forest-body);
        letter-spacing: .06em;
        text-transform: uppercase;
        cursor: pointer;
      }

      .oo-category-sheet[open] > .oo-category-list {
        margin-top: 7px;
      }

      .oo-mobile-segments {
        display: flex;
      }

      .oo-overview-field {
        display: block;
      }

      .oo-overview-field [data-mobile-panel] {
        display: none;
        border-right: 0;
      }

      .oo-overview-field[data-mobile-segment="models"] [data-mobile-panel="models"],
      .oo-overview-field[data-mobile-segment="apps"] [data-mobile-panel="apps"],
      .oo-overview-field[data-mobile-segment="matrix"] [data-mobile-panel="matrix"] {
        display: block;
      }

      .oo-analysis-strip {
        display: flex;
        overflow-x: auto;
      }

      .oo-micro-panel {
        min-width: 170px;
      }

      .oo-github-grid {
        grid-template-columns: 1fr;
      }

      .oo-source-row {
        grid-template-columns: 1fr;
      }
    }

    @media (orientation: landscape) and (max-height: 430px) {
      .oo-topbar {
        position: relative;
        min-height: 54px;
        grid-template-columns: auto 1fr auto;
      }

      .oo-destinations {
        grid-column: auto;
        grid-row: auto;
      }

      .oo-header {
        display: none;
      }

      .oo-page {
        padding-top: 8px;
      }

      .oo-overview-field[data-mobile-segment="matrix"] #oo-matrix-field {
        max-height: calc(100vh - 128px);
      }
    }

- [ ] **Step 6: Rebuild and run the GitHub and portrait tests**

Run:

    npm run build
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium --grep "GitHub route|portrait overview"
    Pop-Location

Expected: 2 browser tests pass and write github-mcp-adoption.png and portrait-combined-matrix.png.

- [ ] **Step 7: Commit GitHub and responsive composition**

Run:

    git add web/open-overview/open-overview.js web/open-overview/open-overview.css scratch/tests/open-overview.browser.spec.js
    git commit -m "feat(open-overview): add GitHub rankings and mobile compositions"

Expected: desktop, portrait, and landscape rules are route-local and no shared stylesheet changes.

### Task 9: Dynamically gated route-local Three.js relationship panel

**Files:**

- Create: web/open-overview/open-overview-three.js
- Modify: web/open-overview/open-overview.js
- Modify: web/open-overview/open-overview.css
- Modify: scratch/tests/open-overview.test.js
- Modify: scratch/tests/open-overview.browser.spec.js

**Interfaces:**

- Consumes: exact observed Plan 05 matrix cells plus exact Plan 03 GitHub category ranking rows already loaded for the overview and the route-owned `#oo-network-region` host. It draws app-to-model and category-to-returned-repository edges in separate layers; it never draws a cross-source edge or turns an unknown matrix cell into an edge.
- Produces: deterministicLayout(id, index, total, side), mountRelationshipCanopy(options), and a controller shaped as { setActive(active), updateSelection(ids), destroy() }.

- [ ] **Step 1: Append failing Three.js isolation and deterministic-layout tests**

Append to scratch/tests/open-overview.test.js:

    test("route-local Three.js module is isolated and deterministic", async () => {
      const source = read("open-overview-three.js");
      assert.match(source, /\/web\/vendor\/three\/three\.module\.min\.js/);
      assert.doesNotMatch(source, /web\/shared\/forest-three/);
      const { deterministicLayout } =
        await importRouteModule("open-overview-three.js");
      assert.deepEqual(
        deterministicLayout("repository:1", 2, 10, "repository"),
        deterministicLayout("repository:1", 2, 10, "repository")
      );
    });

    test("main route does not statically import the Three.js module", () => {
      const source = read("open-overview.js");
      assert.doesNotMatch(
        source,
        /from\s+["']\.\/open-overview-three\.js["']/
      );
      assert.match(source, /import\("\.\/open-overview-three\.js"\)/);
    });

- [ ] **Step 2: Append failing browser network-gate tests**

Append to scratch/tests/open-overview.browser.spec.js:

    test("reduced motion never requests the Three.js vendor module", async ({ page }) => {
      const vendorRequests = [];
      page.on("request", (request) => {
        if (request.url().includes("/web/vendor/three/three.module.min.js")) {
          vendorRequests.push(request.url());
        }
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await routePublicV2(page);
      await page.goto("/web/open-overview/index.html");
      await page.locator("#oo-network-region").scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      expect(vendorRequests).toEqual([]);
      await expect(page.locator("#oo-network-region")).toContainText("tables remain authoritative");
    });

    test("normal motion loads Three.js only after the adjacent panel intersects", async ({ page }) => {
      const vendorRequests = [];
      page.on("request", (request) => {
        if (request.url().includes("/web/vendor/three/three.module.min.js")) {
          vendorRequests.push(request.url());
        }
      });
      await routePublicV2(page);
      await page.goto("/web/open-overview/index.html");
      expect(vendorRequests).toEqual([]);
      await page.locator("#oo-network-region").scrollIntoViewIfNeeded();
      await expect.poll(
        () => page.evaluate(() => Boolean(window.__openOverviewThreeDebug?.loaded))
      ).toBe(true);
      expect(vendorRequests).toHaveLength(1);
      await expect(page.locator("#oo-network-region canvas")).toHaveCount(1);
      const debug = await page.evaluate(() => window.__openOverviewThreeDebug);
      expect(debug.nodes).toBe(32);
      expect(debug.edges).toBe(103);
    });

    test("Save-Data requires explicit opt-in before requesting Three.js", async ({ page }) => {
      await page.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }));
      let vendorRequests = 0;
      page.on("request", (request) => { if (request.url().includes("/web/vendor/three/three.module.min.js")) vendorRequests += 1; });
      await routePublicV2(page);
      await page.goto("/web/open-overview/index.html");
      await expect(page.getByRole("button", { name: "Load ecosystem map" })).toBeVisible();
      await page.waitForTimeout(250);
      expect(vendorRequests).toBe(0);
    });

    test("missing WebGL never requests the Three.js vendor", async ({ page }) => {
      await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
      let vendorRequests = 0;
      page.on("request", (request) => { if (request.url().includes("/web/vendor/three/three.module.min.js")) vendorRequests += 1; });
      await routePublicV2(page);
      await page.goto("/web/open-overview/index.html");
      await expect(page.locator("#oo-network-region")).toContainText("tables remain authoritative");
      expect(vendorRequests).toBe(0);
    });

- [ ] **Step 3: Run the Three.js tests and verify they fail**

Run:

    node --test --test-name-pattern="Three.js" scratch/tests/open-overview.test.js
    npm run build
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium --grep "Three.js"
    Pop-Location

Expected: Node test fails because open-overview-three.js does not exist; browser tests fail because no vendor request or fallback explanation exists.

- [ ] **Step 4: Implement the deterministic bounded Three.js module**

Create web/open-overview/open-overview-three.js:

    const hash32 = (text) => {
      let hash = 2166136261;
      for (const character of String(text)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };

    export function deterministicLayout(id, index, total, side) {
      const hash = hash32(id);
      const progress = total <= 1 ? 0.5 : index / (total - 1);
      const x = side === "app" ? -3.2 : side === "model" ? -0.8 : side === "category" ? 1.0 : 3.2;
      const y = 2.5 - progress * 5;
      const z = ((hash % 1000) / 999 - 0.5) * 1.2;
      return Object.freeze({ x, y, z });
    }

    export async function mountRelationshipCanopy({
      host,
      graph,
      maxNodes = 32,
      maxEdges = 110
    }) {
      const THREE = await import("/web/vendor/three/three.module.min.js");
      const width = Math.max(320, host.clientWidth);
      const height = Math.max(260, host.clientHeight);
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "low-power"
      });
      renderer.setPixelRatio(Math.min(
        matchMedia("(pointer: coarse)").matches ? 1.5 : 1.75,
        devicePixelRatio || 1
      ));
      renderer.setSize(width, height, false);
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.tabIndex = -1;
      renderer.domElement.style.pointerEvents = "none";
      host.replaceChildren(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 40);
      camera.position.set(0, 0, 11);
      const group = new THREE.Group();
      scene.add(group);
      const ambient = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambient);

      const entities = graph.nodes.slice(0, maxNodes).map((item, index, rows) => ({
        ...item,
        position: deterministicLayout(item.id, index, rows.length, item.kind)
      }));
      const positions = new Map();
      const nodeMeshes = new Map();
      const geometry = new THREE.SphereGeometry(0.11, 10, 8);
      for (const entity of entities) {
        const material = new THREE.MeshBasicMaterial({
          color: entity.kind === "app" ? 0xf4c86b : entity.kind === "model" ? 0x79f2a8 : entity.kind === "category" ? 0xa9b2ff : 0x73e9ff,
          transparent: true,
          opacity: 0.88
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(entity.position.x, entity.position.y, entity.position.z);
        mesh.userData.entityId = String(entity.id);
        positions.set(String(entity.id), mesh.position.clone());
        nodeMeshes.set(String(entity.id), mesh);
        group.add(mesh);
      }

      const linePoints = [];
      for (const edge of graph.edges.slice(0, maxEdges)) {
        const start = positions.get(String(edge.sourceId));
        const end = positions.get(String(edge.targetId));
        if (start && end) linePoints.push(start, end);
      }
      if (linePoints.length) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0x9dcfa9,
          transparent: true,
          opacity: 0.18
        });
        group.add(new THREE.LineSegments(lineGeometry, lineMaterial));
      }

      let active = true;
      let frame = 0;
      let animationFrame = 0;
      let wakeUntil = performance.now() + 600;
      let disposed = false;

      const debug = {
        loaded: true,
        running: true,
        frames: 0,
        nodes: entities.length,
        edges: linePoints.length / 2,
        disposed: false
      };
      window.__openOverviewThreeDebug = debug;

      const render = (time) => {
        if (disposed || !active || document.hidden) {
          debug.running = false;
          animationFrame = 0;
          return;
        }
        const progress = Math.min(1, Math.max(0, 1 - (wakeUntil - time) / 600));
        group.scale.setScalar(0.94 + progress * 0.06);
        renderer.render(scene, camera);
        debug.frames = ++frame;
        if (time < wakeUntil) {
          animationFrame = requestAnimationFrame(render);
        } else {
          debug.running = false;
          animationFrame = 0;
        }
      };

      const wake = () => {
        if (disposed || !active || document.hidden) return;
        wakeUntil = performance.now() + 600;
        if (!animationFrame) {
          debug.running = true;
          animationFrame = requestAnimationFrame(render);
        }
      };

      const resize = () => {
        const nextWidth = Math.max(320, host.clientWidth);
        const nextHeight = Math.max(260, host.clientHeight);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight, false);
        wake();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      const visibility = () => {
        if (!document.hidden) wake();
      };
      document.addEventListener("visibilitychange", visibility);
      renderer.domElement.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        host.dataset.webglState = "lost";
        destroy();
      }, { once: true });

      const setActive = (value) => {
        active = Boolean(value);
        if (!active && animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
          debug.running = false;
        } else if (active) {
          wake();
        }
      };

      const updateSelection = (ids) => {
        const selected = new Set(ids.map(String));
        for (const [id, mesh] of nodeMeshes) {
          mesh.scale.setScalar(selected.has(id) ? 1.9 : 1);
          mesh.material.opacity = selected.size === 0 || selected.has(id) ? 0.9 : 0.28;
        }
        wake();
      };

      function destroy() {
        if (disposed) return;
        disposed = true;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        scene.traverse((object) => {
          if (object.geometry && object.geometry !== geometry) object.geometry.dispose();
          if (object.material) object.material.dispose();
        });
        geometry.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        debug.running = false;
        debug.disposed = true;
      }

      wake();
      return Object.freeze({ setActive, updateSelection, destroy });
    }

- [ ] **Step 5: Add capability/intersection gates to the main controller**

Add to web/open-overview/open-overview.js:

    const supportsWebGL = () => {
      try {
        const canvas = documentRef.createElement("canvas");
        return Boolean(
          canvas.getContext("webgl2") || canvas.getContext("webgl")
        );
      } catch {
        return false;
      }
    };

    const reducedMotion = () =>
      new URL(globalThis.location.href).searchParams.get("motion") === "reduce" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    const buildRelationshipGraph = (view) => {
      const nodes = [];
      const edges = [];
      const seen = new Set();
      const matrix = view.responses.matrix;
      if (matrix?.status === "available") {
        for (const appId of matrix.appIds) { const id = "app:" + appId; seen.add(id); nodes.push({ id, label: appId, kind: "app" }); }
        for (const modelId of matrix.modelIds) { const id = "model:" + modelId; seen.add(id); nodes.push({ id, label: modelId, kind: "model" }); }
        for (const cell of matrix.cells.filter((item) => item.state === "observed").sort((a, b) => a.rankWithinPeriod - b.rankWithinPeriod || a.appId.localeCompare(b.appId) || a.modelId.localeCompare(b.modelId)).slice(0, 100)) edges.push({ sourceId: "app:" + cell.appId, targetId: "model:" + cell.modelId });
      }
      const categories = GITHUB_CATEGORIES.map(([slug, label]) => ({ slug, label, response: view.responses["github:" + slug] })).filter((item) => item.response);
      for (const category of categories) { const id = "category:" + category.slug; seen.add(id); nodes.push({ id, label: category.label, kind: "category" }); }
      for (let rowIndex = 0; nodes.length < 32 && rowIndex < 10; rowIndex += 1) {
        for (const category of categories) {
          const row = category.response.data[rowIndex]; if (!row || nodes.length >= 32) continue;
          const repositoryId = "repository:" + row.repositoryId;
          if (!seen.has(repositoryId)) { seen.add(repositoryId); nodes.push({ id: repositoryId, label: row.fullName, kind: "repository" }); if (edges.length < 110) edges.push({ sourceId: "category:" + category.slug, targetId: repositoryId }); }
        }
      }
      return Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
    };

    async function mountThreeNow(host, graph) {
      const module = await import("./open-overview-three.js");
      return module.mountRelationshipCanopy({ host, graph });
    }

    export function installThreeEnhancement(view, config) {
      const host = documentRef.getElementById("oo-network-region");
      const graph = buildRelationshipGraph(view);
      host.replaceChildren();
      if (!config.threeEnabled || graph.nodes.length === 0 || reducedMotion() || !supportsWebGL()) {
        const note = documentRef.createElement("p");
        note.className = "oo-network-note";
        note.textContent = "Relationship map omitted; the semantic matrix and GitHub ranking tables remain authoritative.";
        host.appendChild(note);
        return;
      }

      const load = async () => {
        host.dataset.threeState = "loading";
        try {
          const controller = await mountThreeNow(host, graph);
          host.dataset.threeState = "ready";
          const activeObserver = new IntersectionObserver(([entry]) => {
            controller.setActive(entry.isIntersecting);
          });
          activeObserver.observe(host);
          window.addEventListener("pagehide", () => {
            activeObserver.disconnect();
            controller.destroy();
          }, { once: true });
        } catch {
          const note = documentRef.createElement("p");
          note.className = "oo-network-note";
          note.textContent = "WebGL map unavailable; the semantic matrix and GitHub ranking tables remain authoritative.";
          host.replaceChildren(note);
          host.dataset.threeState = "failed";
        }
      };

      if (navigator.connection && navigator.connection.saveData) {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = "oo-load-map";
        button.textContent = "Load ecosystem map";
        button.addEventListener("click", () => {
          button.remove();
          load();
        }, { once: true });
        host.appendChild(button);
        return;
      }

      const loadObserver = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        loadObserver.disconnect();
        load();
      }, { rootMargin: "100px" });
      loadObserver.observe(host);
    }

Change renderOverview to accept config:

    export function renderOverview(view, config) {

At the end of renderOverview, after root.setAttribute("aria-busy", "false"), add:

    installThreeEnhancement(view, config);

Change the overview boot call to:

    renderOverview(await client.loadView(OVERVIEW_REQUESTS), config);

- [ ] **Step 6: Add the bounded panel styles**

Append to web/open-overview/open-overview.css:

    .oo-network-region {
      position: relative;
      min-height: 300px;
      overflow: hidden;
      background:
        radial-gradient(circle at 50% 50%, rgba(121, 242, 168, .08), transparent 60%),
        rgba(8, 15, 12, .74);
    }

    .oo-network-region canvas {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 300px;
      pointer-events: none;
    }

    .oo-network-note {
      margin: 0;
      padding: 24px;
      color: var(--forest-muted);
      line-height: 1.6;
    }

    .oo-load-map {
      min-height: 44px;
      margin: 24px;
      padding: 0 16px;
      border: 1px solid rgba(121, 242, 168, .5);
      background: rgba(121, 242, 168, .08);
      color: var(--forest-ink);
      font: 700 10px/1 var(--forest-body);
      letter-spacing: .08em;
      text-transform: uppercase;
    }

- [ ] **Step 7: Run the Three.js tests and verify they pass**

Run:

    node --test --test-name-pattern="Three.js" scratch/tests/open-overview.test.js
    npm run build
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium --grep "Three.js"
    Pop-Location

Expected: 2 Node tests and 4 browser tests pass; reduced motion, Save-Data without opt-in, and missing WebGL make no vendor request; normal motion loads exactly once after intersection.

- [ ] **Step 8: Commit the route-local Three.js enhancement**

Run:

    git add web/open-overview/open-overview-three.js web/open-overview/open-overview.js web/open-overview/open-overview.css scratch/tests/open-overview.test.js scratch/tests/open-overview.browser.spec.js
    git commit -m "feat(open-overview): add gated relationship canopy"

Expected: no import or edit under web/shared and no Three.js request before the gate.

### Task 10: Route acceptance, accessibility states, and inherited-failure guard

**Files:**

- Create: scratch/tests/assert-sdforest-baseline.mjs
- Modify: scratch/tests/open-overview.test.js
- Modify: scratch/tests/open-overview.browser.spec.js

**Interfaces:**

- Consumes: the complete built route, strict API fixtures, existing sdforest-redesign.test.js, and Playwright server from Task 6.
- Produces: one green route suite, one green browser suite, and a baseline guard that exits zero only when exactly the two approved inherited tests fail.

- [ ] **Step 1: Append failing built-output and leak tests**

Append to scratch/tests/open-overview.test.js:

    test("production build contains all canonical routes and route-local assets", () => {
      const output = path.join(ROOT, "vercel-public", "web", "open-overview");
      for (const relative of [
        "index.html",
        "openrouter/index.html",
        "github/index.html",
        "open-overview.css",
        "open-overview.js",
        "open-overview-api.js",
        "open-overview-schema.js",
        "open-overview-charts.js",
        "open-overview-three.js",
        "config.json"
      ]) {
        assert.equal(
          fs.existsSync(path.join(output, ...relative.split("/"))),
          true,
          relative + " is absent from vercel-public"
        );
      }
    });

    test("route assets contain no credential or private-data field names", () => {
      const files = [
        "config.json",
        "open-overview.js",
        "open-overview-api.js",
        "open-overview-schema.js",
        "open-overview-charts.js",
        "open-overview-three.js"
      ];
      const forbidden = /OPENROUTER_API_KEY|GITHUB_TOKEN|DATABASE_URL|CRON_SECRET|sender|subject|snippet|threadId|accessCode/i;
      for (const file of files) {
        assert.doesNotMatch(read(file), forbidden, file);
      }
    });

- [ ] **Step 2: Append browser tests for typed unavailable, exact request inventory, landscape, and direct-route states**

Append to scratch/tests/open-overview.browser.spec.js:

    test("typed app-model unavailability leaves both stable leaderboards usable", async ({ page }, testInfo) => {
      await routePublicV2(page, { matrixUnavailable: true });
      await page.goto("/web/open-overview/index.html");
      await expect(page.locator("#oo-model-rail tbody tr")).toHaveCount(10);
      await expect(page.locator("#oo-app-rail tbody tr")).toHaveCount(10);
      await expect(page.locator("#oo-matrix-field")).toContainText("collection_disabled");
      await page.screenshot({
        path: testInfo.outputPath("desktop-matrix-unavailable.png"),
        fullPage: false
      });
    });

    test("gated provider and frontier failures render typed unavailable states", async ({ page }) => {
      await routePublicV2(page, { gatedEnrichmentUnavailable: true });
      await page.goto("/web/open-overview/openrouter/index.html?view=providers");
      await expect(page.locator("#oo-openrouter-content")).toContainText("provider enrichment is unavailable");
      await expect(page.locator("#oo-openrouter-content")).toContainText("SOURCE_UNAVAILABLE");
      await page.goto("/web/open-overview/openrouter/index.html?view=free&freeMode=pareto");
      await expect(page.locator("#oo-openrouter-content")).toContainText("frontier enrichment is unavailable");
      await expect(page.locator("#oo-openrouter-content")).toContainText("no composite efficiency score");
    });

    test("overview requests the reviewed Plan 04 history and Plan 05 enrichment endpoints", async ({ page }) => {
      const requested = [];
      page.on("request", (request) => requested.push(new URL(request.url()).pathname));
      await routePublicV2(page);
      await page.goto("/web/open-overview/index.html");
      expect(requested).toContain("/api/public/v2/app-model-matrix");
      expect(requested).toContain("/api/public/v2/providers");
      expect(requested).toContain("/api/public/v2/free-frontiers");
      expect(requested).toContain("/api/public/v2/history");
    });

    test("landscape matrix remains reachable without a modal", async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 844, height: 390 });
      await routePublicV2(page);
      await page.goto("/web/open-overview/index.html");
      await page.getByRole("button", { name: "Matrix" }).click();
      await expect(page.locator("#oo-matrix-field")).toBeVisible();
      await expect(page.locator("#oo-matrix-field .oo-matrix")).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath("landscape-matrix.png"),
        fullPage: false
      });
    });

    test("three canonical deep links and assets return HTTP 200", async ({ request }) => {
      const paths = [
        "/web/open-overview/index.html",
        "/web/open-overview/openrouter/index.html",
        "/web/open-overview/github/index.html",
        "/web/open-overview/open-overview.css",
        "/web/open-overview/open-overview.js"
      ];
      for (const path of paths) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(200);
      }
    });

    test("schema-major mismatch fails closed with an unavailable diagnostic", async ({ page }) => {
      await page.route("**/api/public/v2/**", async (route) => {
        const body = envelope([], { schemaVersion: "3.0" });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body)
        });
      });
      await page.goto("/web/open-overview/index.html");
      await expect(page.locator("#oo-view-root")).toContainText("Expected schema major 2");
      await expect(page.locator("#oo-source-status")).toContainText("unavailable");
    });

- [ ] **Step 3: Run build and acceptance tests to expose remaining failures**

Run:

    npm run build
    node --test scratch/tests/open-overview.test.js
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium
    Pop-Location

Expected before the test-only fixes in this task:

- Node built-output test passes after npm run build.
- Browser request-boundary test proves the exact reviewed Plan 04 history and Plan 05 matrix/provider/frontier endpoints are contacted.
- Landscape test reveals any selector/layout mismatch directly.

- [ ] **Step 4: Verify native Enter/Space activation without adding a duplicate handler**

Run:

    npm run build
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium --grep "reviewed Plan 04 history"
    Pop-Location

Expected: PASS. Keep the existing click and arrow-key listeners unchanged; do not synthesize Enter or Space in keydown because a native button already activates through click exactly once.

- [ ] **Step 5: Create the inherited-failure guard**

Create scratch/tests/assert-sdforest-baseline.mjs:

    import assert from "node:assert/strict";
    import { spawnSync } from "node:child_process";
    import path from "node:path";
    import { fileURLToPath } from "node:url";

    const here = path.dirname(fileURLToPath(import.meta.url));
    const root = path.resolve(here, "../..");
    const target = path.join(here, "sdforest-redesign.test.js");
    const expectedFailures = [
      "public council exposes exactly two truthful modes",
      "TinyLM standalone route redirects into Councils"
    ].sort();
    const run = spawnSync(
      process.execPath,
      ["--test", "--test-reporter=tap", target],
      {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024
      }
    );
    const output = (run.stdout || "") + (run.stderr || "");
    const failures = Array.from(
      output.matchAll(/^not ok \d+ - (.+)$/gm),
      (match) => match[1].trim()
    ).sort();

    assert.equal(run.status, 1, "baseline suite must currently exit 1");
    assert.deepEqual(failures, expectedFailures);
    assert.match(output, /# tests 11/);
    assert.match(output, /# pass 9/);
    assert.match(output, /# fail 2/);
    process.stdout.write("SD Forest inherited baseline guard passed\n");

- [ ] **Step 6: Run all local acceptance commands**

Run:

    npm run build
    node --test scratch/tests/open-overview.test.js
    node scratch/tests/assert-sdforest-baseline.mjs
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium
    Pop-Location

Expected:

- Open Overview Node suite: all pass.
- Baseline guard: prints SD Forest inherited baseline guard passed and exits 0.
- Playwright: all tests pass.
- Review images exist for desktop live, typed matrix unavailable, OpenRouter Free, GitHub Adoption, portrait unavailable-region composition, landscape unavailable-region composition, and reduced-motion fallback.

- [ ] **Step 7: Commit route acceptance coverage**

Run:

    git add scratch/tests/open-overview.test.js scratch/tests/open-overview.browser.spec.js scratch/tests/assert-sdforest-baseline.mjs
    git commit -m "test(open-overview): guard route and inherited baselines"

Expected: the direct failing inherited suite is never used as a green command; the guard owns its approved failure set.

### Task 11: Final budgets, live fallback, immutable-home proof, and preview-only deployment

**Files:**

- Generate and commit: web/open-overview/fallback-data.json
- Verify only: all production and test files from Tasks 1-10
- Do not modify: index.html, web/shared/**, build-vercel-static.cjs, vercel.json

**Interfaces:**

- Consumes: approved OPEN_OVERVIEW_API_BASE, Vercel authentication, the separate preview project sdforest-open-overview-preview, and the completed test suites.
- Produces: a live-derived fallback with provenance/checksum, a branch-preview URL, before/after live-homepage hashes, and zero production alias changes.

- [ ] **Step 1: Run the full clean verification on Node 22.x**

Run:

    node --version
    npm ci
    npm --prefix scratch/tests ci
    npm run build
    node --test scratch/tests/open-overview.test.js
    node scratch/tests/assert-sdforest-baseline.mjs
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium
    Pop-Location

Expected:

- node --version begins with v22.
- Build exits 0.
- Both green test commands and the baseline guard exit 0.
- Playwright emits no console/page/network failure.

- [ ] **Step 2: Verify the route budget and immutable-home boundary**

Run:

    @'
    const fs = require("node:fs");
    const path = require("node:path");
    const zlib = require("node:zlib");
    const root = process.cwd();
    const files = [
      "web/open-overview/open-overview.js",
      "web/open-overview/open-overview-api.js",
      "web/open-overview/open-overview-schema.js",
      "web/open-overview/open-overview-charts.js",
      "web/open-overview/open-overview.css"
    ];
    const bytes = Buffer.concat(files.map((file) => fs.readFileSync(path.join(root, file))));
    const gzipBytes = zlib.gzipSync(bytes, { level: 9 }).length;
    if (gzipBytes >= 100 * 1024) {
      throw new Error("Core route exceeds 100KB gzip: " + gzipBytes);
    }
    process.stdout.write("Core route gzip bytes: " + gzipBytes + "\n");
    '@ | node -
    git diff --exit-code origin/main -- index.html web/shared/
    git diff --check

Expected:

- Core route is below 102400 gzip bytes, excluding open-overview-three.js and the vendored module.
- No homepage/shared diff.
- No whitespace errors.

- [ ] **Step 3: Generate the production-candidate fallback from the approved live API**

Run:

    node scripts/sync-open-overview-fallback.mjs --api-base $env:OPEN_OVERVIEW_API_BASE --out web/open-overview/fallback-data.json --max-age-hours 48 --require-live
    if ($LASTEXITCODE -ne 0) { throw "Live fallback generation failed" }
    $fallback = Get-Content -LiteralPath web/open-overview/fallback-data.json -Raw | ConvertFrom-Json
    if ($fallback.mode -ne "snapshot" -or $fallback.schemaVersion -ne "2") {
      throw "Fallback metadata is invalid"
    }
    if ($fallback.checksum -notmatch "^[a-f0-9]{64}$") {
      throw "Fallback checksum is invalid"
    }

Expected: the command prints one SHA-256 checksum and creates a live-derived snapshot. Any fixture, mixed watermark, missing response, or age greater than 48 hours exits nonzero.

- [ ] **Step 4: Rebuild and retest the exact fallback-bearing artifact**

Run:

    npm run build
    node --test scratch/tests/open-overview.test.js
    node scratch/tests/assert-sdforest-baseline.mjs
    Push-Location scratch/tests
    npx playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium
    Pop-Location
    Test-Path -LiteralPath vercel-public/web/open-overview/fallback-data.json

Expected: every test remains green and the final command returns True.

- [ ] **Step 5: Commit the generated live snapshot**

Run:

    git add web/open-overview/fallback-data.json
    git commit -m "chore(open-overview): add live fallback snapshot"

Expected: the committed file is public-v2 data only and contains no fixture or credential field.

- [ ] **Step 6: Record the live homepage before-state**

Run:

    $liveUrl = "https://www.sdforest.site/"
    $beforeResponse = Invoke-WebRequest -Uri $liveUrl -UseBasicParsing
    if ($beforeResponse.StatusCode -ne 200) { throw "Live homepage is not healthy" }
    $beforeBytes = [Text.Encoding]::UTF8.GetBytes($beforeResponse.Content)
    $beforeHash = [Convert]::ToHexString(
      [Security.Cryptography.SHA256]::HashData($beforeBytes)
    ).ToLowerInvariant()
    $beforeRequestId = $beforeResponse.Headers["x-vercel-id"]
    "Homepage before hash: $beforeHash"
    "Homepage before request identity: $beforeRequestId"

Expected: HTTP 200, a 64-character hash, and the current Vercel request identity. Do not mislabel x-vercel-id as a deployment identifier.

- [ ] **Step 7: Link only the separate preview project and deploy without production flags**

Run only after explicit preview-deployment approval:

    $previewProject = "sdforest-open-overview-preview"
    npx vercel project inspect $previewProject *> $null
    if ($LASTEXITCODE -ne 0) {
      npx vercel project add $previewProject
      if ($LASTEXITCODE -ne 0) { throw "Could not create the isolated preview project" }
    }
    npx vercel link --yes --project sdforest-open-overview-preview
    $project = Get-Content -LiteralPath .vercel/project.json -Raw | ConvertFrom-Json
    if ($project.projectName -ne "sdforest-open-overview-preview") {
      throw "Worktree is linked to the wrong Vercel project"
    }
    $deployOutput = npx vercel deploy --yes 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($deployOutput -join [Environment]::NewLine) }
    $previewUrl = (
      $deployOutput |
      Select-String -Pattern "^https://[^ ]+\.vercel\.app" |
      Select-Object -Last 1
    ).Matches.Value
    if (-not $previewUrl) { throw "Preview URL was not found" }
    if ($previewUrl -match "sdforest\.site") { throw "Production hostname is forbidden" }
    "Preview URL: $previewUrl"

Expected: the linked project is exactly sdforest-open-overview-preview and deployment returns a vercel.app URL. No command contains --prod or changes an alias.

- [ ] **Step 8: Smoke-test the preview and prove the live homepage is unchanged**

Run:

    foreach ($path in @(
      "/web/open-overview/index.html",
      "/web/open-overview/openrouter/index.html",
      "/web/open-overview/github/index.html",
      "/web/open-overview/open-overview.css",
      "/web/open-overview/open-overview.js",
      "/web/open-overview/fallback-data.json"
    )) {
      $response = Invoke-WebRequest -Uri ($previewUrl + $path) -UseBasicParsing
      if ($response.StatusCode -ne 200) { throw "$path returned $($response.StatusCode)" }
    }
    $previewCors = Invoke-WebRequest -Method Get -Uri ($env:OPEN_OVERVIEW_API_BASE.TrimEnd("/") + "/api/public/v2/manifest") -Headers @{ Origin = $previewUrl; Accept = "application/json" } -UseBasicParsing
    if ($previewCors.Headers["Access-Control-Allow-Origin"] -ne $previewUrl) {
      throw "The deployed preview origin is not allow-listed by public-v2 CORS"
    }
    if ($previewCors.Headers["Access-Control-Expose-Headers"] -notmatch "(?i)etag") {
      throw "The deployed preview cannot read public-v2 ETag"
    }
    $afterResponse = Invoke-WebRequest -Uri $liveUrl -UseBasicParsing
    $afterBytes = [Text.Encoding]::UTF8.GetBytes($afterResponse.Content)
    $afterHash = [Convert]::ToHexString(
      [Security.Cryptography.SHA256]::HashData($afterBytes)
    ).ToLowerInvariant()
    if ($afterHash -ne $beforeHash) {
      throw "Live homepage changed during preview deployment"
    }
    git diff --exit-code origin/main -- index.html web/shared/

Expected:

- All six preview resources return HTTP 200.
- The exact generated preview origin receives `Access-Control-Allow-Origin` and exposed `ETag`; a guessed project hostname is never substituted.
- The production homepage hash is unchanged.
- The shared/homepage diff remains empty.

- [ ] **Step 9: Stop at the preview-review gate**

Do not promote production in this plan. Report:

    git status --short --branch
    git log --oneline origin/main..HEAD
    npx vercel inspect $previewUrl

Expected handoff:

- Feature branch and commit list.
- Preview URL and Vercel deployment identity.
- Live homepage before/after SHA-256 match.
- Full test counts and review-image paths.
- Fallback as-of, retrieval time, mode, checksum, and age.
- Explicit statement that no production alias or homepage/shared file changed.

## Requirement-to-task trace

- Route isolation, canonical paths, static build, and no-JavaScript orientation: Task 1.
- Schema-major, Plan 04 history, Plan 05 enrichment, source state, precision, and untrusted content: Task 2.
- Timeout, ETag/304 ownership, CORS-facing headers, watermark retry, and no credentials: Task 3.
- Live-only generated fallback, checksum, age, atomic replacement, and no live/snapshot mixing: Task 4.
- Semantic tables/SVG, exact values, strict URLs, source states, and typed unavailability: Task 5.
- Combined top-ten rails, observed-or-typed-unavailable 10x10 matrix, six-panel analysis strip, three exact-history charts, eight top-ten GitHub summaries, and source rail: Task 6.
- Nine OpenRouter destinations, per-app rankings, provider evidence, popularity-default free ranking, explicit Pareto dimensions, and history views: Task 7.
- Reproducible percent_rank Adoption, validated ranking metadata, independently gated 7/30/90-day Momentum choices, GitHub categories/facets, portrait and landscape compositions: Task 8.
- Dynamic route-local Three.js for verified app-model and GitHub layers, deterministic evidence, lifecycle disposal, capability and preference gates: Task 9.
- Deep-link, exact-request, unavailable, schema mismatch, screenshot, and inherited-failure verification: Task 10.
- Node 22, bundle budgets, generated live artifact, immutable-home proof, and preview-only safety: Task 11.

## Plan Self-Review

- Spec coverage: all three canonical static routes, exact Plan 02/03 stable state, Plan 04 approved-run history, Plan 05 matrix/per-app/provider/frontier state, ETag/run-coherence/fallback behavior, compact responsive compositions, semantic tables/SVG, typed unavailable states, separate-layer relationship Three.js, generated live fallback, baseline failure guard, and preview-only release safety map to Tasks 1-11.
- Source pins: every ranking and integration decision is pinned to SD Forest commit 5c276f3a5e72b2b5bc5cdc04431d4ebbc9e4f4f0, upstream archive/API spec commit 8daa26d1a53a2211bd684c287f3ca6388ba2ee6d, and upstream implementation-plan commit 16629753dd7d7f1253a572bdcee38e045907eeb2; Adoption uses percent_rank with the reviewed 0.75/0.25 weights.
- Type consistency: bigint identifiers, counts, token totals, and exact decimals remain strings; OpenRouter uses Plan 02 collection metadata, history uses Plan 04 `available|insufficient_history`, app-model uses Plan 05 `available|unavailable` plus observed/unknown cells, and GitHub uses Plan 03 `ranking`/`coverage`/`watermark`; the adapter never aliases the contracts.
- Boundary safety: every production edit is route-local or explicitly allow-listed, homepage/shared bytes are guarded before and after preview, and no task contains a production deploy or alias command.
- Placeholder scan: no unresolved marker, generic placeholder, invented endpoint, or deferred implementation instruction remains; each task names exact files, code, commands, expected red/green results, and a focused commit.
- Verification closure: Node contract tests, Playwright desktop/portrait/landscape/accessibility/network checks, route budget checks, the exact inherited-failure guard, live-derived fallback verification, and immutable-home hashing all run against the built artifact before the preview-review gate.

## Execution checkpoint

After this plan is committed, execute it with one of these required skills:

1. superpowers:subagent-driven-development — recommended; one fresh implementation subagent per task with review gates.
2. superpowers:executing-plans — inline batches with explicit checkpoints after each task.

Do not begin either path until the upstream implementation preflight passes.
