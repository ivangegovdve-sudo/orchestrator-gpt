const { test, expect } = require("playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const bundle = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../web/open-dashboard/fallback-data.json"), "utf8"));
const canonical = (input) => {
  const url = new URL(input, "https://snapshot.invalid");
  const sorted = new URLSearchParams(Array.from(url.searchParams.entries()).sort(([a,av],[b,bv]) => a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  return url.pathname + (sorted.size ? `?${sorted}` : "");
};
const currentFixtureAliases = new Map([
  [canonical("/live-models?limit=500"), canonical("/models?limit=10&rank_source=top-weekly")],
  [canonical("/models?limit=100&rank_source=none"), canonical("/models?limit=10&rank_source=top-weekly")],
  [canonical("/apps?limit=25&period=30d&sort=popular"), canonical("/apps?limit=10&period=30d&sort=popular")],
  [canonical("/history?window=90d&limit=25"), canonical("/history?window=90d&limit=10")],
  [canonical("/benchmarks?limit=100"), canonical("/benchmarks?limit=50")],
  [canonical("/deprecations?limit=200"), canonical("/deprecations?limit=50")],
]);
async function routeApi(page, options = {}) {
  const handler = async (route) => {
    if (options.offline) { await route.abort("failed"); return; }
    const url = new URL(route.request().url()); const relative = url.pathname.replace(/^.*(?:\/api\/public\/v2|\/__open_dashboard_api)/, "") + url.search;
    const fixtureKey = canonical(relative);
    let body = relative.startsWith("/manifest")
      ? bundle.manifest
      : bundle.responses[fixtureKey] || bundle.responses[currentFixtureAliases.get(fixtureKey)];
    if (relative.startsWith("/price-changes?")) {
      body = {
        schemaVersion: "2.0",
        status: "available",
        data: [],
        cursor: null,
        window: { start: "2026-07-09", end: "2026-07-15", timezone: "UTC", inclusive: true, basis: "source_meta" },
        completeness: { acquisitionComplete: true, populationCompleteness: "complete", missingFields: [] },
        provenance: [{ sourceId: "prices_current", sourceTier: "stable", runId: "66666666-6666-4666-8666-666666666666", fetchedAt: "2026-07-15T10:00:00.000Z", sourceAsOf: "2026-07-15T00:00:00.000Z", transformVersion: "deterministic-preview-snapshot-v1", citation: "Deterministic browser fixture" }],
      };
    }
    if (relative.startsWith("/benchmarks") && options.benchmarkState === "failed") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ schemaVersion: "2.0", error: { code: "BENCHMARK_SOURCE_FAILED", message: "Benchmark source failed", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: true } }) });
      return;
    }
    if (relative.startsWith("/benchmarks") && options.benchmarkState === "empty") {
      body = structuredClone(bundle.responses[canonical("/benchmarks?limit=50")]);
      body.data = [];
      body.cursor = null;
    }
    if (relative.startsWith("/history?") && options.eligibleHistory && body?.status === "available") {
      body = structuredClone(body); body.window.end = "2026-07-16";
      for (const series of Object.values(body.data)) { const latest = structuredClone(series.at(-1)); latest.date = "2026-07-16"; series.push(latest); }
    }
    if (relative.startsWith("/deprecations?") && options.lifecycleEvidence && body) {
      body = structuredClone(body);
      body.data = [{ modelId: "example/model", state: "scheduled_deprecation", expirationDate: "2026-08-01", firstObservedAt: "2026-07-01T00:00:00.000Z", lastObservedAt: "2026-07-15T00:00:00.000Z", evidenceRunId: "11111111-1111-4111-8111-111111111111" }];
    }
    if (relative.startsWith("/app-model-matrix") && options.matrixUnavailable) body = { schemaVersion: "2.0", status: "unavailable", reason: "collection_disabled", lastSuccessAt: null, stale: false, staleAfterSeconds: 172800, completeness: { acquisitionComplete: false, populationCompleteness: "partial_or_unknown", missingFields: ["collection_disabled"] }, provenance: [], appIds: bundle.responses[canonical("/apps?limit=10&period=30d&sort=popular")].data.map((row) => row.appId), modelIds: bundle.responses[canonical("/models?limit=10&rank_source=top-weekly")].data.map((row) => row.id), cells: [] };
    if (relative.startsWith("/app-model-matrix") && options.malformedMatrix) body = { ...body, cells: [...body.cells.slice(0, -1), body.cells[0]] };
    if (relative.startsWith("/app-model-matrix") && options.threeStates) { body = structuredClone(body); body.cells = body.cells.map((cell, index) => index < 2 ? cell : ({ state: "unknown", appId: cell.appId, modelId: cell.modelId, reason: index === 2 ? "not_published" : "not_observed" })); body.coverage.observedCells = 2; body.coverage.possibleCells = body.appIds.length * body.modelIds.length; body.coverage.unmappedObservations = 138; body.unmappedModels = [{ appId: body.appIds[0], sourcePermaslug: "vendor/unresolved", totalTokens: "123456789", rankWithinPeriod: 1, reason: "ambiguous_model" }]; }
    if (relative.startsWith("/models?") && options.requiredUnavailable) { await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ schemaVersion: "2.0", error: { code: "SOURCE_UNAVAILABLE", message: "Models unavailable", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: true } }) }); return; }
    if ((relative.startsWith("/providers") || relative.startsWith("/free-frontiers")) && options.gatedUnavailable) { await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ schemaVersion: "2.0", error: { code: "SOURCE_UNAVAILABLE", message: "Source data is unavailable", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: true } }) }); return; }
    if (!body) { await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ schemaVersion: "2.0", error: { code: "NOT_FOUND", message: "Not found", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: false } }) }); return; }
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:4174", "Access-Control-Expose-Headers": "ETag", ETag: '"snapshot-v2"' }, body: JSON.stringify(body) });
  };
  await page.route("https://openrouter-github-dashboard.vercel.app/api/public/v2/**", handler);
  await page.route("**/__open_dashboard_api/**", handler);
}

