const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const ROUTE = path.join(ROOT, "web", "open-overview");
const FALLBACK_PATH = path.join(ROUTE, "fallback-data.json");
const SCRIPT_PATH = path.join(ROOT, "scripts", "sync-open-overview-fallback.mjs");
const importFresh = (file) => import(`${pathToFileURL(file).href}?t=${Date.now()}-${Math.random()}`);
const readFixture = () => JSON.parse(fs.readFileSync(FALLBACK_PATH, "utf8"));

const fallbackPolicyRequests = (api) => [
  { key: "models", path: api.ENDPOINTS.modelsTopWeekly, kind: "models", sourceId: "models_current" },
  { key: "apps", path: api.ENDPOINTS.appsPopular, kind: "apps", sourceId: "apps_ranked" }
];

function liveFixtures(bundle, requiredFetchedAt, optionalFetchedAt, transformVersion) {
  const manifest = structuredClone(bundle.manifest);
  for (const source of manifest.sources) source.transformVersion = transformVersion;
  const rewrite = (response, fetchedAt) => {
    const value = structuredClone(response);
    for (const item of value.provenance || []) {
      item.fetchedAt = fetchedAt;
      item.sourceAsOf = fetchedAt;
      item.transformVersion = transformVersion;
      item.citation = "Public source";
    }
    return value;
  };
  return {
    manifest,
    models: rewrite(bundle.responses["/models?limit=10&rank_source=top-weekly"], requiredFetchedAt),
    apps: rewrite(bundle.responses["/apps?limit=10&period=30d&sort=popular"], optionalFetchedAt)
  };
}

async function buildLiveBundle({ now = new Date("2026-07-15T12:00:00.000Z"), requiredFetchedAt = "2026-07-15T11:00:00.000Z", optionalFetchedAt = "2026-07-15T10:00:00.000Z", transformVersion = "public-v2", timeoutMs = 8000, optionalStale = false, includeGitHubSeed = false } = {}) {
  const api = await importFresh(path.join(ROUTE, "open-overview-api.js"));
  const { buildFallback } = await importFresh(SCRIPT_PATH);
  const source = liveFixtures(readFixture(), requiredFetchedAt, optionalFetchedAt, transformVersion);
  source.apps.stale = optionalStale;
  if (includeGitHubSeed) source.manifest.sources.push({ ...source.manifest.sources[0], sourceId: "github.seed-registry.v1", publishedRunId: "70000000-0000-4000-8000-000000000001", lastAttemptRunId: "70000000-0000-4000-8000-000000000001", transformVersion: "github-seed-materialization-v1", citationUrl: "https://github.com/example/registry" });
  const requests = [
    { key: "requiredModels", path: api.ENDPOINTS.modelsTopWeekly, kind: "models", sourceId: "models_current" },
    { key: "optionalAppsEvidence", path: api.ENDPOINTS.appsPopular, kind: "apps", sourceId: "apps_ranked", optional: true }
  ];
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "oo-fallback-policy-"));
  const outPath = path.join(directory, "fallback.json");
  const fetchImpl = async (input) => {
    const url = new URL(input);
    const relative = `${url.pathname.replace(/^\/api\/public\/v2/, "")}${url.search}`;
    const body = relative === api.ENDPOINTS.manifest
      ? source.manifest
      : relative === api.ENDPOINTS.modelsTopWeekly
        ? source.models
        : relative === api.ENDPOINTS.appsPopular
          ? source.apps
          : null;
    return body ? new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }) : new Response(JSON.stringify({ error: { code: "unavailable", message: "Unavailable", retryable: true } }), { status: 503, headers: { "Content-Type": "application/json" } });
  };
  const bundle = await buildFallback({ apiBase: "https://api.example.test", outPath, maxAgeHours: 48, requireLive: true, now, fetchImpl, requests, timeoutMs });
  return { api, bundle, requests, directory };
}

