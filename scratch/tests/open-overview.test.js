const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const ROUTE = path.join(ROOT, "web", "open-overview");
const read = (...parts) => fs.readFileSync(path.join(ROUTE, ...parts), "utf8");
const readFixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
const importRoute = (file) => import(pathToFileURL(path.join(ROUTE, file)).href + `?t=${Date.now()}-${Math.random()}`);

test("three canonical routes are isolated and immutable-home remains clean", () => {
  for (const [file, route] of [["index.html", "overview"], ["openrouter/index.html", "openrouter"], ["github/index.html", "github"]]) {
    const html = read(...file.split("/"));
    assert.match(html, new RegExp(`data-open-overview-route="${route}"`));
    assert.match(html, /href="\/web\/open-overview\/open-overview\.css"/);
    assert.match(html, /src="\/web\/open-overview\/open-overview\.js"/);
    assert.match(html, /id="oo-view-root"/);
    assert.doesNotMatch(html, /forest-three\.js/);
  }
  const result = spawnSync("git", ["diff", "--exit-code", "origin/main", "--", "index.html", "web/shared/"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("strict public contracts preserve exact values and reject unknown keys", async () => {
  const schema = await importRoute("open-overview-schema.js");
  assert.equal(schema.compactIntegerString("90071992547409931234"), "90.0Q");
  assert.equal(schema.exactDecimalString("0.000000123400"), "0.000000123400");
  assert.equal(schema.safePublicUrl("http://127.0.0.1/x"), null);
  assert.equal(schema.safePublicUrl("https://github.com/openai/openai-node").hostname, "github.com");
  assert.throws(() => schema.validateManifest({ schemaVersion: "2.0", publishedAt: null, routes: [], sources: [], provenance: [], window: { start: null, end: null, timezone: "unknown", inclusive: null, basis: "unknown" }, invented: true }, "2"), /schema|field/i);
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
    releaseCadence: { latestStableReleaseAt: "2026-07-12T12:00:00.000Z", stableReleaseCount90d: "4", medianStableReleaseIntervalDays365d: "21.5", coverageStart: "2025-07-15", coverageEnd: "2026-07-14", coverageComplete: true },
    starBuckets: Array.from({ length: 7 }, (_, index) => ({ start: `2026-07-${String(index + 8).padStart(2, "0")}`, end: `2026-07-${String(index + 8).padStart(2, "0")}`, count: String(index), populationCompleteness: "partial_or_unknown" })),
    provenance: [{ id: "40000000-0000-4000-8000-000000000001:releases", sourceUrl: "https://api.github.com/repositories/9007199254740993/releases", fetchedAt: "2026-07-15T02:00:00.000Z" }]
  };
  assert.equal(schema.validateGitHubEnrichment(enrichment, "2").starBuckets.length, 7);
  assert.throws(() => schema.validateGitHubEnrichment({ ...enrichment, repositoryId: "09007199254740993" }, "2"), /canonical|repositoryId/i);
  assert.throws(() => schema.validateGitHubEnrichment({ ...enrichment, starBuckets: [{ ...enrichment.starBuckets[0], count: "00" }] }, "2"), /canonical|count|integer/i);
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
const collection = (kind, data, sourceId = "models_current") => ({ schemaVersion: "2.0", data, cursor: null, window: { start: "2026-07-15", end: "2026-07-15", timezone: "UTC", inclusive: true, basis: "source_meta" }, completeness: { acquisitionComplete: true, populationCompleteness: "full", missingFields: [] }, stale: false, rank: kind === "models" ? { metric: "weekly_popularity", unit: "response_order", direction: "asc", rankMethod: "response_order", baseline: null, eligiblePopulation: "10", ruleVersion: "models-v1", taxonomyVersion: null } : null, provenance: provenance(sourceId) });

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
