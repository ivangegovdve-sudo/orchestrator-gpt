const { test, expect } = require("playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const bundle = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../web/open-overview/fallback-data.json"), "utf8"));
const canonical = (input) => {
  const url = new URL(input, "https://snapshot.invalid");
  const sorted = new URLSearchParams(Array.from(url.searchParams.entries()).sort(([a,av],[b,bv]) => a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  return url.pathname + (sorted.size ? `?${sorted}` : "");
};
const withFinalizedContracts = (body) => {
  if (!body || typeof body !== "object") return body;
  if (body.status === "available" && Array.isArray(body.appIds) && Array.isArray(body.modelIds) && Array.isArray(body.cells)) {
    const apps = bundle.responses[canonical("/apps?limit=10&period=30d&sort=popular")].data;
    const models = bundle.responses[canonical("/models?limit=10&rank_source=top-weekly")].data;
    return { ...body, apps: body.appIds.map((appId) => ({ appId, appName: apps.find((row) => row.appId === appId)?.appName || appId })), models: body.modelIds.map((modelId) => ({ modelId, modelName: models.find((row) => row.id === modelId)?.name || modelId })) };
  }
  if (body.ranking) {
    const fetchedAt = body.provenance?.[0]?.fetchedAt || "2026-07-15T10:00:00.000Z";
    return {
      ...body,
      coverage: { ...body.coverage, stale: false, lastSuccessAt: fetchedAt, staleAfterSeconds: 172800 },
      ranking: { definition: "Reviewed public ranking", unit: "score", direction: "higher_is_better", coverageExcluded: 0, baselineDate: null, ...body.ranking },
      metricEvidence: body.data.map((row) => ({ repositoryId: row.repositoryId, baselineStars: null, starDelta: null, forkDelta: null, relativeGrowth: null, defaultBranchCommittedAt: null, latestStableReleaseAt: null, stableReleaseCount90d: null })),
      provenance: body.provenance.map((row) => ({ ...row, payloadSha256: "a".repeat(64) }))
    };
  }
  return body;
};

async function routeApi(page, options = {}) {
  await page.route("https://openrouter-github-dashboard.vercel.app/api/public/v2/**", async (route) => {
    if (options.offline) { await route.abort("failed"); return; }
    const url = new URL(route.request().url()); const relative = url.pathname.replace("/api/public/v2", "") + url.search;
    let body = relative.startsWith("/manifest") ? bundle.manifest : withFinalizedContracts(bundle.responses[canonical(relative)]);
    if (relative.startsWith("/app-model-matrix") && options.matrixUnavailable) body = { schemaVersion: "2.0", status: "unavailable", reason: "collection_disabled", lastSuccessAt: null, appIds: bundle.responses[canonical("/apps?limit=10&period=30d&sort=popular")].data.map((row) => row.appId), modelIds: bundle.responses[canonical("/models?limit=10&rank_source=top-weekly")].data.map((row) => row.id), cells: [] };
    if (relative.startsWith("/app-model-matrix") && options.malformedMatrix) body = { ...body, cells: [...body.cells.slice(0, -1), body.cells[0]] };
    if (relative.startsWith("/models?") && options.requiredUnavailable) { await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ schemaVersion: "2.0", error: { code: "SOURCE_UNAVAILABLE", message: "Models unavailable", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: true } }) }); return; }
    if ((relative.startsWith("/providers") || relative.startsWith("/free-frontiers")) && options.gatedUnavailable) { await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ schemaVersion: "2.0", error: { code: "SOURCE_UNAVAILABLE", message: "Source data is unavailable", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: true } }) }); return; }
    if (!body) { await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ schemaVersion: "2.0", error: { code: "NOT_FOUND", message: "Not found", correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", retryable: false } }) }); return; }
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:4174", "Access-Control-Expose-Headers": "ETag", ETag: '"snapshot-v2"' }, body: JSON.stringify(body) });
  });
}

