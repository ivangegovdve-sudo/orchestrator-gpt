const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const ROUTE = path.join(ROOT, "web", "open-overview");
const read = (...parts) => fs.readFileSync(path.join(ROUTE, ...parts), "utf8");
const readFixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
const importRoute = (file) => import(pathToFileURL(path.join(ROUTE, file)).href + `?t=${Date.now()}-${Math.random()}`);

test("three canonical routes remain isolated and the shared 3D registry exposes Open Overview", () => {
  for (const [file, route] of [["index.html", "overview"], ["openrouter/index.html", "openrouter"], ["github/index.html", "github"]]) {
    const html = read(...file.split("/"));
    assert.match(html, new RegExp(`data-open-overview-route="${route}"`));
    assert.match(html, /href="\/web\/open-overview\/open-overview\.css"/);
    assert.match(html, /src="\/web\/open-overview\/open-overview\.js"/);
    assert.match(html, /id="oo-view-root"/);
    assert.doesNotMatch(html, /forest-three\.js/);
  }

  const entry = fs.readFileSync(path.join(ROOT, "web", "shared", "forest-three.js"), "utf8");
  const tiles = fs.readFileSync(path.join(ROOT, "web", "shared", "forest-three", "tiles.js"), "utf8");
  assert.match(entry, /Sixteen per-portal wireframes/);
  assert.match(entry, /forest-three\/tiles\.js\?v=20260717/);
  assert.match(tiles, /'open-overview'\(\)\s*\{/);
  assert.match(tiles, /secondaryColor/);
});

test("SD Forest homepage exposes one truthful animated Open Overview portal", () => {
  const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const portals = home.match(/<button class="portal"/g) || [];
  const matches = home.match(/<button class="portal"[^>]*data-project="open-overview"[\s\S]*?<\/button>/g) || [];
  assert.equal(portals.length, 16);
  assert.match(home, /Portal lattice · 16 nodes/);
  assert.equal(matches.length, 1);

  const portal = matches[0];
  assert.match(portal, /style="--accent:#73e9ff;--accent-secondary:#a9b2ff"/);
  assert.match(portal, /data-href="\/web\/open-overview\/index\.html"/);
  assert.match(portal, /data-status="Public snapshot"/);
  assert.match(portal, /Compare OpenRouter models and apps with GitHub AI ecosystems through ten-deep rankings, observed relationships, lifecycle signals, and clearly labeled source evidence\./);
  assert.match(portal, /<use href="#icon-open-overview"\/>/);
  assert.match(portal, /<span class="portal-name">Open Overview<\/span>/);
  assert.match(portal, /<span class="portal-meta">AI ecosystem radar<\/span>/);
  assert.match(home, /<symbol id="icon-open-overview"[\s\S]*?--accent-secondary, #a9b2ff[\s\S]*?<\/symbol>/);
  assert.match(home, /src="\/web\/shared\/forest-three\.js\?v=20260717"/);
  assert.doesNotMatch(home, /forest-icons\.js/);

  const routeReadme = fs.readFileSync(path.join(ROOT, "web", "open-overview", "README.md"), "utf8");
  const rootReadme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  assert.doesNotMatch(routeReadme, /never changes the SD Forest homepage/);
  assert.match(rootReadme, /web\/open-overview\//);
});

test("strict public contracts preserve exact values and reject unknown keys", async () => {
  const schema = await importRoute("open-overview-schema.js");
  assert.equal(schema.compactIntegerString("90071992547409931234"), "90.0Q");
  assert.equal(schema.exactDecimalString("0.000000123400"), "0.000000123400");
  assert.equal(schema.safePublicUrl("http://127.0.0.1/x"), null);
  assert.equal(schema.safePublicUrl("https://github.com/openai/openai-node").hostname, "github.com");
  assert.throws(() => schema.validateManifest({ schemaVersion: "2.0", publishedAt: null, routes: [], sources: [], provenance: [], window: { start: null, end: null, timezone: "unknown", inclusive: null, basis: "unknown" }, invented: true }, "2"), /schema|field/i);
});

test("schema-v2 parity separates manifest and provenance tiers and validates exact public fields", async () => {
  const schema = await importRoute("open-overview-schema.js");
  const manifest = manifestFixture();
  manifest.sources[0].sourceTier = "supported";
  assert.throws(() => schema.validateManifest(manifest, "2"), /manifest.*tier|source tier/i);

  const supportedProvenance = collection("models", [], "models_current");
  supportedProvenance.provenance[0].sourceTier = "supported";
  assert.equal(schema.validateOpenRouterCollection(supportedProvenance, "models", "2").provenance[0].sourceTier, "supported");

  const invalidCalendar = collection("models", [{
    id: "example/model", canonicalSlug: "example/model", name: "Model", description: "x".repeat(16_384), contentTrust: "untrusted-source",
    createdUnix: "1", contextLength: null, architecture: {}, pricing: {}, supportedParameters: [], expirationDate: "2026-02-29",
    lifecycleState: "scheduled_deprecation", freeKind: "paid_or_unknown", weeklyRank: 1, rankMethod: "response_order"
  }]);
  assert.throws(() => schema.validateOpenRouterCollection(invalidCalendar, "models", "2"), /ISO date|expirationDate/i);
  invalidCalendar.data[0].expirationDate = null;
  assert.doesNotThrow(() => schema.validateOpenRouterCollection(invalidCalendar, "models", "2"));
  invalidCalendar.data[0].description += "x";
  assert.throws(() => schema.validateOpenRouterCollection(invalidCalendar, "models", "2"), /16384|bounded length/i);

  invalidCalendar.data[0].description = null;
  invalidCalendar.data[0].architecture = { nested: { access_code: "private" } };
  assert.throws(() => schema.validateOpenRouterCollection(invalidCalendar, "models", "2"), /forbidden public field|access_code/i);
  const invalidTime = collection("models", []);
  invalidTime.provenance[0].fetchedAt = "2026-07-15 00:00:00Z";
  assert.throws(() => schema.validateOpenRouterCollection(invalidTime, "models", "2"), /ISO datetime|fetchedAt/i);
});

test("current GitHub and app-model matrix fixtures validate exactly", async () => {
  const schema = await importRoute("open-overview-schema.js");
  const github = schema.validateGitHubRanking(readFixture("plan03-github-ranking.json"), "2");
  const matrix = schema.validateAppModelMatrix(readFixture("plan05-app-model-matrix.json"), "2");
  assert.equal(github.metricEvidence[0].repositoryId, github.data[0].repositoryId);
  assert.equal(github.coverage.stale, false);
  assert.equal(matrix.apps[0].appName, "Example App");
  assert.equal(matrix.models[0].modelName, "Example Model");
  const lexicalInteger = readFixture("plan03-github-ranking.json");
  lexicalInteger.metricEvidence[0].starDelta = "-0002";
  assert.throws(() => schema.validateGitHubRanking(lexicalInteger, "2"), /canonical|integer|starDelta/i);
});

test("current per-app and GitHub enrichment contracts validate exact evidence", async () => {
  const schema = await importRoute("open-overview-schema.js");
  const period = { start: "2026-07-14", end: "2026-07-14", unit: "day", inclusive: true };
  const provenance = [{ sourceId: "openrouter.app-models.1001", sourceTier: "best_effort", runId: "60000000-0000-4000-8000-000000001001", fetchedAt: "2026-07-15T02:00:00.000Z", sourceAsOf: "2026-07-14T23:59:59.000Z", transformVersion: "openrouter-app-model-daily-v1", citation: "https://openrouter.ai/apps/1001" }];
  const appModels = {
    schemaVersion: "2.0", status: "available", watermark: provenance[0].runId,
    lastSuccessAt: "2026-07-15T02:00:00.000Z", stale: false, staleAfterSeconds: 172800,
    completeness: { acquisitionComplete: true, populationCompleteness: "partial_or_unknown", missingFields: [] },
    appId: "1001", appName: "Example App", resolvedPeriod: period,
    data: [{ modelId: "example/model", sourcePermaslug: "example/model:free", resolvedModelId: "example/model", matchMethod: "source_model_id", rank: 1, rankMethod: "locally_calculated", totalTokens: "90071992547409931234", metricSemantics: "observed_daily_total_tokens", evidenceUrl: "https://openrouter.ai/apps/1001", period }],
    cursor: null, coverage: { observedModels: 1, mappedModels: 1, unmappedModels: 0, populationCompleteness: "partial_or_unknown" }, provenance
  };
  assert.equal(schema.validateAppModels(appModels, "2").data[0].sourcePermaslug, "example/model:free");
  const enrichment = {
    schemaVersion: "2.0", repositoryId: "9007199254740993",
    requestRange: { from: "2025-07-15", to: "2026-07-14" },
    releaseCadence: { latestStableReleaseAt: "2026-07-12T12:00:00.000Z", stableReleaseCount90d: "4", medianStableReleaseIntervalDays365d: "21.5", coverageStart: "2025-07-15", coverageEnd: "2026-07-14", coverageComplete: true },
    starBuckets: Array.from({ length: 7 }, (_, index) => ({ start: `2026-07-${String(index + 8).padStart(2, "0")}`, end: `2026-07-${String(index + 8).padStart(2, "0")}`, count: String(index), populationCompleteness: "partial_or_unknown" })),
    provenance: [{ id: "40000000-0000-4000-8000-000000000001:releases", sourceUrl: "https://api.github.com/repositories/9007199254740993/releases", fetchedAt: "2026-07-15T02:00:00.000Z" }]
  };
  assert.equal(schema.validateGitHubEnrichment(enrichment, "2").starBuckets.length, 7);
  assert.equal(schema.validateGitHubEnrichment({ ...enrichment, starBuckets: [{ ...enrichment.starBuckets[0], start: "2026-07-08", end: "2026-07-09" }] }, "2").starBuckets[0].end, "2026-07-09");
  assert.throws(() => schema.validateGitHubEnrichment({ ...enrichment, repositoryId: "09007199254740993" }, "2"), /canonical|repositoryId/i);
  assert.throws(() => schema.validateGitHubEnrichment({ ...enrichment, starBuckets: [{ ...enrichment.starBuckets[0], count: "00" }] }, "2"), /canonical|count|integer/i);
  assert.throws(() => schema.validateGitHubEnrichment({ ...enrichment, starBuckets: [{ ...enrichment.starBuckets[0], start: "2026-07-10", end: "2026-07-09" }] }, "2"), /bucket|range|start|end/i);
  assert.throws(() => schema.validateGitHubEnrichment({ ...enrichment, starBuckets: [{ ...enrichment.starBuckets[0], start: "2025-07-14", end: "2025-07-14" }] }, "2"), /bucket|range/i);
});

test("API inventories both free frontiers and bounds dynamic app/repository enrichment", async () => {
  const api = await importRoute("open-overview-api.js");
  assert.match(api.ENDPOINTS.freeFrontierQualityThroughput, /x=benchmarkQuality.*y=medianThroughput/);
  assert.match(api.ENDPOINTS.freeFrontierContextPopularity, /x=contextLength.*y=weeklyPopularityRank/);
  const apps = { data: Array.from({ length: 12 }, (_, index) => ({ appId: String(index + 1), appName: `App ${index + 1}` })) };
  assert.deepEqual(api.topAppModelRequests(apps).map((request) => request.path), Array.from({ length: 10 }, (_, index) => api.ENDPOINTS.appModels(String(index + 1))));
  const rankings = Array.from({ length: 9 }, (_, categoryIndex) => ({ ranking: { metric: "maintenance" }, coverage: { resolvedAsOf: "2026-07-14" }, data: Array.from({ length: 11 }, (_, rowIndex) => ({ repositoryId: String(categoryIndex * 10 + rowIndex + 1) })) }));
  const enrichment = api.topGitHubEnrichmentRequests(rankings);
  assert.equal(enrichment.length, 80);
  assert.match(enrichment[0].path, /from=2025-07-15/);
  assert.match(enrichment[0].path, /to=2026-07-14/);
  assert.throws(() => api.ENDPOINTS.githubEnrichment("01", "2025-07-15", "2026-07-14"), /repositoryId|canonical/i);
  let active = 0; let maximum = 0;
  await api.mapBounded(Array.from({ length: 20 }, (_, index) => index), 6, async (value) => { active += 1; maximum = Math.max(maximum, active); await new Promise((resolve) => setTimeout(resolve, 1)); active -= 1; return value; });
  assert.equal(maximum, 6);
});

test("matrix validation rejects incoherent axes, cells, and coverage", async () => {
  const { validateAppModelMatrix } = await importRoute("open-overview-schema.js");
  const fixture = readFixture("plan05-app-model-matrix.json");
  const duplicateAxis = { ...fixture, appIds: ["1001", "1001"], apps: [...fixture.apps, fixture.apps[0]], coverage: { ...fixture.coverage, possibleCells: 2 }, cells: [...fixture.cells, fixture.cells[0]] };
  assert.throws(() => validateAppModelMatrix(duplicateAxis, "2"), /duplicate|unique/i);
  const outOfAxis = { ...fixture, cells: [{ ...fixture.cells[0], modelId: "outside/model" }] };
  assert.throws(() => validateAppModelMatrix(outOfAxis, "2"), /axis|modelId/i);
  const wrongCoverage = { ...fixture, coverage: { ...fixture.coverage, observedCells: 0, possibleCells: 9 } };
  assert.throws(() => validateAppModelMatrix(wrongCoverage, "2"), /coverage|possibleCells|observedCells/i);
  const missingCell = { ...fixture, cells: [] };
  assert.throws(() => validateAppModelMatrix(missingCell, "2"), /cell|grid|coverage/i);
  const emptyEvidenceLabel = { ...fixture, apps: [{ ...fixture.apps[0], appName: "" }] };
  assert.throws(() => validateAppModelMatrix(emptyEvidenceLabel, "2"), /appName|empty|length/i);
});

test("public validation bounds untrusted text and collection cardinality", async () => {
  const schema = await importRoute("open-overview-schema.js");
  const github = readFixture("plan03-github-ranking.json");
  github.data[0].fullName = "x".repeat(4097);
  assert.throws(() => schema.validateGitHubRanking(github, "2"), /length|bounded|4096/i);
  const tooManyApps = collection("apps", Array.from({ length: 201 }, (_, index) => ({ appId: String(index + 1), appName: `App ${index}`, rank: index + 1, totalTokens: "0", totalRequests: "0" })), "apps_ranked");
  assert.throws(() => schema.validateOpenRouterCollection(tooManyApps, "apps", "2"), /200|many|bounded/i);

  const bundle = JSON.parse(read("fallback-data.json"));
  const models = Object.values(bundle.responses).find((response) => response?.data?.[0]?.architecture);
  const nestedArchitecture = structuredClone(models);
  nestedArchitecture.data[0].architecture = { modalities: Array.from({ length: 257 }, () => "text") };
  assert.throws(() => schema.validateOpenRouterCollection(nestedArchitecture, "models", "2"), /architecture|array|bounded|public json/i);

  const history = structuredClone(Object.values(bundle.responses).find((response) => response?.status === "available" && response?.data?.modelUsage));
  history.data.modelUsage[0].rows = Array.from({ length: 201 }, () => structuredClone(history.data.modelUsage[0].rows[0]));
  assert.throws(() => schema.validateHistory(history, "2"), /history|rows|bounded|200/i);

  const manifest = structuredClone(bundle.manifest);
  manifest.routes = Array.from({ length: 201 }, (_, index) => `/api/public/v2/example-${index}`);
  assert.throws(() => schema.validateManifest(manifest, "2"), /manifest|routes|bounded|200/i);
});

test("matrix cell model distinguishes observed zero from unknown", async () => {
  const charts = await importRoute("open-overview-charts.js");
  assert.deepEqual(charts.matrixCellModel({ state: "observed", totalTokens: "0", rankWithinPeriod: 1, evidenceUrl: "https://openrouter.ai/" }), { state: "observed", label: "0", exact: "0", rank: 1, reason: null, evidenceUrl: "https://openrouter.ai/" });
  assert.deepEqual(charts.matrixCellModel({ state: "unknown", reason: "not_observed" }), { state: "unknown", label: "?", exact: null, rank: null, reason: "not_observed", evidenceUrl: null });
  assert.equal(charts.validIsoTime("2026-02-29"), false);
  assert.equal(charts.validIsoTime("2026-02-29T00:00:00Z"), false);
  assert.equal(charts.validIsoTime("not-a-date"), false);
  assert.equal(charts.validIsoTime("2026-07-15T12:00:00Z"), true);
});

test("matrix labels are owned by the matrix evidence contract", async () => {
  const charts = await importRoute("open-overview-charts.js");
  const names = charts.matrixAxisNameMaps(
    { apps: [{ appId: "1", appName: "Evidence App" }], models: [{ modelId: "m", modelName: "Evidence Model" }] },
    [{ appId: "1", appName: "Unrelated ranking label" }],
    [{ id: "m", name: "Unrelated catalog label" }]
  );
  assert.equal(names.appNames.get("1"), "Evidence App");
  assert.equal(names.modelNames.get("m"), "Evidence Model");
});

test("matrix roving navigation stays inside the reviewed grid", async () => {
  const charts = await importRoute("open-overview-charts.js");
  assert.equal(charts.matrixNavigationTarget(0, 2, 3, "ArrowLeft"), 0);
  assert.equal(charts.matrixNavigationTarget(2, 2, 3, "ArrowRight"), 2);
  assert.equal(charts.matrixNavigationTarget(1, 2, 3, "ArrowDown"), 4);
  assert.equal(charts.matrixNavigationTarget(4, 2, 3, "ArrowUp"), 1);
  assert.equal(charts.matrixNavigationTarget(4, 2, 3, "Home"), 3);
  assert.equal(charts.matrixNavigationTarget(4, 2, 3, "End"), 5);
  assert.equal(charts.matrixNavigationTarget(4, 2, 3, "Escape"), null);
});

test("URL state is bounded to reviewed routes", async () => {
  const app = await importRoute("open-overview.js");
  assert.deepEqual(app.parseOpenRouterState("https://site.test/?view=bogus&app=secret"), { view: "usage", appId: null, freeMode: "popularity" });
  assert.deepEqual(app.parseGithubState("https://site.test/?category=bogus&metric=bogus&window=365"), { category: "ai-harnesses", metric: "adoption", windowDays: 7 });
});

test("source aggregation exposes required and optional failures plus typed unavailability", async () => {
  const app = await importRoute("open-overview.js");
  const optionalOnly = {
    mode: "live",
    snapshotStale: false,
    manifest: { sources: [] },
    responses: { matrix: { status: "unavailable", reason: "collection_disabled", lastSuccessAt: null, appIds: [], modelIds: [], cells: [] } },
    errors: { providers: Object.assign(new Error("Provider failed"), { code: "unavailable" }) }
  };
  const rows = app.buildSourceRows(optionalOnly);
  assert.deepEqual(rows.map((row) => [row.datasetKey, row.completeness, row.required]), [
    ["matrix", "unavailable", false],
    ["providers", "unavailable", false]
  ]);
  assert.equal(app.summarizeSourceRows(rows).completeness, "partial");
  const requiredFailure = { ...optionalOnly, responses: {}, errors: { models: Object.assign(new Error("Models failed"), { code: "unavailable" }) } };
  assert.equal(app.summarizeSourceRows(app.buildSourceRows(requiredFailure)).completeness, "unavailable");
});

test("successful provenance absent from the manifest cannot report live current complete", async () => {
  const app = await importRoute("open-overview.js");
  const response = collection("models", [], "unmanifested_source");
  const view = { mode: "live", snapshotStale: false, manifest: manifestFixture(), responses: { providers: response }, errors: {} };
  const row = app.buildSourceRows(view).find((item) => item.datasetKey === "providers");
  assert.ok(row);
  assert.equal(row.completeness, "unavailable");
  assert.equal(row.freshness, "stale");
  assert.equal(row.reason, "provenance_not_in_manifest");
  assert.notDeepEqual(app.summarizeSourceRows(app.buildSourceRows(view)), { freshness: "current", completeness: "complete" });
});

test("history presentation requires eight consecutive complete days and bounds exact rows", async () => {
  const app = await importRoute("open-overview.js");
  const bucket = (date, complete = true, count = 12) => ({ date, complete, rows: Array.from({ length: count }, (_, index) => ({ id: `id-${index}`, label: `Item ${index}`, scope: null, rank: index + 1, value: String(index), remainder: null, stars: null, forks: null })) });
  const seven = Array.from({ length: 7 }, (_, index) => bucket(`2026-07-${String(index + 1).padStart(2, "0")}`));
  const short = app.historySeriesModel(seven);
  assert.equal(short.sparklineEligible, false);
  assert.equal(short.reason, "requires_8_consecutive_complete_days");
  assert.equal(short.exactRows.length, 70);
  const eight = [...seven, bucket("2026-07-08")];
  assert.equal(app.historySeriesModel(eight).sparklineEligible, true);
  const gap = [...seven.slice(0, 6), bucket("2026-07-08"), bucket("2026-07-09")];
  assert.equal(app.historySeriesModel(gap).sparklineEligible, false);
  const bounded = app.historySeriesModel(Array.from({ length: 120 }, (_, index) => bucket(new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10))));
  assert.equal(bounded.buckets.length, 90);
  assert.equal(bounded.exactRows.length, 900);
});

test("eligible history produces positive stacked-area, bump, and category small-multiple geometry", async () => {
  const charts = await importRoute("open-overview-charts.js");
  const buckets = Array.from({ length: 8 }, (_, day) => ({
    date: `2026-07-${String(day + 1).padStart(2, "0")}`,
    complete: true,
    rows: Array.from({ length: 10 }, (_, index) => ({
      id: `model-${index + 1}`, label: `Model ${index + 1}`, scope: null, rank: index + 1,
      value: String(1_000 - index * 40 + day * 10), remainder: index === 0 ? String(120 + day) : null,
      stars: null, forks: null
    }))
  }));
  const area = charts.stackedAreaGeometry(buckets);
  assert.equal(area.series.length, 11);
  assert.equal(area.series.at(-1).label, "Other");
  assert.ok(area.series.every((series) => /^M/.test(series.path) && /Z$/.test(series.path) && !/NaN|Infinity/.test(series.path)));
  const bump = charts.bumpChartGeometry(buckets);
  assert.equal(bump.series.length, 10);
  assert.ok(bump.series.every((series) => /^M/.test(series.path) && !/NaN|Infinity/.test(series.path)));
  const scoped = buckets.map((bucket, bucketIndex) => ({ ...bucket, rows: bucket.rows.slice(0, 6).map((row, index) => ({ ...row, scope: index < 3 ? "mcp" : "inference", stars: String(1_000 + index * 100 + bucketIndex * 10), forks: String(100 + index * 10 + bucketIndex) })) }));
  const multiples = charts.githubSmallMultiplesGeometry(scoped);
  assert.deepEqual(multiples.multiples.map((item) => item.scope), ["inference", "mcp"]);
  assert.ok(multiples.multiples.every((item) => item.series.length === 3 && item.series.every((series) => /^M/.test(series.path) && !/NaN|Infinity/.test(series.path))));
});

test("stacked history keeps exactly ten current models and folds rank turnover into Other", async () => {
  const charts = await importRoute("open-overview-charts.js");
  const makeRows = (day) => Array.from({ length: 10 }, (_, index) => ({
    id: day === 0 && index === 9 ? "former-model" : `model-${index + 1}`,
    label: day === 0 && index === 9 ? "Former model" : `Model ${index + 1}`,
    scope: null,
    rank: index + 1,
    value: day === 0 && index === 9 ? "300" : String(1_000 - index * 40),
    remainder: null,
    stars: null,
    forks: null,
  }));
  const buckets = Array.from({ length: 8 }, (_, day) => ({
    date: `2026-07-${String(day + 1).padStart(2, "0")}`,
    complete: true,
    rows: [...makeRows(day), { id: "other", label: "Other", scope: null, rank: null, value: day === 0 ? "60" : "50", remainder: null, stars: null, forks: null }],
  }));
  const geometry = charts.stackedAreaGeometry(buckets);
  assert.equal(geometry.series.length, 11);
  assert.deepEqual(geometry.series.slice(0, 10).map((series) => series.id), Array.from({ length: 10 }, (_, index) => `model-${index + 1}`));
  assert.equal(geometry.series.at(-1).id, "other");
  assert.equal(geometry.series.at(-1).values[0], "360");
  assert.equal(geometry.series.at(-1).values.at(-1), "50");
});

test("GitHub history geometry publishes stars, forks, and exact full-window deltas", async () => {
  const charts = await importRoute("open-overview-charts.js");
  const buckets = Array.from({ length: 8 }, (_, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    complete: true,
    rows: [{ id: "repo-1", label: "example/repo", scope: "mcp", rank: 1, value: "1", remainder: null, stars: String(100 + index * 5), forks: String(20 + index * 2) }],
  }));
  const geometry = charts.githubSmallMultiplesGeometry(buckets);
  assert.equal(geometry.multiples[0].series[0].starDelta, "35");
  assert.equal(geometry.multiples[0].series[0].forkDelta, "14");
  assert.match(geometry.multiples[0].series[0].starsPath, /^M/);
  assert.match(geometry.multiples[0].series[0].forksPath, /^M/);
  const missing = structuredClone(buckets); missing[3].rows[0].forks = null;
  assert.equal(charts.githubSmallMultiplesGeometry(missing), null);
});

test("Release-1 presentation models preserve source-published evidence without cross-source scoring", async () => {
  const app = await importRoute("open-overview.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  const appModels = Object.values(bundle.responses).find((response) => response?.status === "available" && response?.appId === "1001");
  const appEvidence = app.appModelPresentation(appModels);
  assert.equal(appEvidence.models.length, 3);
  assert.equal(appEvidence.models[0].rank, 1);
  assert.match(appEvidence.coverageLabel, /mapped.*unmapped.*partial|mapped.*unmapped.*full/i);

  const tasks = bundle.responses["/tasks?limit=50&window=7d"].data;
  const taskEvidence = app.taskModelPresentation(tasks[0]);
  assert.deepEqual(taskEvidence.models.map((model) => model.sourcePosition), [1, 2, 3]);
  assert.equal(taskEvidence.complete, false);

  const deprecation = { modelId: "example/model", state: "scheduled_deprecation", expirationDate: "2026-08-01", firstObservedAt: "2026-07-01T00:00:00.000Z", lastObservedAt: "2026-07-15T00:00:00.000Z", evidenceRunId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
  assert.deepEqual(app.lifecycleTimelineModel([deprecation])[0], { modelId: "example/model", state: "scheduled_deprecation", firstObservedAt: "2026-07-01T00:00:00.000Z", lastObservedAt: "2026-07-15T00:00:00.000Z", expirationDate: "2026-08-01" });

  const benchmarkRows = bundle.responses["/benchmarks?limit=50"].data;
  const benchmarkRegions = app.benchmarkSourceRegions(benchmarkRows);
  assert.deepEqual(benchmarkRegions.map((region) => region.source), ["artificial-analysis", "design-arena"]);
  assert.ok(benchmarkRegions.every((region) => region.rows.every((row, index) => row.sourceRank === index + 1 && row.source === region.source)));
});

test("Three.js is route-local, dynamic, deterministic and bounded", async () => {
  const main = read("open-overview.js");
  const threeSource = read("open-overview-three.js");
  assert.doesNotMatch(main, /from\s+["']\.\/open-overview-three\.js["']/);
  assert.match(main, /import\(["']\.\/open-overview-three\.js["']\)/);
  assert.match(threeSource, /\/web\/vendor\/three\/three\.module\.min\.js/);
  const three = await importRoute("open-overview-three.js");
  assert.deepEqual(three.deterministicLayout("repository:1", 2, 10, "repository"), three.deterministicLayout("repository:1", 2, 10, "repository"));
});

test("route assets expose no secret or private-message field names", () => {
  const forbidden = /OPENROUTER_API_KEY|GITHUB_TOKEN|DATABASE_URL|CRON_SECRET|sender|subject|snippet|threadId|accessCode/i;
  for (const file of ["config.json", "open-overview.js", "open-overview-api.js", "open-overview-schema.js", "open-overview-charts.js", "open-overview-three.js"]) assert.doesNotMatch(read(file), forbidden, file);
});

const RUNS = {
  models_current: "11111111-1111-4111-8111-111111111111",
  apps_ranked: "22222222-2222-4222-8222-222222222222"
};
const provenance = (sourceId) => [{ sourceId, sourceTier: "stable", runId: RUNS[sourceId], fetchedAt: "2026-07-15T00:00:00Z", sourceAsOf: "2026-07-15T00:00:00Z", transformVersion: "public-v2", citation: "Public source" }];
const manifestFixture = () => ({
  schemaVersion: "2.0", publishedAt: "2026-07-15T00:00:00Z", routes: ["/api/public/v2/manifest", "/api/public/v2/models"],
  sources: Object.entries(RUNS).map(([sourceId, runId]) => ({ sourceId, sourceTier: "stable", cadenceSeconds: 86400, staleAfterSeconds: 172800, publishedRunId: runId, publishedAt: "2026-07-15T00:00:00Z", nextScheduledAt: "2026-07-16T00:00:00Z", stale: false, transformVersion: "public-v2", citationUrl: "https://openrouter.ai/", lastAttemptRunId: runId, lastAttemptStatus: "published", lastAttemptStartedAt: "2026-07-15T00:00:00Z", lastAttemptFinishedAt: "2026-07-15T00:00:00Z", lastAttemptErrorCode: null, lastAttemptAcquisitionComplete: true, lastAttemptPopulationCompleteness: "full" })),
  provenance: [], window: { start: null, end: null, timezone: "unknown", inclusive: null, basis: "unknown" }
});
const collection = (kind, data, sourceId = "models_current") => ({ schemaVersion: "2.0", data, cursor: null, window: kind === "apps" ? { start: "2026-06-16", end: "2026-07-15", timezone: "UTC", inclusive: true, basis: "source_meta" } : { start: "2026-07-15", end: "2026-07-15", timezone: "UTC", inclusive: true, basis: "source_meta" }, completeness: { acquisitionComplete: true, populationCompleteness: "full", missingFields: [] }, stale: false, rank: kind === "models" ? { metric: "weekly_popularity", unit: "response_order", direction: "asc", rankMethod: "response_order", baseline: null, eligiblePopulation: "10", ruleVersion: "models-v1", taxonomyVersion: null } : null, provenance: provenance(sourceId), ...(kind === "apps" ? { requestSlice: { period: "30d", sort: "popular", category: null, subcategory: null, limit: 100 } } : {}) });

const freeFixtureEnvelope = () => {
  const bundle = JSON.parse(read("fallback-data.json"));
  const entry = Object.entries(bundle.responses).find(([key]) => key.startsWith("/free-models?"));
  assert.ok(entry, "free-model fixture response");
  return structuredClone(entry[1]);
};

const freePage = (base, data, cursor, total = data.length) => ({
  ...structuredClone(base),
  data,
  cursor,
  concreteFreeCount: String(total),
  rank: base.rank ? { ...base.rank, eligiblePopulation: String(total) } : null
});

test("free-model inventory requests the maximum public page size", async () => {
  const { ENDPOINTS } = await importRoute("open-overview-api.js");
  assert.equal(ENDPOINTS.freeModels, "/free-models?limit=200");
});

test("free-model inventory follows opaque cursors and merges pages in returned order", async () => {
  const api = await importRoute("open-overview-api.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  const base = freeFixtureEnvelope();
  const cursor = "opaque+/= token";
  const pages = [freePage(base, [base.data[0]], cursor, 2), freePage(base, [base.data[1]], null, 2)];
  const calls = [];
  const fetchImpl = async (input) => {
    const url = new URL(input); calls.push(url.href);
    if (url.pathname.endsWith("/manifest")) return new Response(JSON.stringify(bundle.manifest), { status: 200 });
    const page = url.searchParams.has("cursor") ? pages[1] : pages[0];
    return new Response(JSON.stringify(page), { status: 200 });
  };
  const client = api.createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl });
  const spec = { key: "free", path: "/free-models?limit=200", kind: "free", sourceId: "models_current" };
  const view = await client.loadView([spec]);
  assert.deepEqual(view.responses.free.data.map((row) => row.id), [base.data[0].id, base.data[1].id]);
  assert.equal(view.responses.free.cursor, null);
  assert.equal(calls.filter((url) => url.includes("/free-models?")).length, 2);
  assert.ok(calls.some((url) => url.includes("cursor=opaque%2B%2F%3D+token")));
});

test("free-model pagination rejects a repeated opaque cursor", async () => {
  const api = await importRoute("open-overview-api.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  const base = freeFixtureEnvelope();
  const pages = [freePage(base, [base.data[0]], "repeat", 2), freePage(base, [base.data[1]], "repeat", 2)];
  const client = api.createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl: async (input) => {
    const url = new URL(input);
    return new Response(JSON.stringify(url.pathname.endsWith("/manifest") ? bundle.manifest : url.searchParams.has("cursor") ? pages[1] : pages[0]), { status: 200 });
  } });
  const view = await client.loadView([{ key: "free", path: "/free-models?limit=200", kind: "free", sourceId: "models_current" }]);
  assert.equal(view.responses.free, undefined);
  assert.equal(view.errors.free.code, "pagination_loop");
});

test("free-model pagination rejects mixed page provenance", async () => {
  const api = await importRoute("open-overview-api.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  const base = freeFixtureEnvelope();
  const first = freePage(base, [base.data[0]], "next", 2);
  const second = freePage(base, [base.data[1]], null, 2);
  second.provenance = second.provenance.map((item) => ({ ...item, fetchedAt: "2026-07-15T10:00:01.000Z" }));
  const client = api.createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl: async (input) => {
    const url = new URL(input);
    const body = url.pathname.endsWith("/manifest") ? bundle.manifest : url.searchParams.has("cursor") ? second : first;
    return new Response(JSON.stringify(body), { status: 200 });
  } });
  const view = await client.loadView([{ key: "free", path: "/free-models?limit=200", kind: "free", sourceId: "models_current" }]);
  assert.equal(view.responses.free, undefined);
  assert.equal(view.errors.free.code, "mixed_snapshot");
  assert.match(view.errors.free.message, /page|provenance|identity/i);
});

test("free-model pagination rejects duplicate rows across pages", async () => {
  const api = await importRoute("open-overview-api.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  const base = freeFixtureEnvelope();
  const pages = [freePage(base, [base.data[0]], "next", 2), freePage(base, [base.data[0]], null, 2)];
  const client = api.createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl: async (input) => {
    const url = new URL(input);
    const body = url.pathname.endsWith("/manifest") ? bundle.manifest : url.searchParams.has("cursor") ? pages[1] : pages[0];
    return new Response(JSON.stringify(body), { status: 200 });
  } });
  const view = await client.loadView([{ key: "free", path: "/free-models?limit=200", kind: "free", sourceId: "models_current" }]);
  assert.equal(view.responses.free, undefined);
  assert.equal(view.errors.free.code, "pagination_duplicate");
});

test("free-model pagination is bounded to ten pages and two thousand rows", async () => {
  const api = await importRoute("open-overview-api.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  const base = freeFixtureEnvelope();
  let freeCalls = 0;
  const client = api.createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl: async (input) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/manifest")) return new Response(JSON.stringify(bundle.manifest), { status: 200 });
    const pageIndex = freeCalls++;
    const rows = Array.from({ length: 200 }, (_, rowIndex) => {
      const ordinal = pageIndex * 200 + rowIndex + 1;
      return { ...structuredClone(base.data[0]), id: `fixture/free-${ordinal}`, canonicalSlug: `fixture/free-${ordinal}`, name: `Free ${ordinal}`, weeklyRank: ordinal };
    });
    return new Response(JSON.stringify(freePage(base, rows, `cursor-${pageIndex + 1}`, 2001)), { status: 200 });
  } });
  const view = await client.loadView([{ key: "free", path: "/free-models?limit=200", kind: "free", sourceId: "models_current" }]);
  assert.equal(view.responses.free, undefined);
  assert.equal(view.errors.free.code, "pagination_limit");
  assert.equal(freeCalls, 10);
});

test("API client owns conditional bodies and rejects mixed publication runs", async () => {
  const { createOpenOverviewClient } = await importRoute("open-overview-api.js");
  const { validateManifest } = await importRoute("open-overview-schema.js");
  const calls = [];
  const responses = [new Response(JSON.stringify(collection("models", [])), { status: 200, headers: { ETag: '"models-1"' } }), new Response(null, { status: 304 })];
  const client = createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, conditionalRequests: true, fetchImpl: async (_url, options) => { calls.push(new Headers(options.headers)); return responses.shift(); } });
  const spec = { key: "models", path: "/models?limit=10&rank_source=top-weekly", kind: "models", sourceId: "models_current" };
  const manifest = validateManifest(manifestFixture(), "2");
  const first = await client.load(spec, manifest); const second = await client.load(spec, manifest);
  assert.equal(second, first); assert.equal(calls[0].has("If-None-Match"), false); assert.equal(calls[1].get("If-None-Match"), '"models-1"');
});

