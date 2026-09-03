const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const ROUTE = path.join(ROOT, "web", "open-dashboard");
const importRoute = (file) => import(`${pathToFileURL(path.join(ROUTE, file)).href}?t=${Date.now()}-${Math.random()}`);
const fixture = () => JSON.parse(fs.readFileSync(path.join(ROUTE, "fallback-data.json"), "utf8"));

test("direct deterministic v2 evidence is fixture locally and fails closed on production", async () => {
  const api = await importRoute("open-dashboard-api.js");
  const bundle = fixture();
  const request = { key: "models", path: api.ENDPOINTS.modelsTopWeekly, kind: "models", sourceId: "models_current" };
  const fetchImpl = async (input) => {
    const url = new URL(input);
    const relative = `${url.pathname.replace(/^\/api\/public\/v2/, "")}${url.search}`;
    const body = relative === api.ENDPOINTS.manifest ? bundle.manifest : bundle.responses[api.canonicalPath(relative)];
    return new Response(JSON.stringify(body), { status: body ? 200 : 404, headers: { "Content-Type": "application/json" } });
  };
  const makeClient = (runtimeOrigin) => api.createOpenDashboardClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, runtimeOrigin, fetchImpl });
  const local = await makeClient("http://127.0.0.1:4174").loadView([request]);
  assert.equal(local.mode, "fixture");
  assert.equal(local.productionEligible, false);
  await assert.rejects(() => makeClient("https://www.sdforest.site").loadView([request]), (error) => error.code === "unavailable" && /fixture|preview|production/i.test(error.message));
});

test("valid response contracts remain bound to every requested identity and slice", async () => {
  const api = await importRoute("open-dashboard-api.js");
  const app = await importRoute("open-dashboard.js");
  const bundle = fixture();
  const responseAt = (pathValue) => bundle.responses[api.canonicalPath(pathValue)];

  const apps = responseAt(api.ENDPOINTS.appsPopular);
  assert.deepEqual(apps.requestSlice, {
    period: "30d",
    sort: "popular",
    category: null,
    subcategory: null,
    limit: 10
  });
  assert.equal(app.appRankingSourceLabel(apps), "OpenRouter 30-day · popular");
  const matchingApps = { key: "apps", path: api.ENDPOINTS.appsPopular, kind: "apps", sourceId: "apps_ranked" };
  assert.doesNotThrow(() => api.assertResponseIdentity(matchingApps, apps));
  for (const [field, value] of [["period", "7d"], ["sort", "trending"], ["category", "coding"], ["limit", 25]]) {
    assert.throws(
      () => api.assertResponseIdentity(matchingApps, { ...apps, requestSlice: { ...apps.requestSlice, [field]: value } }),
      (error) => error.code === "identity_mismatch" && /app|slice|period|sort|category|limit/i.test(error.message)
    );
  }
  assert.throws(
    () => api.assertResponseIdentity(matchingApps, { ...apps, window: { ...apps.window, start: "2026-07-09", end: "2026-07-15" } }),
    (error) => error.code === "identity_mismatch" && /30|period|window|coverage/i.test(error.message)
  );

  const githubPath = api.ENDPOINTS.githubRanking("mcp", "momentum", 30);
  assert.throws(
    () => api.assertResponseIdentity({ key: "ranking", path: api.ENDPOINTS.githubRanking("a2a", "momentum", 30), kind: "github" }, responseAt(githubPath)),
    (error) => error.code === "identity_mismatch" && /category/i.test(error.message)
  );
  assert.throws(
    () => api.assertResponseIdentity({ key: "ranking", path: api.ENDPOINTS.githubRanking("mcp", "momentum", 90), kind: "github" }, responseAt(githubPath)),
    (error) => error.code === "identity_mismatch" && /window/i.test(error.message)
  );

  assert.throws(
    () => api.assertResponseIdentity({ key: "appModels", path: api.ENDPOINTS.appModels("1002"), kind: "appModels" }, responseAt(api.ENDPOINTS.appModels("1001"))),
    (error) => error.code === "identity_mismatch" && /app/i.test(error.message)
  );

  const enrichmentPath = Object.keys(bundle.responses).find((key) => key.includes("/enrichment?"));
  const enrichment = bundle.responses[enrichmentPath];
  const enrichmentUrl = new URL(enrichmentPath, "https://example.test");
  const differentRepository = api.ENDPOINTS.githubEnrichment("1", enrichmentUrl.searchParams.get("from"), enrichmentUrl.searchParams.get("to"));
  assert.throws(
    () => api.assertResponseIdentity({ key: "githubEnrichment:1", path: differentRepository, kind: "githubEnrichment" }, enrichment),
    (error) => error.code === "identity_mismatch" && /repository/i.test(error.message)
  );
  const differentRange = api.ENDPOINTS.githubEnrichment(enrichment.repositoryId, enrichmentUrl.searchParams.get("from"), "2026-07-16");
  assert.throws(
    () => api.assertResponseIdentity({ key: `githubEnrichment:${enrichment.repositoryId}`, path: differentRange, kind: "githubEnrichment" }, enrichment),
    (error) => error.code === "identity_mismatch" && /range|coverage|boundary/i.test(error.message)
  );
  const matchingEnrichment = { key: `githubEnrichment:${enrichment.repositoryId}`, path: enrichmentPath, kind: "githubEnrichment" };
  const rangedBucket = { ...enrichment, starBuckets: [{ ...enrichment.starBuckets.at(-1), start: "2026-07-14", end: "2026-07-15" }] };
  assert.doesNotThrow(() => api.assertResponseIdentity(matchingEnrichment, rangedBucket));
  assert.throws(
    () => api.assertResponseIdentity(matchingEnrichment, { ...enrichment, starBuckets: [{ ...enrichment.starBuckets[0], start: "2026-07-16", end: "2026-07-15" }] }),
    (error) => error.code === "identity_mismatch" && /bucket|range/i.test(error.message)
  );
  assert.throws(
    () => api.assertResponseIdentity(matchingEnrichment, { ...enrichment, starBuckets: [{ ...enrichment.starBuckets[0], start: "2025-07-15", end: "2025-07-15" }] }),
    (error) => error.code === "identity_mismatch" && /bucket|range/i.test(error.message)
  );

  assert.throws(
    () => api.assertResponseIdentity({ key: "matrix", path: "/app-model-matrix?appLimit=1&modelLimit=1&window=latest-complete", kind: "matrix" }, responseAt(api.ENDPOINTS.appModelMatrix)),
    (error) => error.code === "identity_mismatch" && /axis|limit/i.test(error.message)
  );
});