const watchErrors = (page) => {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`page: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/ERR_FAILED|Failed to load resource/.test(message.text())) failures.push(`console: ${message.text()}`); });
  return failures;
};

test("combined route renders a complete ten-deep archived snapshot", async ({ page }, testInfo) => {
  const failures = watchErrors(page); await routeApi(page, { offline: true }); await page.goto("/web/open-overview/index.html");
  await expect(page.locator("#oo-model-rail tbody tr")).toHaveCount(10); await expect(page.locator("#oo-app-rail tbody tr")).toHaveCount(10); await expect(page.locator("#oo-matrix-field .oo-matrix tbody tr")).toHaveCount(10); await expect(page.locator("#oo-matrix-field .oo-matrix-control")).toHaveCount(100); await expect(page.locator("#oo-history-grid .oo-history-panel")).toHaveCount(3); await expect(page.locator("#oo-history-grid .oo-sparkline")).toHaveCount(30); await expect(page.locator("#oo-github-grid .oo-data-region")).toHaveCount(8); await expect(page.locator("#oo-source-status")).toContainText("snapshot"); await expect(page.locator(".oo-snapshot-notice")).toContainText("Fixture · stale · non-production"); await expect(page.locator(".oo-snapshot-notice")).toContainText("never mixed");
  await page.screenshot({ path: testInfo.outputPath("desktop-combined-snapshot.png"), fullPage: false }); expect(failures).toEqual([]);
});

test("typed matrix and enrichment unavailability preserve stable rankings", async ({ page }, testInfo) => {
  await routeApi(page, { matrixUnavailable: true }); await page.goto("/web/open-overview/index.html"); await expect(page.locator("#oo-model-rail tbody tr")).toHaveCount(10); await expect(page.locator("#oo-app-rail tbody tr")).toHaveCount(10); await expect(page.locator("#oo-matrix-field")).toContainText("collection_disabled"); await expect(page.locator("#oo-source-status")).toContainText("live"); await page.screenshot({ path: testInfo.outputPath("desktop-matrix-unavailable.png"), fullPage: false });
  await page.unrouteAll(); await routeApi(page, { gatedUnavailable: true }); await page.goto("/web/open-overview/openrouter/index.html?view=providers"); await expect(page.locator("#oo-openrouter-content")).toContainText("Provider enrichment is unavailable"); await expect(page.locator("#oo-openrouter-content")).toContainText("SOURCE_UNAVAILABLE");
});

test("source badge reports optional degradation, malformed matrix, and required failure", async ({ page }) => {
  await routeApi(page, { matrixUnavailable: true }); await page.goto("/web/open-overview/index.html"); await expect(page.locator("#oo-source-status")).toContainText("partial"); await expect(page.locator("#oo-source-status")).not.toContainText("complete");
  await page.unrouteAll(); await routeApi(page, { malformedMatrix: true }); await page.goto("/web/open-overview/index.html"); await expect(page.locator("#oo-source-status")).toContainText("partial"); await expect(page.locator("#oo-matrix-field")).toContainText("Relationship request failed");
  await page.unrouteAll(); await routeApi(page, { requiredUnavailable: true }); await page.goto("/web/open-overview/index.html"); await expect(page.locator("#oo-source-status")).toContainText("unavailable");
});

test("OpenRouter exposes nine compact sections plus app, provider and Pareto evidence", async ({ page }, testInfo) => {
  await routeApi(page, { offline: true }); await page.goto("/web/open-overview/openrouter/index.html?view=free"); await expect(page.locator(".oo-section-nav a")).toHaveCount(9); await expect(page.locator("#oo-openrouter-content tbody tr")).toHaveCount(10); await expect(page.locator("#oo-openrouter-content")).toContainText(":free"); await expect(page.locator("#oo-openrouter-content")).toContainText("openrouter/free is a router"); await page.screenshot({ path: testInfo.outputPath("openrouter-free.png"), fullPage: false });
  await page.goto("/web/open-overview/openrouter/index.html?view=app-to-model&app=1001"); await expect(page.locator(".oo-app-picker a")).toHaveCount(10); await expect(page.getByRole("heading", { name: "Claude Code model ranking" }).locator("..").locator("tbody tr")).toHaveCount(10);
  await page.goto("/web/open-overview/openrouter/index.html?view=providers"); await expect(page.locator("#oo-openrouter-content tbody tr")).toHaveCount(10);
  await page.goto("/web/open-overview/openrouter/index.html?view=free&freeMode=pareto"); await expect(page.locator(".oo-mode-nav a[aria-current=page]")).toHaveText("Pareto: quality x throughput"); await expect(page.locator("#oo-openrouter-content")).toContainText("benchmarkQuality"); await expect(page.locator("#oo-openrouter-content")).toContainText("medianThroughput"); await expect(page.locator("#oo-openrouter-content")).not.toContainText("efficiency score");
});

test("GitHub exposes eight categories and transparent adoption metadata", async ({ page }, testInfo) => {
  await routeApi(page, { offline: true }); await page.goto("/web/open-overview/github/index.html?category=mcp&metric=adoption"); await expect(page.locator(".oo-category-list a")).toHaveCount(8); await expect(page.locator(".oo-ranking-nav > *")).toHaveCount(3); await expect(page.locator("#oo-github-content > .oo-data-region:first-child tbody tr")).toHaveCount(10); await expect(page.locator("#oo-github-content")).toContainText("percent_rank"); await expect(page.locator("#oo-github-content")).toContainText("raw stars and forks"); await expect(page.locator("#oo-github-content")).toContainText("github-adoption-v1"); await expect(page.locator("#oo-github-content")).toContainText("Eligible population: 10"); await page.screenshot({ path: testInfo.outputPath("github-mcp-adoption.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); const summary = page.locator(".oo-category-sheet > summary"); await expect(summary).toBeVisible(); await expect(page.locator(".oo-category-list")).toBeHidden(); await summary.click(); await expect(page.locator(".oo-category-list a").first()).toBeVisible();
});

test("portrait and landscape keep all three combined panels reachable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await routeApi(page, { offline: true }); await page.goto("/web/open-overview/index.html"); await expect(page.locator(".oo-mobile-segments button")).toHaveCount(3); await expect(page.locator(".oo-mobile-segments button").first()).toHaveCSS("min-height", "44px"); await page.getByRole("button", { name: "Matrix" }).click(); await expect(page.locator("#oo-matrix-field")).toBeVisible(); await expect(page.locator("#oo-model-rail")).toBeHidden(); await page.screenshot({ path: testInfo.outputPath("portrait-combined-matrix.png"), fullPage: false });
  await page.setViewportSize({ width: 844, height: 390 }); await page.reload(); await expect(page.locator(".oo-mobile-segments")).toBeVisible(); await page.getByRole("button", { name: "Matrix" }).click(); await expect(page.locator("#oo-matrix-field .oo-matrix")).toBeVisible(); await page.screenshot({ path: testInfo.outputPath("landscape-matrix.png"), fullPage: false });
});

test("1440px matrix supports roving arrows, exact values, Escape and focus restoration", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await routeApi(page); await page.goto("/web/open-overview/index.html");
  const controls = page.locator("#oo-matrix-field .oo-matrix-control"); await expect(controls).toHaveCount(100);
  await controls.first().focus(); await expect(controls.first()).toHaveAttribute("tabindex", "0"); await expect(controls.nth(1)).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("ArrowRight"); await expect(controls.nth(1)).toBeFocused();
  await page.keyboard.press("Enter"); const inspector = page.locator("#oo-inspector"); await expect(inspector).toBeVisible(); await expect(inspector).toHaveAttribute("role", "dialog"); await expect(inspector.getByRole("button", { name: "Close details" })).toBeFocused();
  await expect(page.locator("[data-exact-value]").first()).toContainText("exact value");
  await page.keyboard.press("Escape"); await expect(inspector).toBeHidden(); await expect(controls.nth(1)).toBeFocused();
});

test("combined route defers optional history and enrichment until the lower evidence rail is near", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 360 }); const requested = []; page.on("request", (request) => { if (request.url().includes("/api/public/v2/")) requested.push(request.url()); }); await routeApi(page); await page.goto("/web/open-overview/index.html"); await expect(page.locator("#oo-model-rail tbody tr")).toHaveCount(10);
  expect(requested.some((url) => url.includes("/history?"))).toBe(false); expect(requested.some((url) => url.includes("/providers?"))).toBe(false); expect(requested.some((url) => url.includes("/free-frontiers?"))).toBe(false);
  await page.locator("#oo-history-grid").scrollIntoViewIfNeeded(); await expect.poll(() => requested.some((url) => url.includes("/history?"))).toBe(true); await expect.poll(() => requested.some((url) => url.includes("/providers?"))).toBe(true); await expect(page.locator("#oo-history-grid .oo-history-panel")).toHaveCount(3);
});

test("reduced motion supplies a static relationship fallback without loading Three.js", async ({ page }) => {
  const vendor = []; page.on("request", (request) => { if (request.url().includes("/web/vendor/three/three.module.min.js")) vendor.push(request.url()); }); await page.emulateMedia({ reducedMotion: "reduce" }); await routeApi(page, { offline: true }); await page.goto("/web/open-overview/index.html"); await page.locator("#oo-network-region").scrollIntoViewIfNeeded(); await page.waitForTimeout(250); expect(vendor).toEqual([]); await expect(page.locator("#oo-network-region")).toContainText("remain authoritative");
});

test("normal motion lazy-loads a bounded meaningful relationship canopy", async ({ page }) => {
  const vendor = []; page.on("request", (request) => { if (request.url().includes("/web/vendor/three/three.module.min.js")) vendor.push(request.url()); }); await routeApi(page, { offline: true }); await page.goto("/web/open-overview/index.html"); expect(vendor).toEqual([]); await page.locator("#oo-network-region").scrollIntoViewIfNeeded(); await expect.poll(() => page.evaluate(() => Boolean(window.__openOverviewThreeDebug?.loaded))).toBe(true); expect(vendor).toHaveLength(1); await expect(page.locator("#oo-network-region canvas[aria-hidden=true]")).toHaveCount(1); const debug = await page.evaluate(() => window.__openOverviewThreeDebug); expect(debug.nodes).toBe(32); expect(debug.edges).toBeGreaterThan(0); expect(debug.edges).toBeLessThanOrEqual(110);
});

test("Save-Data requires consent and WebGL context loss restores the semantic fallback", async ({ page }) => {
  const vendor = []; page.on("request", (request) => { if (request.url().includes("/web/vendor/three/three.module.min.js")) vendor.push(request.url()); });
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } })); await routeApi(page); await page.goto("/web/open-overview/index.html");
  await page.locator("#oo-network-region").scrollIntoViewIfNeeded(); expect(vendor).toEqual([]); const load = page.getByRole("button", { name: "Load ecosystem map" }); await expect(load).toBeVisible(); await load.click(); await expect(page.locator("#oo-network-region canvas")).toHaveCount(1);
  await page.locator("#oo-network-region canvas").dispatchEvent("webglcontextlost"); await expect(page.locator("#oo-network-region .oo-network-note")).toContainText("semantic matrix and ranking tables remain authoritative");
});

test("schema-major mismatch fails closed and all canonical assets stay direct", async ({ page, request }) => {
  for (const asset of ["/web/open-overview/index.html", "/web/open-overview/openrouter/index.html", "/web/open-overview/github/index.html", "/web/open-overview/open-overview.css", "/web/open-overview/open-overview.js", "/web/open-overview/fallback-data.json"]) expect((await request.get(asset)).status(), asset).toBe(200);
  await page.route("https://openrouter-github-dashboard.vercel.app/api/public/v2/**", async (route) => { const bad = { ...bundle.manifest, schemaVersion: "3.0" }; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bad) }); }); await page.goto("/web/open-overview/index.html"); await expect(page.locator("#oo-view-root")).toContainText("Expected schema major 2"); await expect(page.locator("#oo-source-status")).toContainText("unavailable");
});
