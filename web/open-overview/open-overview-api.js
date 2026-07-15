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

export async function verifyFallbackBundle(bundle, requests, schemaMajor, now = new Date()) {
  const expected = "checksum,generatedAt,manifest,mode,oldestFetchedAt,responses,schemaVersion,sourceApiBase";
  if (!bundle || Object.keys(bundle).sort().join(",") !== expected || bundle.schemaVersion !== "2" || bundle.mode !== "snapshot") throw new ContractError("invalid_fallback", "Fallback metadata is invalid");
  const { checksum, ...unsigned } = bundle;
  if (!/^[a-f0-9]{64}$/.test(checksum || "") || await sha256Hex(unsigned) !== checksum) throw new ContractError("invalid_fallback", "Fallback checksum does not match");
  const source = safePublicUrl(bundle.sourceApiBase);
  if (!source || source.protocol !== "https:" || source.pathname !== "/" || source.search || source.hash) throw new ContractError("invalid_fallback", "Fallback source is not public HTTPS");
  if (!Number.isFinite(Date.parse(bundle.generatedAt))) throw new ContractError("invalid_fallback", "Fallback generatedAt is invalid");
  const manifest = validateManifest(bundle.manifest, schemaMajor);
  const responses = {};
  const errors = {};
  if (!bundle.responses || typeof bundle.responses !== "object" || Array.isArray(bundle.responses)) throw new ContractError("invalid_fallback", "Fallback responses are invalid");
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
  const oldest = Date.parse(bundle.oldestFetchedAt);
  if (!Number.isFinite(oldest)) throw new ContractError("invalid_fallback", "Fallback oldestFetchedAt is invalid");
  return Object.freeze({ ...bundle, manifest, responses: Object.freeze(responses), errors: Object.freeze(errors), snapshotStale: now.getTime() - oldest > 48 * 3_600_000 });
}

export function createOpenOverviewClient({ apiBase, schemaMajor, timeoutMs, fallbackUrl = null, fallbackOnMissingV2 = false, conditionalRequests = false, fetchImpl = globalThis.fetch }) {
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
    return Object.freeze({ mode: "snapshot", manifest: bundle.manifest, responses: bundle.responses, errors: bundle.errors, snapshotStale: bundle.snapshotStale, oldestFetchedAt: bundle.oldestFetchedAt });
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