const watchErrors = (page) => {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`page: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/ERR_FAILED|Failed to load resource/.test(message.text())) failures.push(`console: ${message.text()}`); });
  return failures;
};

test("combined route renders a complete ten-deep archived snapshot", async ({ page }, testInfo) => {
  const failures = watchErrors(page); await routeApi(page, { offline: true }); await page.goto("/web/open-dashboard/index.html");
  await expect(page.locator("#oo-model-rail tbody tr")).toHaveCount(10); await expect(page.locator("#oo-app-rail tbody tr")).toHaveCount(10); await expect(page.locator("#oo-matrix-field .oo-matrix tbody tr")).toHaveCount(10); await expect(page.locator("#oo-matrix-field .oo-matrix-control")).toHaveCount(100); await expect(page.locator("#oo-history-grid .oo-history-panel")).toHaveCount(3); await expect(page.locator("#oo-history-grid .oo-sparkline")).toHaveCount(0); await expect(page.locator("#oo-github-grid .oo-data-region")).toHaveCount(8); await expect(page.locator("#oo-source-status")).toContainText("snapshot"); await expect(page.locator(".oo-snapshot-notice")).toContainText("Fixture · stale · non-production"); await expect(page.locator(".oo-snapshot-notice")).toContainText("never mixed");
  await page.screenshot({ path: testInfo.outputPath("desktop-combined-snapshot.png"), fullPage: false }); expect(failures).toEqual([]);
});

test("typed matrix and enrichment unavailability preserve stable rankings", async ({ page }, testInfo) => {
  await routeApi(page, { matrixUnavailable: true }); await page.goto("/web/open-dashboard/index.html"); await expect(page.locator("#oo-model-rail tbody tr")).toHaveCount(10); await expect(page.locator("#oo-app-rail tbody tr")).toHaveCount(10); await expect(page.locator("#oo-matrix-field")).toContainText("collection_disabled"); await expect(page.locator("#oo-source-status")).toContainText("fixture"); await expect(page.locator("#oo-source-status")).not.toContainText("live"); await page.screenshot({ path: testInfo.outputPath("desktop-matrix-unavailable.png"), fullPage: false });
  await page.unrouteAll(); await routeApi(page, { gatedUnavailable: true }); await page.goto("/web/open-dashboard/openrouter/index.html?view=providers"); await expect(page.locator("#oo-openrouter-content")).toContainText("Provider enrichment is unavailable"); await expect(page.locator("#oo-openrouter-content")).toContainText("SOURCE_UNAVAILABLE");
});

test("source badge reports optional degradation, malformed matrix, and required failure", async ({ page }) => {
  await routeApi(page, { matrixUnavailable: true }); await page.goto("/web/open-dashboard/index.html"); await expect(page.locator("#oo-source-status")).toContainText("partial"); await expect(page.locator("#oo-source-status")).not.toContainText("complete");
  await page.unrouteAll(); await routeApi(page, { malformedMatrix: true }); await page.goto("/web/open-dashboard/index.html"); await expect(page.locator("#oo-source-status")).toContainText("partial"); await expect(page.locator("#oo-matrix-field")).toContainText("Relationship request failed");
  await page.unrouteAll(); await routeApi(page, { requiredUnavailable: true }); await page.goto("/web/open-dashboard/index.html"); await expect(page.locator("#oo-source-status")).toContainText("unavailable");
});

test("evidence panels distinguish not requested, failed, and successful empty", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 360 });
  const evidenceRequests = [];
  page.on("request", (request) => {
    if (/\/(?:benchmarks|price-changes|deprecations)(?:\?|$)/.test(request.url())) evidenceRequests.push(request.url());
  });
  await routeApi(page);
  await page.goto("/web/open-dashboard/index.html?view=models");
  await expect(page.locator("#data-status")).not.toContainText("Loading");
  await page.locator("details.source-details > summary").scrollIntoViewIfNeeded();
  await page.locator("details.source-details > summary").click();
  const pending = page.locator("#sources .source-item").filter({ hasText: "Published benchmark observations · not requested" });
  await expect(pending).toBeVisible();
  await expect(pending).toContainText("Not requested yet");
  await expect(pending).not.toContainText("Request failed");
  expect(evidenceRequests).toEqual([]);
  await pending.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("evidence-not-requested.png"), fullPage: false });

  await page.unrouteAll();
  await routeApi(page, { benchmarkState: "failed" });
  await page.goto("/web/open-dashboard/index.html?view=benchmarks");
  await expect(page.locator("#chart")).toContainText("Benchmark request failed.");
  await expect(page.locator("#chart")).toContainText("Nothing is shown in its place.");
  await page.locator("details.source-details > summary").scrollIntoViewIfNeeded();
  await page.locator("details.source-details > summary").click();
  const failed = page.locator("#sources .source-item").filter({ hasText: "Published benchmark observations · failed" });
  await expect(failed).toBeVisible();
  await expect(failed).toContainText("Request failed; nothing is shown in its place.");
  await expect(failed).toContainText("Data source returned 503");
  await failed.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("evidence-failed.png"), fullPage: false });

  await page.unrouteAll();
  await routeApi(page, { benchmarkState: "empty" });
  await page.goto("/web/open-dashboard/index.html?view=benchmarks");
  await expect(page.locator("#inspector")).toContainText("Request succeeded with empty results.");
  await expect(page.locator("#inspector")).toContainText("The source published 0 rows.");
  await page.locator("details.source-details > summary").scrollIntoViewIfNeeded();
  await page.locator("details.source-details > summary").click();
  const empty = page.locator("#sources .source-item").filter({ hasText: "Published benchmark observations · succeeded with empty results" });
  await expect(empty).toBeVisible();
  await expect(empty).toContainText("Request succeeded and published 0 rows.");
  await expect(empty).not.toContainText("Request failed");
  await empty.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("evidence-succeeded-empty.png"), fullPage: false });
});

test("every explorer data view exposes source and collection-time provenance", async ({ page }, testInfo) => {
  await routeApi(page);
  for (const view of ["models", "apps", "history", "benchmarks", "changes"]) {
    await page.goto(`/web/open-dashboard/index.html?view=${view}`);
    await expect(page.locator("#data-status")).not.toContainText("Loading");
    const provenance = page.locator("#plot-provenance");
    await expect(provenance).toBeVisible();
    await expect(provenance).toHaveAttribute(
      "data-provenance-state",
      /^(complete|partial)$/,
    );
    await expect(provenance).toContainText("Source");
    await expect(provenance.locator("a").first()).toBeVisible();
    await expect(provenance.locator("time").first()).toBeVisible();
    await expect(provenance.locator("time").first()).toHaveAttribute(
      "datetime",
      /^\d{4}-\d{2}-\d{2}/,
    );
    if (view === "models")
      await provenance.screenshot({ path: testInfo.outputPath("model-provenance.png") });
    if (view === "apps") {
      const linkMark = page.locator("#chart .flow-link").nth(1);
      await linkMark.focus();
      await linkMark.press("Enter");
      await expect(page.locator("#inspector")).toContainText("Source collected");
      await expect(page.locator("#inspector a", { hasText: "Source evidence" })).toBeVisible();
    }
    if (view === "history") {
      const historyMark = page.locator("#chart .data-point").first();
      await historyMark.focus();
      await historyMark.press("Enter");
      await expect(page.locator("#inspector")).toContainText("Source collected");
      await expect(page.locator("#inspector a", { hasText: "Source evidence" })).toBeVisible();
    }
  }
});

test("OpenRouter exposes nine compact sections plus app, provider and Pareto evidence", async ({ page }, testInfo) => {
  await routeApi(page, { offline: true }); await page.goto("/web/open-dashboard/openrouter/index.html?view=free"); await expect(page.locator(".oo-section-nav a")).toHaveCount(9); await expect(page.locator("#oo-openrouter-content tbody tr")).toHaveCount(10); await expect(page.locator("#oo-openrouter-content")).toContainText(":free"); await expect(page.locator("#oo-openrouter-content")).toContainText("openrouter/free is a router"); await page.screenshot({ path: testInfo.outputPath("openrouter-free.png"), fullPage: false });
  await page.goto("/web/open-dashboard/openrouter/index.html?view=app-to-model&app=1001"); await expect(page.locator(".oo-app-picker a")).toHaveCount(10); await expect(page.getByRole("heading", { name: "Claude Code model ranking" }).locator("..").locator("tbody tr")).toHaveCount(10);
  await page.goto("/web/open-dashboard/openrouter/index.html?view=providers"); await expect(page.locator("#oo-openrouter-content tbody tr")).toHaveCount(10);
  await page.goto("/web/open-dashboard/openrouter/index.html?view=free&freeMode=pareto"); await expect(page.locator(".oo-mode-nav a[aria-current=page]")).toHaveText("Pareto: quality x throughput"); await expect(page.locator("#oo-openrouter-content")).toContainText("benchmarkQuality"); await expect(page.locator("#oo-openrouter-content")).toContainText("medianThroughput"); await expect(page.locator("#oo-openrouter-content")).not.toContainText("efficiency score");
});

test("dedicated matrix route keeps the full grid readable and preserves unavailable evidence", async ({ page }) => {
  const failures = watchErrors(page);
  await routeApi(page, { offline: true });
  await page.goto("/web/open-dashboard/matrix/index.html");
  await expect(page.locator(".oo-destinations a").nth(2)).toHaveText("Matrix");
  await expect(page.locator(".oo-destinations a").nth(2)).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#oo-matrix-field .oo-matrix tbody tr")).toHaveCount(10);
  await expect(page.locator("#oo-matrix-field .oo-matrix-control")).toHaveCount(100);
  await expect(page.locator("#oo-matrix-field .oo-app-model-flow")).toBeVisible();
  await expect(page.locator("#oo-matrix-field .oo-flow-title")).toHaveText("Observed relationships only");
  await expect(page.locator("#oo-matrix-field")).not.toContainText("Relationship request failed");
  await expect(page.locator("#oo-matrix-route-intro")).toContainText("bounded relationship");
  await expect(page.locator(".oo-matrix-legend")).toContainText("exact daily tokens");
  await expect(page.locator(".oo-snapshot-notice")).toContainText("never mixed");
  expect(failures).toEqual([]);

  await page.unrouteAll();
  await routeApi(page, { matrixUnavailable: true });
  await page.goto("/web/open-dashboard/matrix/index.html");
  await expect(page.locator("#oo-matrix-field")).toContainText("collection_disabled");
  await expect(page.locator("#oo-matrix-field .oo-matrix")).toHaveCount(0);
});

test("matrix evidence keeps all three states legible without colour", async ({ page }) => {
  await routeApi(page, { threeStates: true });
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/web/open-dashboard/matrix/index.html");
  await expect(page.locator("#oo-matrix-field .oo-matrix-state-summary")).toContainText("2");
  await expect(page.locator("#oo-matrix-field .oo-matrix-state-item.is-not-observed")).toContainText("checked, no usage recorded");
  await expect(page.locator("#oo-matrix-field .oo-matrix-state-item.is-unknown")).toContainText("not collected or not published");
  await expect(page.locator("#oo-matrix-field .oo-matrix-cell.is-observed")).toHaveCount(2);
  await expect(page.locator("#oo-matrix-field .oo-matrix-cell.is-not-observed")).toHaveCount(97);
  await expect(page.locator("#oo-matrix-field .oo-matrix-cell.is-unknown")).toHaveCount(1);
  await expect(page.locator("#oo-matrix-field .oo-matrix-cell.is-unknown.is-not-published .oo-matrix-control")).toHaveText("N/P");
  await expect(page.locator("#oo-matrix-field .oo-matrix-state-item.is-unknown .oo-matrix-state-detail")).toHaveText("(1 not published)");
  // WAS toHaveText("0"). A cell the API declares `state: "unknown", reason: "not_observed"`
  // rendered as the digit zero, indistinguishable at a glance from the observed zero this
  // same spec checks two lines up. It is "N/O" now -- the sibling of the "N/P" asserted
  // above -- so no cell in this matrix shows a number unless a number was observed.
  await expect(page.locator("#oo-matrix-field .oo-matrix-cell.is-not-observed .oo-matrix-control").first()).toHaveText("N/O");
  await expect(page.locator("#oo-matrix-field .oo-matrix-cell.is-not-observed .oo-matrix-control").first()).toHaveAttribute("aria-label", /checked and no observed usage/);
  await expect(page.locator("#oo-matrix-field .oo-unmapped-summary")).toHaveText("138 unresolved observations · largest 1 shown");
});

test("GitHub exposes eight categories and transparent adoption metadata", async ({ page }, testInfo) => {
  await routeApi(page, { offline: true }); await page.goto("/web/open-dashboard/github/index.html?category=mcp&metric=adoption"); await expect(page.locator(".oo-category-list a")).toHaveCount(8); await expect(page.locator(".oo-ranking-nav > *")).toHaveCount(3); await expect(page.locator("#oo-github-content > .oo-data-region:first-child tbody tr")).toHaveCount(10); await expect(page.locator("#oo-github-content")).toContainText("percent_rank"); await expect(page.locator("#oo-github-content")).toContainText("raw stars and forks"); await expect(page.locator("#oo-github-content")).toContainText("github-adoption-v1"); await expect(page.locator("#oo-github-content")).toContainText("Eligible population: 10"); await page.screenshot({ path: testInfo.outputPath("github-mcp-adoption.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); const summary = page.locator(".oo-category-sheet > summary"); await expect(summary).toBeVisible(); await expect(page.locator(".oo-category-list")).toBeHidden(); await summary.click(); await expect(page.locator(".oo-category-list a").first()).toBeVisible();
});

test("GitHub fetches and renders published enrichment only for the maintenance top ten", async ({ page }) => {
  const requested = [];
  page.on("request", (request) => { if (request.url().includes("/github/repositories/") && request.url().includes("/enrichment")) requested.push(request.url()); });
  await routeApi(page);
  await page.goto("/web/open-dashboard/github/index.html?category=mcp&metric=adoption");
  expect(requested).toEqual([]);
  await page.goto("/web/open-dashboard/github/index.html?category=mcp&metric=maintenance");
  await expect.poll(() => requested.length).toBe(10);
  const maintenanceTableHead = page.getByRole("table", { name: "Maintenance · MCP" }).locator("thead");
  await expect(maintenanceTableHead).toContainText("Stable releases 90d");
  await expect(maintenanceTableHead).toContainText("Median cadence");
  const disclosure = page.locator("#oo-github-content .oo-github-enrichment-disclosure").first();
  await expect(disclosure).toBeVisible();
  await expect(disclosure.locator(".oo-coverage-badge")).toHaveText("Partial coverage");
  await expect(disclosure.locator("summary")).toHaveAttribute("aria-label", /partial-coverage/i);
  await expect(disclosure.locator("summary")).not.toHaveAttribute("aria-label", /exact/i);
  await disclosure.locator("summary").click();
  await expect(disclosure.locator("li")).toHaveCount(7);
  await expect(disclosure).toContainText(/2026-07-\d{2}: \d+ \(partial coverage\)/);
  await page.getByRole("button", { name: /Sources/ }).click();
  const enrichmentSources = page.locator("#oo-source-panel [data-source-kind=github-enrichment]");
  await expect(enrichmentSources).toHaveCount(20);
  await expect(enrichmentSources.first().locator("a[href^='https://api.github.com/']")).toHaveCount(1);
  await expect(enrichmentSources.first()).toContainText(/publication .*:(releases|stargazers)/i);
  await expect(enrichmentSources.first().locator("time")).toHaveAttribute("datetime", "2026-07-15T10:00:00.000Z");
});

test("eligible history renders stacked usage, model bump, and GitHub small-multiple geometry", async ({ page }) => {
  await routeApi(page, { eligibleHistory: true });
  await page.goto("/web/open-dashboard/index.html");
  await page.locator("#oo-history-grid").scrollIntoViewIfNeeded();
  await expect(page.locator("#oo-history-grid .oo-stacked-area path[data-series-id]")).toHaveCount(11);
  await expect(page.locator("#oo-history-grid .oo-bump-chart path[data-series-id]")).toHaveCount(10);
  await expect(page.locator("#oo-history-grid .oo-small-multiples .oo-small-multiple")).toHaveCount(1);
  const paths = await page.locator("#oo-history-grid svg path").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")));
  expect(paths.length).toBeGreaterThan(20);
  expect(paths.every((value) => value && !/NaN|Infinity/.test(value))).toBe(true);
});

test("Release-1 evidence rows expose top-three, app coverage, task models, lifecycle dates, and source-separated benchmarks", async ({ page }) => {
  await routeApi(page, { lifecycleEvidence: true });
  await page.goto("/web/open-dashboard/openrouter/index.html?view=usage");
  await expect(page.locator("#oo-openrouter-content tbody tr[data-rank-tier=top-three]")).toHaveCount(3);
  await page.goto("/web/open-dashboard/openrouter/index.html?view=apps");
  await expect(page.locator("#oo-openrouter-content .oo-app-row-evidence")).toHaveCount(10);
  await expect(page.locator("#oo-openrouter-content .oo-app-row-evidence .oo-model-chip")).toHaveCount(30);
  await expect(page.locator("#oo-openrouter-content .oo-app-coverage")).toHaveCount(10);
  await page.goto("/web/open-dashboard/openrouter/index.html?view=tasks");
  await expect(page.locator("#oo-openrouter-content .oo-task-models")).toHaveCount(10);
  await expect(page.locator("#oo-openrouter-content .oo-task-models .oo-model-chip")).toHaveCount(30);
  await page.goto("/web/open-dashboard/openrouter/index.html?view=deprecations");
  await expect(page.locator("#oo-openrouter-content thead")).toContainText("First observed");
  await expect(page.locator("#oo-openrouter-content thead")).toContainText("Last observed");
  await expect(page.locator("#oo-openrouter-content .oo-lifecycle-timeline time")).toHaveCount(3);
  await page.goto("/web/open-dashboard/openrouter/index.html?view=benchmarks");
  await expect(page.locator("#oo-openrouter-content .oo-benchmark-source")).toHaveCount(2);
  await expect(page.getByRole("table", { name: "Artificial Analysis ranking" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Design Arena ranking" })).toBeVisible();
});

test("portrait and landscape keep all three combined panels reachable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await routeApi(page, { offline: true }); await page.goto("/web/open-dashboard/index.html"); await expect(page.locator(".oo-mobile-segments button")).toHaveCount(3); await expect(page.locator(".oo-mobile-segments button").first()).toHaveCSS("min-height", "44px"); await page.getByRole("button", { name: "Matrix" }).click(); await expect(page.locator("#oo-matrix-field")).toBeVisible(); await expect(page.locator("#oo-model-rail")).toBeHidden(); await page.screenshot({ path: testInfo.outputPath("portrait-combined-matrix.png"), fullPage: false });
  await page.setViewportSize({ width: 844, height: 390 }); await page.reload(); await expect(page.locator(".oo-mobile-segments")).toBeVisible(); await page.getByRole("button", { name: "Matrix" }).click(); await expect(page.locator("#oo-matrix-field .oo-matrix")).toBeVisible(); await page.screenshot({ path: testInfo.outputPath("landscape-matrix.png"), fullPage: false });
});

test("1440px matrix supports roving arrows, exact values, Escape and focus restoration", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await routeApi(page); await page.goto("/web/open-dashboard/index.html");
  const controls = page.locator("#oo-matrix-field .oo-matrix-control"); await expect(controls).toHaveCount(100);
  await controls.first().focus(); await expect(controls.first()).toHaveAttribute("tabindex", "0"); await expect(controls.nth(1)).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("ArrowRight"); await expect(controls.nth(1)).toBeFocused();
  await page.keyboard.press("Enter"); const inspector = page.locator("#oo-inspector"); await expect(inspector).toBeVisible(); await expect(inspector).toHaveAttribute("role", "dialog"); await expect(inspector.getByRole("button", { name: "Close details" })).toBeFocused();
  await expect(page.locator("[data-exact-value]").first()).toContainText("exact value");
  await page.keyboard.press("Escape"); await expect(inspector).toBeHidden(); await expect(controls.nth(1)).toBeFocused();
});

test("combined route defers optional history and enrichment until the lower evidence rail is near", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 360 }); const requested = []; page.on("request", (request) => { if (request.url().includes("/api/public/v2/")) requested.push(request.url()); }); await routeApi(page); await page.goto("/web/open-dashboard/index.html"); await expect(page.locator("#oo-model-rail tbody tr")).toHaveCount(10);
  expect(requested.some((url) => url.includes("/history?"))).toBe(false); expect(requested.some((url) => url.includes("/providers?"))).toBe(false); expect(requested.some((url) => url.includes("/free-frontiers?"))).toBe(false);
  await page.locator("#oo-history-grid").scrollIntoViewIfNeeded(); await expect.poll(() => requested.some((url) => url.includes("/history?"))).toBe(true); await expect.poll(() => requested.some((url) => url.includes("/providers?"))).toBe(true); await expect(page.locator("#oo-history-grid .oo-history-panel")).toHaveCount(3);
});

test("missing IntersectionObserver eagerly loads semantic evidence and omits Three.js", async ({ page }) => {
  await page.addInitScript(() => { delete window.IntersectionObserver; });
  const requested = []; const vendor = [];
  page.on("request", (request) => { if (request.url().includes("/api/public/v2/")) requested.push(request.url()); if (request.url().includes("three.module.min.js")) vendor.push(request.url()); });
  await routeApi(page); await page.goto("/web/open-dashboard/index.html");
  await expect.poll(() => requested.some((url) => url.includes("/history?"))).toBe(true);
  await expect(page.locator("#oo-history-grid .oo-history-panel")).toHaveCount(3);
  await expect(page.locator("#oo-network-region")).toContainText("Relationship map omitted");
  expect(vendor).toEqual([]);
});

test("320px and 200 percent zoom remain page-contained with accessible data scrollers", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 }); await routeApi(page, { offline: true }); await page.goto("/web/open-dashboard/index.html");
  const session = await page.context().newCDPSession(page); await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(3);
  const sourceLabelBounds = await page.locator("#oo-source-status").evaluate((button) => {
    const text = button.firstChild;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(7, text.length));
    const label = range.getBoundingClientRect();
    const control = button.getBoundingClientRect();
    return { labelLeft: label.left, controlLeft: control.left };
  });
  expect(sourceLabelBounds.labelLeft).toBeGreaterThanOrEqual(sourceLabelBounds.controlLeft);
  const scrollers = page.locator(".oo-table-scroll, .oo-matrix-scroll");
  await expect(scrollers.first()).toHaveAttribute("tabindex", "0");
  await expect(scrollers.first()).toHaveAttribute("aria-label", /table|matrix/i);
  const firstRow = page.locator("#oo-model-rail tbody tr").first();
  await expect(firstRow.locator("th[scope=row]")).toContainText("Claude Sonnet 4");
  await expect(firstRow.locator("td").first()).toContainText("1");
});

test("history falls back to bounded exact tables until eight consecutive complete days", async ({ page }) => {
  await routeApi(page, { offline: true }); await page.goto("/web/open-dashboard/index.html");
  await expect(page.locator("#oo-history-grid .oo-sparkline")).toHaveCount(0);
  await expect(page.locator("#oo-history-grid")).toContainText("eight consecutive complete daily buckets");
  for (const panel of await page.locator("#oo-history-grid .oo-history-panel").all()) await expect(panel.locator("tbody tr")).toHaveCount(70);
});

test("reduced motion supplies a static relationship fallback without loading Three.js", async ({ page }) => {
  const vendor = []; page.on("request", (request) => { if (request.url().includes("/web/vendor/three/three.module.min.js")) vendor.push(request.url()); }); await page.emulateMedia({ reducedMotion: "reduce" }); await routeApi(page, { offline: true }); await page.goto("/web/open-dashboard/index.html"); await page.locator("#oo-network-region").scrollIntoViewIfNeeded(); await page.waitForTimeout(250); expect(vendor).toEqual([]); await expect(page.locator("#oo-network-region")).toContainText("remain authoritative");
});

test("normal motion lazy-loads a bounded meaningful relationship canopy", async ({ page }) => {
  const vendor = [];
  page.on("request", (request) => {
    if (request.url().includes("/web/vendor/three/three.module.min.js")) vendor.push(request.url());
  });
  await routeApi(page, { offline: true });
  await page.goto("/web/open-dashboard/index.html");
  expect(vendor).toEqual([]);
  const region = page.locator("#oo-network-region");
  await region.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => Boolean(window.__openDashboardThreeDebug?.loaded))).toBe(true);
  expect(vendor).toHaveLength(1);
  await expect(region.locator("canvas[aria-hidden=true]")).toHaveCount(1);
  const debug = await page.evaluate(() => window.__openDashboardThreeDebug);
  expect(debug.nodes).toBe(32);
  expect(debug.edges).toBeGreaterThan(0);
  expect(debug.edges).toBeLessThanOrEqual(110);

  const bounds = await region.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * .82, bounds.y + bounds.height * .22);
  await expect.poll(() => page.evaluate(
    () => window.__openDashboardThreeDebug.uniforms.uMouse[0],
  )).toBeGreaterThan(.2);
  await page.mouse.click(bounds.x + bounds.width * .7, bounds.y + bounds.height * .4);
  await expect.poll(() => page.evaluate(
    () => window.__openDashboardThreeDebug.uniforms.uClick,
  )).toBeGreaterThan(0);
  const frames = await page.evaluate(() => window.__openDashboardThreeDebug.frames);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__openDashboardThreeDebug.frames)).toBeGreaterThan(frames);
});

test("Save-Data requires consent and WebGL context loss restores the semantic fallback", async ({ page }) => {
  const vendor = []; page.on("request", (request) => { if (request.url().includes("/web/vendor/three/three.module.min.js")) vendor.push(request.url()); });
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } })); await routeApi(page); await page.goto("/web/open-dashboard/index.html");
  await page.locator("#oo-network-region").scrollIntoViewIfNeeded(); expect(vendor).toEqual([]); const load = page.getByRole("button", { name: "Load ecosystem map" }); await expect(load).toBeVisible(); await load.click(); await expect(page.locator("#oo-network-region canvas")).toHaveCount(1);
  await page.locator("#oo-network-region canvas").dispatchEvent("webglcontextlost"); await expect(page.locator("#oo-network-region .oo-network-note")).toContainText("semantic matrix and ranking tables remain authoritative");
});

test("schema-major mismatch fails closed and all canonical assets stay direct", async ({ page, request }) => {
  for (const asset of ["/web/open-dashboard/index.html", "/web/open-dashboard/openrouter/index.html", "/web/open-dashboard/github/index.html", "/web/open-dashboard/open-dashboard.css", "/web/open-dashboard/open-dashboard.js", "/web/open-dashboard/fallback-data.json"]) expect((await request.get(asset)).status(), asset).toBe(200);
  await page.route("https://openrouter-github-dashboard.vercel.app/api/public/v2/**", async (route) => { const bad = { ...bundle.manifest, schemaVersion: "3.0" }; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bad) }); }); await page.goto("/web/open-dashboard/index.html"); await expect(page.locator("#oo-view-root")).toContainText("Expected schema major 2"); await expect(page.locator("#oo-source-status")).toContainText("unavailable");
});