test("view merges require one exact manifest publication identity", async () => {
  const api = await importRoute("open-dashboard-api.js");
  const app = await importRoute("open-dashboard.js");
  const bundle = fixture();
  const primary = { mode: "live", manifest: bundle.manifest, publicationIdentity: "generation-a", responses: {}, errors: {} };
  const deferred = { ...primary, publicationIdentity: "generation-b" };
  assert.throws(() => app.mergeCompatibleViews(primary, deferred), /publication|generation|mixed/i);

  const enrichmentPath = Object.keys(bundle.responses).find((key) => key.includes("/enrichment?"));
  const enrichmentUrl = new URL(enrichmentPath, "https://example.test");
  const manifestB = { ...bundle.manifest, publishedAt: "2026-07-15T10:01:00.000Z" };
  const fetchImpl = async (input) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/manifest")) return new Response(JSON.stringify(manifestB), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(bundle.responses[enrichmentPath]), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const client = api.createOpenDashboardClient({ apiBase: "https://api.example.test", schemaMajor: "2", timeoutMs: 8000, runtimeOrigin: "http://127.0.0.1:4174", fetchImpl });
  const spec = { key: `githubEnrichment:${bundle.responses[enrichmentPath].repositoryId}`, path: api.ENDPOINTS.githubEnrichment(bundle.responses[enrichmentPath].repositoryId, enrichmentUrl.searchParams.get("from"), enrichmentUrl.searchParams.get("to")), kind: "githubEnrichment", optional: true };
  await assert.rejects(() => client.loadView([spec], { manifest: bundle.manifest }), (error) => error.code === "mixed_snapshot");
});

test("GitHub enrichment source rows disclose public evidence and partial buckets are never exact", async () => {
  const app = await importRoute("open-dashboard.js");
  const bundle = fixture();
  const enrichmentPath = Object.keys(bundle.responses).find((key) => key.includes("/enrichment?"));
  const enrichment = bundle.responses[enrichmentPath];
  const view = { mode: "snapshot", snapshotStale: true, publicationIdentity: "fixture-generation", manifest: bundle.manifest, responses: { [`githubEnrichment:${enrichment.repositoryId}`]: enrichment }, errors: {} };
  const rows = app.buildSourceRows(view).filter((row) => row.datasetKey.startsWith("githubEnrichment:"));
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.sourceUrl.startsWith("https://api.github.com/")));
  assert.ok(rows.every((row) => row.asOf === "2026-07-15T10:00:00.000Z"));
  assert.ok(rows.every((row) => row.publicationIdentity.includes(":")));
  assert.equal(rows.find((row) => row.publicationIdentity.endsWith(":stargazers")).completeness, "partial");
  assert.deepEqual(app.starBucketPresentation(enrichment.starBuckets), { exact: false, completeness: "partial", badge: "Partial coverage", noun: "published partial-coverage star buckets" });
});