test("committed deterministic fallback is explicit fixture, stale, and non-production metadata", async () => {
  const api = await importFresh(path.join(ROUTE, "open-overview-api.js"));
  const bundle = readFixture();
  assert.equal(bundle.bundleKind, "fixture");
  assert.equal(bundle.generationMethod, "fixture");
  assert.equal(bundle.productionEligible, false);
  assert.match(bundle.label, /fixture.*stale.*non-production/i);
  assert.deepEqual(Object.keys(bundle.datasetFreshness).sort(), Object.keys(bundle.responses).sort());
  const verified = await api.verifyFallbackBundle(bundle, fallbackPolicyRequests(api), "2", new Date("2026-07-15T12:00:00.000Z"));
  assert.equal(verified.snapshotStale, true);
  assert.equal(verified.productionEligible, false);
});

test("fixture fallback is denied on production but allowed on localhost and an explicit preview origin", async () => {
  const api = await importFresh(path.join(ROUTE, "open-overview-api.js"));
  const bundle = readFixture();
  const makeClient = (runtimeOrigin, fixturePreviewOrigins = []) => api.createOpenOverviewClient({
    apiBase: "https://api.example.test",
    schemaMajor: "2",
    timeoutMs: 8000,
    fallbackUrl: "/web/open-overview/fallback-data.json",
    fallbackOnMissingV2: true,
    runtimeOrigin,
    fixturePreviewOrigins,
    fetchImpl: async (input) => String(input).includes("fallback-data.json")
      ? new Response(JSON.stringify(bundle), { status: 200 })
      : new Response("<html>not deployed</html>", { status: 404, headers: { "Content-Type": "text/html" } })
  });
  const requests = fallbackPolicyRequests(api);
  await assert.rejects(() => makeClient("https://www.sdforest.site").loadView(requests), (error) => error.code === "unavailable" && /fixture.*production/i.test(error.message));
  assert.equal((await makeClient("http://localhost:4174").loadView(requests)).mode, "snapshot");
  assert.equal((await makeClient("https://branch-preview.example", ["https://branch-preview.example"]).loadView(requests)).mode, "snapshot");
  await assert.rejects(() => makeClient("https://unlisted-preview.example", ["https://branch-preview.example"]).loadView(requests), (error) => error.code === "unavailable");
});

test("require-live generation records every successful dataset and includes optional evidence in age", async (t) => {
  const { api, bundle, requests, directory } = await buildLiveBundle();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  assert.equal(bundle.bundleKind, "live");
  assert.equal(bundle.generationMethod, "require-live");
  assert.equal(bundle.productionEligible, true);
  assert.match(bundle.label, /live-derived/i);
  assert.equal(bundle.oldestFetchedAt, "2026-07-15T10:00:00.000Z");
  assert.deepEqual(Object.keys(bundle.datasetFreshness).sort(), [api.ENDPOINTS.appsPopular, api.ENDPOINTS.modelsTopWeekly].map(api.canonicalPath).sort());
  assert.deepEqual(bundle.datasetFreshness[api.canonicalPath(api.ENDPOINTS.appsPopular)], {
    oldestFetchedAt: "2026-07-15T10:00:00.000Z",
    newestFetchedAt: "2026-07-15T10:00:00.000Z",
    evidenceCount: 1
  });
  const verified = await api.verifyFallbackBundle(bundle, requests, "2", new Date("2026-07-15T12:00:00.000Z"));
  assert.equal(verified.productionEligible, true);
  assert.equal(verified.snapshotStale, false);
});

test("require-live generation rejects an old optional dataset instead of labeling the bundle fresh", async () => {
  await assert.rejects(
    () => buildLiveBundle({ optionalFetchedAt: "2026-07-13T11:59:59.000Z" }),
    /oldest successful response.*48 hours/i
  );
});

