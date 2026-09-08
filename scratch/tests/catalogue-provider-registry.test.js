const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const route = path.resolve(__dirname, "../../web/open-dashboard");
const load = file => import(pathToFileURL(path.join(route, file)).href);
const sourceId = id => id === "openrouter" ? "models_current" : `${id}_models_current`;
const manifest = ids => ({ sources: ids.map(id => ({ sourceId: sourceId(id), publishedRunId: "run", stale: false })) });

test("catalogue identity covers every generated package provider without a second list", async () => {
  const api = await load("open-dashboard-api.js");
  const { PACKAGE_FACTS } = await load("package-facts.mjs");
  assert.deepEqual(api.CATALOGUE_PROVIDERS.map(([id, name]) => ({ id, name })), PACKAGE_FACTS.providers.map(p => ({ id: p.id, name: p.displayName })));
});

test("only live declared catalogue sources are fetched, including new providers", async () => {
  const api = await load("open-dashboard-api.js");
  const requests = api.catalogueRequestsFor(manifest(["openrouter", "deepinfra", "future_host"]));
  assert.deepEqual(requests.map(r => new URL(r.path, "https://example.test").searchParams.get("provider")), ["openrouter", "deepinfra", "future_host"]);
  assert.ok(requests.every(r => r.sourceId && r.optional && new URL(r.path, "https://example.test").searchParams.get("limit") === "200"));
  assert.ok(!requests.some(r => r.path.includes("sail")));
  assert.deepEqual(api.catalogueRequestsFor(null), []);
});

test("a formerly absent provider becomes fetchable when the live API declares it", async () => {
  const api = await load("open-dashboard-api.js");
  assert.deepEqual(api.catalogueRequestsFor(manifest([])), []);
  const [request] = api.catalogueRequestsFor(manifest(["sail"]));
  assert.equal(request.sourceId, "sail_models_current");
  assert.equal(new URL(request.path, "https://example.test").searchParams.get("provider"), "sail");
});

test("unknown source declarations remain visible without invented publication claims", async () => {
  const api = await load("open-dashboard-api.js");
  const providers = api.catalogueProvidersFor(manifest(["new_provider"]));
  const added = providers.find(p => p.id === "new_provider");
  assert.equal(added.declared, true);
  assert.equal(added.publishes.outputModalities, "unknown");
  assert.equal(providers.find(p => p.id === "sail").declared, false);
  assert.equal(api.catalogueProvidersFor(null).find(p => p.id === "sail").declared, null);
});

test("catalogue missing, failed and pending states describe the check rather than provider publication", async () => {
  const app = await load("open-dashboard.js");
  const api = await load("open-dashboard-api.js");
  const view = { manifest: manifest(["openrouter"]), responses: {}, errors: {} };
  const providers = api.catalogueProvidersFor(view.manifest);
  const openrouter = providers.find(p => p.id === "openrouter");
  const sail = providers.find(p => p.id === "sail");
  assert.equal(app.catalogueAvailability(view, openrouter).state, "pending");
  assert.equal(app.catalogueAvailability({ ...view, errors: { "catalogue:openrouter": { code: "timeout" } } }, openrouter).state, "failed");
  const missing = app.catalogueAvailability(view, sail);
  assert.equal(missing.state, "not_declared");
  assert.doesNotMatch(missing.note, /no source publishes|HTTP 400|not published/i);
  assert.equal(app.catalogueAvailability({ ...view, manifest: null }, api.catalogueProvidersFor(null)[0]).state, "not_checked");
});

test("null sampled fields never become claims that a provider publishes nothing", async () => {
  const app = await load("open-dashboard.js");
  const rows = [{ outputModalities: null, contextLength: null, pricing: { promptUsdPerToken: null, completionUsdPerToken: null }, isFree: null, providerActive: null, performance: null }];
  const summary = app.catalogueSummary(rows);
  assert.deepEqual(summary.unpublished, []);
  assert.ok(summary.absentFields.includes("performance"));
  assert.equal(app.catalogueFieldLabel({ publishes: { outputModalities: "never" } }, "outputModalities"), "not published (package registry)");
  assert.equal(app.catalogueFieldLabel({ publishes: { outputModalities: "unknown" } }, "outputModalities"), "unknown in this response");
  assert.equal(app.catalogueFieldLabel({ publishes: { outputModalities: "always" } }, "outputModalities"), "unknown in this response");
});

test("catalogue loading discovers sources before selecting requests and preserves publication binding", async () => {
  const app = await load("open-dashboard.js");
  const initial = { mode: "live", manifest: manifest(["deepinfra"]), responses: {}, errors: {} };
  const calls = [];
  const client = { loadView: async (requests, options) => { calls.push({ requests, options }); return initial; } };
  await app.loadCatalogues(client);
  assert.deepEqual(calls[0].requests, []);
  assert.equal(calls[1].requests.length, 1);
  assert.equal(calls[1].requests[0].sourceId, "deepinfra_models_current");
  assert.equal(calls[1].options.manifest, initial.manifest);
});

test("an unknown owner remains null without rejecting the provider catalogue", async () => {
  const schema = await load("open-dashboard-schema.js");
  const row = {
    provider: "qwencloud", id: "example-model", displayName: null, ownedBy: null,
    contextLength: null, pricing: { promptUsdPerToken: null, completionUsdPerToken: null },
    isFree: null, freeKind: "paid_or_unknown", providerActive: null,
    reasoningEfforts: null, outputModalities: null, performance: null,
    availability: "available", firstSeenAt: "2026-09-08T00:00:00.000Z",
    lastSeenAt: "2026-09-08T00:00:00.000Z", lastConfirmedAt: "2026-09-08T00:00:00.000Z",
    disappearedAt: null, absenceStreak: "0", missingFields: []
  };
  const response = { schemaVersion: "2.0", data: [row], cursor: null,
    window: { start: null, end: null, timezone: "UTC", inclusive: null, basis: "observed" },
    completeness: { acquisitionComplete: true, populationCompleteness: "full", missingFields: [] },
    stale: false, rank: null, provenance: [] };
  assert.equal(schema.validateOpenRouterCollection(response, "liveModels", "2").data[0].ownedBy, null);
  assert.throws(() => schema.validateOpenRouterCollection({ ...response, data: [{ ...row, ownedBy: 12 }] }, "liveModels", "2"), /ownedBy/);
});

test("one missing modality does not erase another row's observed text modality", async () => {
  const app = await load("open-dashboard.js");
  const summary = app.catalogueSummary([{ outputModalities: ["text"] }, { outputModalities: null }]);
  assert.equal(summary.textCount, 1);
  assert.equal(summary.unknownCount, 1);
  assert.equal(summary.noModalityPublished, false);
});