test("fallback HTTP reads are redirect-safe, no-store, bounded to 4 MiB and validate Last-Modified", async () => {
  const api = await importRoute("open-overview-api.js");
  await assert.rejects(
    () => api.readFallbackResponse(new Response("{}", { headers: { "Last-Modified": "not-a-date" } }), new Date("2026-07-15T12:00:00Z")),
    (error) => error.code === "invalid_fallback" && /Last-Modified/i.test(error.message)
  );
  await assert.rejects(
    () => api.readFallbackResponse(new Response("{}", { headers: { "Content-Length": String(4 * 1024 * 1024 + 1), "Last-Modified": "Wed, 15 Jul 2026 11:00:00 GMT" } }), new Date("2026-07-15T12:00:00Z")),
    (error) => error.code === "response_too_large"
  );
  const calls = [];
  const client = api.createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, fallbackUrl: "/fallback-data.json", fallbackOnMissingV2: true, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/api/public/v2/manifest")) return new Response("<html>missing</html>", { status: 404, headers: { "Content-Type": "text/html" } });
    return new Response("{}", { status: 200, headers: { "Content-Length": String(4 * 1024 * 1024 + 1), "Last-Modified": "Wed, 15 Jul 2026 11:00:00 GMT" } });
  } });
  await assert.rejects(() => client.loadView([]), (error) => error.code === "response_too_large");
  const fallbackCall = calls.find((call) => call.url.endsWith("/fallback-data.json"));
  assert.equal(fallbackCall.options.redirect, "error");
  assert.equal(fallbackCall.options.cache, "no-store");
  assert.equal(fallbackCall.options.credentials, "omit");
});