test("require-live generation records typed optional unavailability without inventing freshness", async (t) => {
  const api = await importFresh(path.join(ROUTE, "open-overview-api.js")); const { buildFallback } = await importFresh(SCRIPT_PATH); const source = liveFixtures(readFixture(), "2026-07-15T11:00:00.000Z", "2026-07-15T10:00:00.000Z", "public-v2");
  const unavailable = { schemaVersion: "2.0", status: "unavailable", reason: "collection_disabled", lastSuccessAt: null, stale: false, staleAfterSeconds: 172800, completeness: { acquisitionComplete: false, populationCompleteness: "partial_or_unknown", missingFields: ["collection_disabled"] }, provenance: [], appIds: [], modelIds: [], cells: [] };
  const requests = [{ key: "models", path: api.ENDPOINTS.modelsTopWeekly, kind: "models", sourceId: "models_current" }, { key: "matrix", path: api.ENDPOINTS.appModelMatrix, kind: "matrix", optional: true }];
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "oo-fallback-unavailable-")); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const fetchImpl = async (input) => { const url = new URL(input); const relative = `${url.pathname.replace(/^\/api\/public\/v2/, "")}${url.search}`; const body = relative === api.ENDPOINTS.manifest ? source.manifest : relative === api.ENDPOINTS.modelsTopWeekly ? source.models : relative === api.ENDPOINTS.appModelMatrix ? unavailable : null; return new Response(JSON.stringify(body), { status: body ? 200 : 404, headers: { "Content-Type": "application/json" } }); };
  const bundle = await buildFallback({ apiBase: "https://api.example.test", outPath: path.join(directory, "fallback.json"), maxAgeHours: 48, requireLive: true, now: new Date("2026-07-15T12:00:00.000Z"), fetchImpl, requests });
  assert.deepEqual(Object.keys(bundle.responses), [api.canonicalPath(api.ENDPOINTS.modelsTopWeekly)]); assert.equal(Object.hasOwn(bundle.datasetFreshness, api.canonicalPath(api.ENDPOINTS.appModelMatrix)), false);
});

test("require-live generation omits stale optional evidence and accepts the reviewed GitHub seed publication", async (t) => {
  const { api, bundle, directory } = await buildLiveBundle({ optionalStale: true, includeGitHubSeed: true });
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  assert.deepEqual(Object.keys(bundle.responses), [api.canonicalPath(api.ENDPOINTS.modelsTopWeekly)]);
  assert.deepEqual(Object.keys(bundle.datasetFreshness), [api.canonicalPath(api.ENDPOINTS.modelsTopWeekly)]);
});

test("require-live generation rejects deterministic preview provenance", async () => {
  await assert.rejects(
    () => buildLiveBundle({ transformVersion: "deterministic-preview-snapshot-v1" }),
    /fixture|test|seed|deterministic preview/i
  );
});

test("canonical production accepts a fresh require-live bundle and rejects it once older than 48 hours", async (t) => {
  const { api, bundle, requests, directory } = await buildLiveBundle();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const fresh = await api.verifyFallbackBundle(bundle, requests, "2", new Date("2026-07-17T09:59:59.000Z"));
  const stale = await api.verifyFallbackBundle(bundle, requests, "2", new Date("2026-07-17T10:00:00.001Z"));
  assert.doesNotThrow(() => api.assertFallbackPolicy(fresh, "https://www.sdforest.site", []));
  assert.throws(() => api.assertFallbackPolicy(stale, "https://www.sdforest.site", []), (error) => error.code === "unavailable" && /older than 48 hours/i.test(error.message));
});

test("fallback generation aborts a fetch that exceeds the bounded timeout", async (t) => {
  const { buildFallback } = await importFresh(SCRIPT_PATH);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "oo-fallback-timeout-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const fetchImpl = (_input, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true }));
  await assert.rejects(
    () => buildFallback({ apiBase: "https://api.example.test", outPath: path.join(directory, "fallback.json"), maxAgeHours: 48, requireLive: true, fetchImpl, requests: [], timeoutMs: 100 }),
    /timed out/i
  );
});

test("fallback generation rejects a final aggregate over four MiB before writing", async () => {
  const { assertFallbackBundleSize } = await importFresh(SCRIPT_PATH);
  assert.throws(
    () => assertFallbackBundleSize({ payload: "x".repeat(4 * 1024 * 1024) }),
    /4 MiB|too large/i
  );
});
