const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const ROUTE = path.join(ROOT, "web", "open-overview");
const read = (...parts) => fs.readFileSync(path.join(ROUTE, ...parts), "utf8");
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

test("matrix cell model distinguishes observed zero from unknown", async () => {
  const charts = await importRoute("open-overview-charts.js");
  assert.deepEqual(charts.matrixCellModel({ state: "observed", totalTokens: "0", rankWithinPeriod: 1, evidenceUrl: "https://openrouter.ai/" }), { state: "observed", label: "0", exact: "0", rank: 1, reason: null, evidenceUrl: "https://openrouter.ai/" });
  assert.deepEqual(charts.matrixCellModel({ state: "unknown", reason: "not_observed" }), { state: "unknown", label: "?", exact: null, rank: null, reason: "not_observed", evidenceUrl: null });
});

test("URL state is bounded to reviewed routes", async () => {
  const app = await importRoute("open-overview.js");
  assert.deepEqual(app.parseOpenRouterState("https://site.test/?view=bogus&app=secret"), { view: "usage", appId: null, freeMode: "popularity" });
  assert.deepEqual(app.parseGithubState("https://site.test/?category=bogus&metric=bogus&window=365"), { category: "ai-harnesses", metric: "adoption", windowDays: 7 });
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

test("explicit missing-v2 policy uses the complete snapshot for an undeployed manifest, but not schema drift", async () => {
  const { createOpenOverviewClient, OVERVIEW_REQUESTS } = await importRoute("open-overview-api.js");
  const bundle = JSON.parse(read("fallback-data.json"));
  let fallbackReads = 0;
  const client = createOpenOverviewClient({
    apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000,
    fallbackUrl: "/web/open-overview/fallback-data.json", fallbackOnMissingV2: true,
    fetchImpl: async (url) => {
      if (String(url).includes("fallback-data.json")) { fallbackReads += 1; return new Response(JSON.stringify(bundle), { status: 200 }); }
      return new Response("<html>not deployed</html>", { status: 404, headers: { "Content-Type": "text/html" } });
    }
  });
  assert.equal((await client.loadView(OVERVIEW_REQUESTS)).mode, "snapshot");
  assert.equal(fallbackReads, 1);

  const drift = createOpenOverviewClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, fallbackUrl: "/fallback.json", fallbackOnMissingV2: true, fetchImpl: async () => new Response(JSON.stringify({ ...bundle.manifest, schemaVersion: "3.0" }), { status: 200 }) });
  await assert.rejects(() => drift.loadView([]), (error) => error.code === "schema_major_mismatch");
});