test("config reads are timeout-bounded and a verified fallback is cached per client", async () => {
  const app = await importRoute("open-overview.js");
  await assert.rejects(
    () => app.readConfig((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true })), 100),
    /timed out/i
  );
  const { createOpenOverviewClient, OVERVIEW_REQUESTS } = await importRoute("open-overview-api.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  let fallbackReads = 0;
  const client = createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, fallbackUrl: "/fallback-data.json", fallbackOnMissingV2: true, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl: async (url) => {
    if (String(url).endsWith("/fallback-data.json")) { fallbackReads += 1; return new Response(JSON.stringify(bundle), { status: 200 }); }
    return new Response("missing", { status: 404, headers: { "Content-Type": "text/html" } });
  } });
  assert.equal((await client.loadView(OVERVIEW_REQUESTS)).mode, "snapshot");
  assert.equal((await client.loadView(OVERVIEW_REQUESTS)).mode, "snapshot");
  assert.equal(fallbackReads, 1);
});

test("committed fallback is checksum-valid, complete, ten-deep and unambiguously snapshot mode", async () => {
  const { verifyFallbackBundle, OVERVIEW_REQUESTS, ENDPOINTS, GITHUB_CATEGORIES } = await importRoute("open-overview-api.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  const verified = await verifyFallbackBundle(bundle, OVERVIEW_REQUESTS, "2", new Date("2026-07-15T12:00:00Z"));
  assert.equal(verified.mode, "snapshot");
  assert.equal(verified.responses.models.data.length, 10);
  assert.equal(verified.responses.apps.data.length, 10);
  assert.equal(verified.responses.matrix.status, "available");
  assert.equal(verified.responses.matrix.cells.length, 100);
  for (const [slug] of GITHUB_CATEGORIES) assert.equal(verified.responses[`github:${slug}`].data.length, 10);
  for (const app of verified.responses.apps.data) assert.ok(bundle.responses[Object.keys(bundle.responses).find((key) => key === ENDPOINTS.appModels(app.appId).replace("?limit=100", "?limit=100"))]);
});

test("built artifact includes every direct route and core stays within budget", () => {
  const zlib = require("node:zlib");
  const output = path.join(ROOT, "vercel-public", "web", "open-overview");
  for (const relative of ["index.html", "openrouter/index.html", "github/index.html", "open-overview.css", "open-overview.js", "open-overview-api.js", "open-overview-schema.js", "open-overview-charts.js", "open-overview-three.js", "fallback-data.json", "config.json"]) assert.equal(fs.existsSync(path.join(output, ...relative.split("/"))), true, relative);
  const core = ["open-overview.js", "open-overview-api.js", "open-overview-schema.js", "open-overview-charts.js", "open-overview.css"].map((file) => fs.readFileSync(path.join(ROUTE, file)));
  assert.ok(zlib.gzipSync(Buffer.concat(core), { level: 9 }).length < 100 * 1024);
  assert.doesNotMatch(read("open-overview-charts.js"), /\.innerHTML\s*=/);
});

test("missing-v2 fixture policy is local-only while schema drift always fails closed", async () => {
  const { createOpenOverviewClient, OVERVIEW_REQUESTS } = await importRoute("open-overview-api.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  let fallbackReads = 0;
  const fetchImpl = async (url) => {
    if (String(url).includes("fallback-data.json")) { fallbackReads += 1; return new Response(JSON.stringify(bundle), { status: 200 }); }
    return new Response("<html>not deployed</html>", { status: 404, headers: { "Content-Type": "text/html" } });
  };
  const production = createOpenOverviewClient({
    apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000,
    fallbackUrl: "/web/open-overview/fallback-data.json", fallbackOnMissingV2: true, runtimeOrigin: "https://www.sdforest.site", fetchImpl
  });
  await assert.rejects(() => production.loadView(OVERVIEW_REQUESTS), (error) => error.code === "unavailable");
  const local = createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, fallbackUrl: "/web/open-overview/fallback-data.json", fallbackOnMissingV2: true, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl });
  const localView = await local.loadView(OVERVIEW_REQUESTS); assert.equal(localView.mode, "snapshot"); assert.equal(localView.bundleKind, "fixture"); assert.equal(localView.fallbackLabel, "Fixture · stale · non-production"); assert.equal(fallbackReads, 2);

  const drift = createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, fallbackUrl: "/fallback.json", fallbackOnMissingV2: true, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl: async () => new Response(JSON.stringify({ ...bundle.manifest, schemaVersion: "3.0" }), { status: 200 }) });
  await assert.rejects(() => drift.loadView([]), (error) => error.code === "schema_major_mismatch");
});
