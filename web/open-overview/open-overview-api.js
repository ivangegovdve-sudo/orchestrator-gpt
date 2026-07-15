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
  appModels(appId) {
    if (!/^\d+$/.test(String(appId))) throw new TypeError("appId must be a decimal string");
    return `/apps/${encodeURIComponent(String(appId))}/models?limit=100`;
  },
  providers: "/providers?limit=100",
  freeFrontier: "/free-frontiers?x=benchmarkQuality&y=medianThroughput&limit=200",
  history: "/history?window=90d&limit=10",
  githubRanking(category, metric = "adoption", windowDays = null, limit = 10) {
    const query = new URLSearchParams({ category, entity_level: "project-family", limit: String(limit), metric });
    if (windowDays !== null) query.set("window", String(windowDays));
    return `/github/rankings?${query}`;
  }
});

const request = (key, path, kind, sourceId = null, optional = false) => Object.freeze({ key, path, kind, sourceId, optional });
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
  ...GITHUB_CATEGORIES.map(([slug]) => request(`github:${slug}`, ENDPOINTS.githubRanking(slug), "github", null, true))
]);

export const FALLBACK_REQUESTS = Object.freeze([
  ...OVERVIEW_REQUESTS,
  ...GITHUB_CATEGORIES.flatMap(([slug]) => [
    request(`fallback:${slug}:maintenance`, ENDPOINTS.githubRanking(slug, "maintenance"), "github", null, true),
    ...[7, 30, 90].map((days) => request(`fallback:${slug}:momentum:${days}`, ENDPOINTS.githubRanking(slug, "momentum", days), "github", null, true))
  ])
]);

export function canonicalPath(input) {
  const url = new URL(input, "https://open-overview.invalid");
  const sorted = new URLSearchParams(Array.from(url.searchParams.entries()).sort(([a, av], [b, bv]) => a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  return url.pathname + (sorted.size ? `?${sorted}` : "");
}

const validateFor = (spec, raw, major) => spec.kind === "manifest"
  ? validateManifest(raw, major)
  : spec.kind === "github"
    ? validateGitHubRanking(raw, major)
    : spec.kind === "matrix"
      ? validateAppModelMatrix(raw, major)
      : spec.kind === "appModels"
        ? validateAppModels(raw, major)
        : spec.kind === "providers"
          ? validateProviders(raw, major)
          : spec.kind === "freeFrontiers"
            ? validateFreeFrontiers(raw, major)
            : spec.kind === "history"
              ? validateHistory(raw, major)
              : validateOpenRouterCollection(raw, spec.kind, major);

const MAX_PRODUCTION_FALLBACK_AGE_MS = 48 * 3_600_000;
const FIXTURE_FALLBACK_LABEL = "Fixture · stale · non-production";
const LIVE_FALLBACK_LABEL = "Live-derived snapshot · require-live validated";
const FALLBACK_FIELDS = Object.freeze([
  "bundleKind", "checksum", "datasetFreshness", "generatedAt", "generationMethod", "label", "manifest", "mode",
  "oldestFetchedAt", "productionEligible", "responses", "schemaVersion", "sourceApiBase"
]);

const isoTime = (value, message) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new ContractError("invalid_fallback", message);
  return timestamp;
};

export function fallbackDatasetFreshness(response, path = "response") {
  if (!Array.isArray(response?.provenance) || !response.provenance.length) throw new ContractError("invalid_fallback", `${path} has no freshness provenance`);
  const timestamps = response.provenance.map((item) => isoTime(item?.fetchedAt, `${path} has invalid fetchedAt provenance`));
  return Object.freeze({
    oldestFetchedAt: new Date(Math.min(...timestamps)).toISOString(),
    newestFetchedAt: new Date(Math.max(...timestamps)).toISOString(),
    evidenceCount: timestamps.length
  });
}

export function fallbackFreshnessMap(responses) {
  if (!responses || typeof responses !== "object" || Array.isArray(responses)) throw new ContractError("invalid_fallback", "Fallback responses are invalid");
  return Object.freeze(Object.fromEntries(Object.entries(responses).map(([path, response]) => [path, fallbackDatasetFreshness(response, path)])));
}

const sameFreshness = (actual, expected) => actual
  && Object.keys(actual).length === 3
  && actual.oldestFetchedAt === expected.oldestFetchedAt
  && actual.newestFetchedAt === expected.newestFetchedAt
  && actual.evidenceCount === expected.evidenceCount;

const hasFixtureMarker = (manifest, responses) => {
  const marker = /fixture|test|seed|deterministic-preview/i;
  if (manifest.sources.some((source) => marker.test(source.transformVersion || "") || marker.test(source.citationUrl || ""))) return true;
  return Object.values(responses).some((response) => Array.isArray(response?.provenance) && response.provenance.some((item) => marker.test(item.transformVersion || "") || marker.test(item.citation || "")));
};

const normalizedOrigin = (value, label) => {
  if (value === null || value === undefined || value === "") return null;
  let url;
  try { url = new URL(value); } catch { throw new TypeError(`${label} must be an HTTP(S) origin`); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new TypeError(`${label} must be an HTTP(S) origin`);
  return url;
};

const localPreviewOrigin = (url) => url && (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]");

export function assertFallbackPolicy(bundle, runtimeOrigin, fixturePreviewOrigins = []) {
  if (!Array.isArray(fixturePreviewOrigins) || fixturePreviewOrigins.length > 20) throw new TypeError("fixturePreviewOrigins must be a bounded array");
  const runtime = normalizedOrigin(runtimeOrigin, "runtimeOrigin");
  const previews = new Set(fixturePreviewOrigins.map((value) => {
    const url = normalizedOrigin(value, "fixturePreviewOrigins entry");
    if (!url || url.protocol !== "https:") throw new TypeError("fixturePreviewOrigins entries must be HTTPS origins");
    return url.origin;
  }));
  const fixtureAllowed = localPreviewOrigin(runtime) || (runtime && previews.has(runtime.origin));
  if (bundle.bundleKind === "fixture") {
    if (!fixtureAllowed) throw new ContractError("unavailable", "Fixture fallback is unavailable on production origins");
    return bundle;
  }
  if (bundle.snapshotStale) throw new ContractError("unavailable", "Live fallback evidence is older than 48 hours");
  if (!bundle.productionEligible) throw new ContractError("unavailable", "Fallback is not require-live validated for production");
  return bundle;
}

export async function verifyFallbackBundle(bundle, requests, schemaMajor, now = new Date()) {
  if (!bundle || Object.keys(bundle).sort().join(",") !== [...FALLBACK_FIELDS].sort().join(",") || bundle.schemaVersion !== "2" || bundle.mode !== "snapshot") throw new ContractError("invalid_fallback", "Fallback metadata is invalid");
  const fixture = bundle.bundleKind === "fixture" && bundle.generationMethod === "fixture" && bundle.productionEligible === false && bundle.label === FIXTURE_FALLBACK_LABEL;
  const live = bundle.bundleKind === "live" && bundle.generationMethod === "require-live" && bundle.productionEligible === true && bundle.label === LIVE_FALLBACK_LABEL;
  if (!fixture && !live) throw new ContractError("invalid_fallback", "Fallback generation metadata is invalid");
  const { checksum, ...unsigned } = bundle;
  if (!/^[a-f0-9]{64}$/.test(checksum || "") || await sha256Hex(unsigned) !== checksum) throw new ContractError("invalid_fallback", "Fallback checksum does not match");
  const source = safePublicUrl(bundle.sourceApiBase);
  if (!source || source.protocol !== "https:" || source.pathname !== "/" || source.search || source.hash) throw new ContractError("invalid_fallback", "Fallback source is not public HTTPS");
  isoTime(bundle.generatedAt, "Fallback generatedAt is invalid");
  const manifest = validateManifest(bundle.manifest, schemaMajor);
  const responses = {};
  const errors = {};
  if (!bundle.responses || typeof bundle.responses !== "object" || Array.isArray(bundle.responses)) throw new ContractError("invalid_fallback", "Fallback responses are invalid");
  const derivedFreshness = fallbackFreshnessMap(bundle.responses);
  if (!bundle.datasetFreshness || typeof bundle.datasetFreshness !== "object" || Array.isArray(bundle.datasetFreshness) || Object.keys(bundle.datasetFreshness).sort().join(",") !== Object.keys(derivedFreshness).sort().join(",")) throw new ContractError("invalid_fallback", "Fallback dataset freshness inventory is invalid");
  for (const [path, expected] of Object.entries(derivedFreshness)) if (!sameFreshness(bundle.datasetFreshness[path], expected)) throw new ContractError("invalid_fallback", `Fallback freshness evidence does not match ${path}`);
  if (live && hasFixtureMarker(manifest, bundle.responses)) throw new ContractError("invalid_fallback", "Live fallback contains fixture/test provenance");
  for (const spec of requests) {
    const path = canonicalPath(spec.path);
    if (!Object.hasOwn(bundle.responses, path)) {
      if (spec.optional) { errors[spec.key] = new ContractError("unavailable", "Optional fallback response is unavailable", { path }); continue; }
      throw new ContractError("invalid_fallback", `Fallback is missing ${path}`);
    }
    const response = validateFor(spec, bundle.responses[path], schemaMajor);
    if (spec.sourceId) assertPublishedRun(manifest, spec.sourceId, response);
    responses[spec.key] = response;
  }
  const oldest = isoTime(bundle.oldestFetchedAt, "Fallback oldestFetchedAt is invalid");
  const derivedOldest = Math.min(...Object.values(derivedFreshness).map((item) => Date.parse(item.oldestFetchedAt)));
  if (oldest !== derivedOldest) throw new ContractError("invalid_fallback", "Fallback oldestFetchedAt does not match dataset evidence");
  const age = now.getTime() - oldest;
  if (!Number.isFinite(now.getTime()) || (live && age < 0)) throw new ContractError("invalid_fallback", "Fallback evidence time is in the future");
  const snapshotStale = fixture || age >= MAX_PRODUCTION_FALLBACK_AGE_MS;
  return Object.freeze({ ...bundle, manifest, responses: Object.freeze(responses), errors: Object.freeze(errors), snapshotStale, productionEligible: live && !snapshotStale });
}

export function createOpenOverviewClient({ apiBase, schemaMajor, timeoutMs, fallbackUrl = null, fallbackOnMissingV2 = false, fixturePreviewOrigins = [], runtimeOrigin = globalThis.location?.origin ?? null, conditionalRequests = false, fetchImpl = globalThis.fetch }) {
  const base = safePublicUrl(apiBase);
  if (!base || base.protocol !== "https:" || base.pathname !== "/" || base.search || base.hash) throw new TypeError("apiBase must be a public credential-free HTTPS origin");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new TypeError("timeoutMs is outside the supported range");
  const cache = new Map();

  async function fetchJson(spec, { conditional = true } = {}) {
    const key = canonicalPath(spec.path);
    const cached = cache.get(key);
    const headers = new Headers({ Accept: "application/json" });
    if (conditionalRequests && conditional && cached?.etag) headers.set("If-None-Match", cached.etag);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException("timed out", "TimeoutError")), timeoutMs);
    try {
      const response = await fetchImpl(new URL(`/api/public/v2${key}`, base).href, { method: "GET", headers, credentials: "omit", signal: controller.signal, cache: "no-store" });
      if (response.status === 304) {
        if (!cached) return fetchJson(spec, { conditional: false });
        return cached.body;
      }
      if (!response.ok) {
        let publicError;
        try { publicError = validatePublicError(await response.json(), schemaMajor); }
        catch { throw new ContractError("invalid_http_error", `Public API returned HTTP ${response.status} without a valid public error`, { status: response.status }); }
        throw new ContractError("http_error", publicError.error.message, { status: response.status, availability: response.status >= 500, apiCode: publicError.error.code, retryable: publicError.error.retryable });
      }
      let raw;
      try { raw = await response.json(); } catch { throw new ContractError("invalid_json", "Public API returned invalid JSON"); }
      const body = validateFor(spec, raw, schemaMajor);
      const etag = response.headers.get("ETag"); if (etag) cache.set(key, { etag, body });
      return body;
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError" || error?.name === "TimeoutError") throw new ContractError("timeout", "Public API request timed out");
      if (error instanceof TypeError) throw new ContractError("network_unavailable", "Public API network request failed");
      throw error;
    } finally { clearTimeout(timer); }
  }

  async function load(spec, manifest) {
    let mismatch;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt) cache.delete(canonicalPath(spec.path));
      const envelope = await fetchJson(spec, { conditional: attempt === 0 });
      try { if (spec.sourceId) assertPublishedRun(manifest, spec.sourceId, envelope); return envelope; }
      catch (error) { if (error.code !== "mixed_snapshot") throw error; mismatch = error; }
    }
    throw mismatch;
  }

  async function loadFallbackView(requests) {
    if (!fallbackUrl) throw new ContractError("unavailable", "No fallback URL is configured");
    const response = await fetchImpl(fallbackUrl, { method: "GET", credentials: "omit", cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new ContractError("unavailable", "Fallback snapshot is unavailable");
    const bundle = await verifyFallbackBundle(await response.json(), requests, schemaMajor);
    assertFallbackPolicy(bundle, runtimeOrigin, fixturePreviewOrigins);
    return Object.freeze({ mode: "snapshot", bundleKind: bundle.bundleKind, fallbackLabel: bundle.label, productionEligible: bundle.productionEligible, manifest: bundle.manifest, responses: bundle.responses, errors: bundle.errors, snapshotStale: bundle.snapshotStale, oldestFetchedAt: bundle.oldestFetchedAt, datasetFreshness: bundle.datasetFreshness });
  }

  const fallbackEligible = (error) => error?.code === "timeout" || error?.code === "network_unavailable" || (error?.code === "http_error" && error?.details?.availability === true) || (fallbackOnMissingV2 && error?.code === "invalid_http_error" && error?.details?.status === 404);
  async function loadView(requests) {
    let manifest;
    try { manifest = await fetchJson({ key: "manifest", path: ENDPOINTS.manifest, kind: "manifest" }); }
    catch (error) { if (!fallbackEligible(error)) throw error; return loadFallbackView(requests); }
    const settled = await Promise.allSettled(requests.map((spec) => load(spec, manifest)));
    const responses = {}; const errors = {};
    settled.forEach((result, index) => { const spec = requests[index]; if (result.status === "fulfilled") responses[spec.key] = result.value; else errors[spec.key] = result.reason; });
    return Object.freeze({ mode: "live", manifest, responses: Object.freeze(responses), errors: Object.freeze(errors), snapshotStale: false });
  }

  return Object.freeze({ load, loadManifest: () => fetchJson({ key: "manifest", path: ENDPOINTS.manifest, kind: "manifest" }), loadView, clear: () => cache.clear() });
}
