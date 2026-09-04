import {
  ContractError,
  assertPublishedRun,
  safePublicUrl,
  sha256Hex,
  validateAppModelMatrix,
  validateAppModels,
  validateFreeFrontiers,
  validateGitHubEnrichment,
  validateGitHubRanking,
  validateGitHubRepositories,
  validateHistory,
  validateManifest,
  validateOpenRouterCollection,
  validateProviders,
  validatePublicError
} from "./open-dashboard-schema.js";

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

// Measured against the live API on 2026-09-03. `served: false` means no source
// publishes that catalogue -- /live-models rejects it with HTTP 400 INVALID_QUERY
// -- so the page renders a named gap instead of quietly showing three providers
// when four were asked for.
// [slug, label, served, sourceId]. The sourceId is carried explicitly because
// every /live-models response lists ALL THREE ingest sources in its provenance
// regardless of which provider was requested -- so provenance[0] would label the
// OpenRouter panel with the Cerebras source.
// This roster is a DEPLOYMENT-TIME SNAPSHOT of what the API served when it was
// written, not a live probe. The date is rendered next to any "not served"
// claim so a stale claim is visible rather than quietly authoritative.
export const CATALOGUE_SERVED_AS_OF = "2026-09-03";
export const CATALOGUE_PROVIDERS = Object.freeze([
  ["openrouter", "OpenRouter", true, "models_current"],
  ["groq", "Groq", true, "groq_models_current"],
  ["cerebras", "Cerebras", true, "cerebras_models_current"],
  ["sail", "Sail", false, null]
]);

export const ENDPOINTS = Object.freeze({
  manifest: "/manifest",
  sourceStatus: "/source-status",
  modelsTopWeekly: "/models?limit=10&rank_source=top-weekly",
  appsPopular: "/apps?limit=10&period=30d&sort=popular",
  freeModels: "/free-models?limit=200",
  deprecations: "/deprecations?limit=50",
  tasks: "/tasks?limit=50&window=7d",
  benchmarks: "/benchmarks?limit=50",
  appModelMatrix: "/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete",
  appModels(appId) {
    if (!/^(?:0|[1-9]\d*)$/.test(String(appId))) throw new TypeError("appId must be a canonical decimal string");
    return `/apps/${encodeURIComponent(String(appId))}/models?limit=100`;
  },
  providers: "/providers?limit=100",
  githubRepositories(category, limit = 25) {
    return `/github/repositories?category=${encodeURIComponent(category)}&limit=${encodeURIComponent(String(limit))}`;
  },
  liveModels(provider, cursor = null) {
    // `served: false` providers have no URL to build. Checking membership alone
    // let ENDPOINTS.liveModels("sail") through, which would have requested a
    // provider the API rejects with HTTP 400.
    if (!CATALOGUE_PROVIDERS.some(([slug, , served]) => slug === provider && served)) throw new TypeError("provider must be a served catalogue provider");
    // 200 is MAX_COLLECTION_ROWS in the schema; asking for more makes the client
    // reject its own valid response. Groq and Cerebras fit well inside it; the
    // OpenRouter catalogue does not, and the view labels that page as a slice
    // rather than reporting it as a total.
    return `/live-models?limit=200&provider=${encodeURIComponent(provider)}${cursor === null ? "" : `&cursor=${encodeURIComponent(cursor)}`}`;
  },
  freeFrontierQualityThroughput: "/free-frontiers?x=benchmarkQuality&y=medianThroughput&limit=200",
  freeFrontierContextPopularity: "/free-frontiers?x=contextLength&y=weeklyPopularityRank&limit=200",
  history: "/history?window=90d&limit=10",
  githubRanking(category, metric = "adoption", windowDays = null, limit = 10) {
    const query = new URLSearchParams({ category, entity_level: "project-family", limit: String(limit), metric });
    if (windowDays !== null) query.set("window", String(windowDays));
    return `/github/rankings?${query}`;
  },
  githubEnrichment(id, from, to) {
    const value = String(id);
    if (!/^[1-9]\d*$/.test(value) || BigInt(value) > 9223372036854775807n) throw new TypeError("repositoryId must be a canonical positive decimal string");
    const parseDate = (date, name) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`))) throw new TypeError(`${name} must be an ISO date`); return String(date); };
    const start = parseDate(from, "from"); const end = parseDate(to, "to"); if (start > end) throw new TypeError("from must not be after to");
    return `/github/repositories/${encodeURIComponent(value)}/enrichment?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`;
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
  request("freeFrontierQuality", ENDPOINTS.freeFrontierQualityThroughput, "freeFrontiers", null, true),
  request("freeFrontierContext", ENDPOINTS.freeFrontierContextPopularity, "freeFrontiers", null, true),
  request("history", ENDPOINTS.history, "history", null, true),
  ...GITHUB_CATEGORIES.map(([slug]) => request(`github:${slug}`, ENDPOINTS.githubRanking(slug), "github", null, true))
]);

export const undatedModelId = (id) => String(id).replace(/:free$/, "").replace(/-\d{8}$/, "").replace(/-\d{2}-\d{2}$/, "");

export function resolveTaskModel(id, catalogue) {
  if (catalogue.exact.has(id)) return Object.freeze({ match: "exact", row: catalogue.exact.get(id), via: null });
  const undated = undatedModelId(id);
  if (catalogue.undated.has(undated)) return Object.freeze({ match: "undated", row: catalogue.undated.get(undated), via: catalogue.undated.get(undated).id });
  return Object.freeze({ match: "unresolved", row: null, via: null });
}

export function buildModelCatalogue(responses) {
  const exact = new Map();
  const undated = new Map();
  for (const response of responses) {
    for (const row of Array.isArray(response?.data) ? response.data : []) {
      if (!exact.has(row.id)) exact.set(row.id, row);
      const key = undatedModelId(row.id);
      if (!undated.has(key)) undated.set(key, row);
    }
  }
  return Object.freeze({ exact, undated, size: exact.size });
}

export function topAppModelRequests(appsResponse) {
  const seen = new Set(); const requests = [];
  for (const app of Array.isArray(appsResponse?.data) ? appsResponse.data.slice(0, 10) : []) {
    const appId = String(app.appId); if (seen.has(appId)) continue; seen.add(appId);
    requests.push(request(`appModels:${appId}`, ENDPOINTS.appModels(appId), "appModels", null, true));
  }
  return Object.freeze(requests);
}

const historyStart = (end) => new Date(Date.parse(`${end}T00:00:00Z`) - 364 * 86_400_000).toISOString().slice(0, 10);
export function topGitHubEnrichmentRequests(rankings) {
  const seen = new Set(); const requests = [];
  for (const ranking of Array.isArray(rankings) ? rankings : [rankings]) {
    if (ranking?.ranking?.metric !== "maintenance") continue;
    const to = ranking.coverage?.resolvedAsOf; if (typeof to !== "string") continue;
    const rows = Array.isArray(ranking.data) ? [...ranking.data].sort((left, right) => left.rank - right.rank).slice(0, 10) : [];
    for (const row of rows) {
      const repositoryId = String(row.repositoryId); if (seen.has(repositoryId) || requests.length >= 80) continue; seen.add(repositoryId);
      requests.push(request(`githubEnrichment:${repositoryId}`, ENDPOINTS.githubEnrichment(repositoryId, historyStart(to), to), "githubEnrichment", null, true));
    }
  }
  return Object.freeze(requests);
}

export async function mapBounded(values, concurrency, mapper) {
  if (!Array.isArray(values) || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8 || typeof mapper !== "function") throw new TypeError("mapBounded requires an array, mapper, and concurrency between 1 and 8");
  const output = new Array(values.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => { while (cursor < values.length) { const index = cursor++; output[index] = await mapper(values[index], index); } }));
  return output;
}

export const FALLBACK_REQUESTS = Object.freeze([
  ...OVERVIEW_REQUESTS,
  ...GITHUB_CATEGORIES.flatMap(([slug]) => [
    request(`fallback:${slug}:maintenance`, ENDPOINTS.githubRanking(slug, "maintenance"), "github", null, true),
    ...[7, 30, 90].map((days) => request(`fallback:${slug}:momentum:${days}`, ENDPOINTS.githubRanking(slug, "momentum", days), "github", null, true))
  ])
]);

export function canonicalPath(input) {
  const url = new URL(input, "https://open-dashboard.invalid");
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
        : spec.kind === "githubEnrichment"
          ? validateGitHubEnrichment(raw, major)
        : spec.kind === "githubRepositories"
      ? validateGitHubRepositories(raw, major)
    : spec.kind === "liveModels"
      ? validateOpenRouterCollection(raw, "liveModels", major)
    : spec.kind === "providers"
          ? validateProviders(raw, major)
          : spec.kind === "freeFrontiers"
            ? validateFreeFrontiers(raw, major)
            : spec.kind === "history"
              ? validateHistory(raw, major)
            : validateOpenRouterCollection(raw, spec.kind, major);

const identityMismatch = (message, details = null) => { throw new ContractError("identity_mismatch", message, details); };
const requestUrl = (spec) => new URL(canonicalPath(spec.path), "https://open-dashboard.invalid");
const inclusiveUtcDays = (window) => {
  if (window?.timezone !== "UTC" || window?.inclusive !== true || typeof window.start !== "string" || typeof window.end !== "string") return null;
  const start = Date.parse(`${window.start}T00:00:00Z`); const end = Date.parse(`${window.end}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return null;
  return ((end - start) / 86_400_000) + 1;
};
export function assertResponseIdentity(spec, response) {
  const url = requestUrl(spec);
  if (spec.kind === "apps") {
    const expected = {
      period: url.searchParams.get("period"), sort: url.searchParams.get("sort"),
      category: url.searchParams.get("category"), subcategory: url.searchParams.get("subcategory"),
      limit: Number(url.searchParams.get("limit"))
    };
    const actual = response.requestSlice;
    for (const [key, value] of Object.entries(expected)) if (actual?.[key] !== value) identityMismatch(`OpenRouter app ${key} does not match the requested slice`, { expected: value, actual: actual?.[key] ?? null });
    if (!Array.isArray(response.data) || response.data.length > expected.limit) identityMismatch("OpenRouter app rows exceed the requested limit", { expected: expected.limit, actual: response.data?.length ?? null });
    const expectedDays = expected.period === "30d" ? 30 : null; const actualDays = inclusiveUtcDays(response.window);
    if (expectedDays === null || actualDays !== expectedDays) identityMismatch("OpenRouter app evidence window does not match the requested 30-day period", { expectedDays, actualDays });
  } else if (spec.kind === "github") {
    const expected = {
      category: url.searchParams.get("category"), metric: url.searchParams.get("metric"),
      entityLevel: url.searchParams.get("entity_level"), windowDays: url.searchParams.has("window") ? Number(url.searchParams.get("window")) : null,
      limit: Number(url.searchParams.get("limit"))
    };
    const actual = response.ranking;
    for (const [key, value] of [["category", expected.category], ["metric", expected.metric], ["entityLevel", expected.entityLevel], ["windowDays", expected.windowDays]]) if (actual?.[key] !== value) identityMismatch(`GitHub ${key} does not match the requested slice`, { expected: value, actual: actual?.[key] ?? null });
    if (response.page?.limit !== expected.limit) identityMismatch("GitHub page limit does not match the requested slice", { expected: expected.limit, actual: response.page?.limit ?? null });
  } else if (spec.kind === "appModels") {
    const match = url.pathname.match(/^\/apps\/([^/]+)\/models$/); const expected = match ? decodeURIComponent(match[1]) : null;
    if (!expected || response.appId !== expected) identityMismatch("Per-app response app ID does not match the request", { expected, actual: response.appId ?? null });
  } else if (spec.kind === "githubEnrichment") {
    const match = url.pathname.match(/^\/github\/repositories\/([^/]+)\/enrichment$/); const expectedRepository = match ? decodeURIComponent(match[1]) : null;
    const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
    if (!expectedRepository || response.repositoryId !== expectedRepository) identityMismatch("GitHub enrichment repository ID does not match the request", { expected: expectedRepository, actual: response.repositoryId ?? null });
    if (response.requestRange?.from !== from || response.requestRange?.to !== to) identityMismatch("GitHub enrichment request range does not match the requested range", { expected: { from, to }, actual: response.requestRange ?? null });
    const buckets = response.starBuckets || [];
    if (buckets.some((bucket) => bucket.start > bucket.end || bucket.start < from || bucket.end > to)) identityMismatch("GitHub enrichment star bucket falls outside the requested inclusive range", { from, to });
  } else if (spec.kind === "matrix") {
    const appLimit = Number(url.searchParams.get("appLimit")); const modelLimit = Number(url.searchParams.get("modelLimit"));
    if (!Number.isInteger(appLimit) || !Number.isInteger(modelLimit) || response.appIds.length > appLimit || response.modelIds.length > modelLimit) identityMismatch("App-model matrix axes exceed the requested limits", { appLimit, modelLimit, appAxes: response.appIds.length, modelAxes: response.modelIds.length });
    if (url.searchParams.get("window") !== "latest-complete") identityMismatch("App-model matrix window does not match the supported slice");
  }
  return response;
}

export const MAX_FREE_MODEL_PAGES = 10;
export const MAX_FREE_MODEL_ROWS = 2_000;

export function freeModelPagePath(initialPath, cursor) {
  if (typeof cursor !== "string" || cursor.length === 0) throw new ContractError("pagination_cursor", "Free-model pagination returned an empty cursor");
  const url = new URL(canonicalPath(initialPath), "https://open-dashboard.invalid");
  url.searchParams.set("cursor", cursor);
  return canonicalPath(`${url.pathname}?${url.searchParams}`);
}

const freePageIdentity = (page) => JSON.stringify({
  schemaVersion: page.schemaVersion,
  window: page.window,
  completeness: page.completeness,
  stale: page.stale,
  rank: page.rank,
  provenance: page.provenance,
  router: page.router,
  concreteFreeCount: page.concreteFreeCount
});

export async function collectFreeModelPages(initialSpec, loadPage) {
  if (initialSpec?.kind !== "free" || typeof loadPage !== "function") throw new TypeError("collectFreeModelPages requires a free-model request and loader");
  const pages = [];
  const rows = [];
  const rowIds = new Set();
  const cursors = new Set();
  let spec = initialSpec;
  let identity = null;
  while (true) {
    if (pages.length >= MAX_FREE_MODEL_PAGES) throw new ContractError("pagination_limit", `Free-model inventory exceeds ${MAX_FREE_MODEL_PAGES} pages`);
    const response = await loadPage(spec);
    const pageIdentity = freePageIdentity(response);
    if (identity === null) identity = pageIdentity;
    else if (pageIdentity !== identity) throw new ContractError("mixed_snapshot", "Free-model page identity or provenance changed during pagination");
    for (const row of response.data) {
      if (rowIds.has(row.id)) throw new ContractError("pagination_duplicate", `Free-model pagination repeated model ${row.id}`);
      rowIds.add(row.id); rows.push(row);
      if (rows.length > MAX_FREE_MODEL_ROWS) throw new ContractError("pagination_limit", `Free-model inventory exceeds ${MAX_FREE_MODEL_ROWS} rows`);
    }
    pages.push(Object.freeze({ spec, response }));
    if (response.cursor === null) break;
    if (cursors.has(response.cursor)) throw new ContractError("pagination_loop", "Free-model pagination repeated an opaque cursor");
    cursors.add(response.cursor);
    spec = Object.freeze({ ...initialSpec, path: freeModelPagePath(initialSpec.path, response.cursor) });
  }
  if (BigInt(pages[0].response.concreteFreeCount) !== BigInt(rows.length)) throw new ContractError("pagination_incomplete", "Free-model pagination did not resolve the published concrete model count", { expected: pages[0].response.concreteFreeCount, actual: String(rows.length) });
  const response = Object.freeze({ ...pages[0].response, data: Object.freeze(rows), cursor: null });
  return Object.freeze({ pages: Object.freeze(pages), response });
}

export function manifestPublicationIdentity(manifest) {
  const sources = manifest.sources.map((source) => [source.sourceId, source.publishedRunId, source.publishedAt, source.transformVersion]).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([manifest.schemaVersion, manifest.publishedAt, sources]);
}
const oldestEvidenceAt = (manifest, responses) => {
  const provenanceTimes = Object.values(responses).flatMap((response) => Array.isArray(response?.provenance) ? response.provenance.map((item) => item?.fetchedAt) : []).filter((value) => typeof value === "string" && Number.isFinite(Date.parse(value)));
  const sourceTimes = manifest.sources.map((source) => source.publishedAt).filter((value) => typeof value === "string" && Number.isFinite(Date.parse(value)));
  const candidates = provenanceTimes.length ? provenanceTimes : sourceTimes;
  return candidates.length ? new Date(Math.min(...candidates.map((value) => Date.parse(value)))).toISOString() : manifest.publishedAt;
};

const MAX_PRODUCTION_FALLBACK_AGE_MS = 48 * 3_600_000;
const MAX_PUBLIC_RESPONSE_BYTES = 4 * 1024 * 1024;
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

export const isSyntheticEvidenceRecord = (record) => {
  if (!record || typeof record !== "object") return false;
  const reviewedGitHubSeed = record.sourceId === "github.seed-registry.v1" && record.transformVersion === "github-seed-materialization-v1";
  if (reviewedGitHubSeed) return false;
  const marker = /fixture|(?:^|[^a-z])test(?:[^a-z]|$)|seed|deterministic[-_ ]?preview/i;
  return [record.sourceId, record.transformVersion, record.citation, record.citationUrl, record.id, record.sourceUrl].some((value) => typeof value === "string" && marker.test(value));
};
const hasFixtureMarker = (manifest, responses) => manifest.sources.some(isSyntheticEvidenceRecord)
  || Object.values(responses).some((response) => Array.isArray(response?.provenance) && response.provenance.some(isSyntheticEvidenceRecord));

const normalizedOrigin = (value, label) => {
  if (value === null || value === undefined || value === "") return null;
  let url;
  try { url = new URL(value); } catch { throw new TypeError(`${label} must be an HTTP(S) origin`); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new TypeError(`${label} must be an HTTP(S) origin`);
  return url;
};

const localPreviewOrigin = (url) => url && (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]");
const fixturePreviewAllowed = (runtimeOrigin, fixturePreviewOrigins) => {
  if (!Array.isArray(fixturePreviewOrigins) || fixturePreviewOrigins.length > 20) throw new TypeError("fixturePreviewOrigins must be a bounded array");
  const runtime = normalizedOrigin(runtimeOrigin, "runtimeOrigin");
  const previews = new Set(fixturePreviewOrigins.map((value) => {
    const url = normalizedOrigin(value, "fixturePreviewOrigins entry");
    if (!url || url.protocol !== "https:") throw new TypeError("fixturePreviewOrigins entries must be HTTPS origins");
    return url.origin;
  }));
  return localPreviewOrigin(runtime) || (runtime && previews.has(runtime.origin));
};

export function assertFallbackPolicy(bundle, runtimeOrigin, fixturePreviewOrigins = []) {
  if (bundle.bundleKind === "fixture") {
    if (!fixturePreviewAllowed(runtimeOrigin, fixturePreviewOrigins)) throw new ContractError("unavailable", "Fixture fallback is unavailable on production origins");
    return bundle;
  }
  if (bundle.snapshotStale) throw new ContractError("unavailable", "Live fallback evidence is older than 48 hours");
  if (!bundle.productionEligible) throw new ContractError("unavailable", "Fallback is not require-live validated for production");
  return bundle;
}

export async function readPublicJsonResponse(response, label = "Public API") {
  const contentLength = response.headers?.get?.("Content-Length");
  if (contentLength !== null && contentLength !== undefined) {
    if (!/^(?:0|[1-9]\d*)$/.test(contentLength)) throw new ContractError("invalid_http_response", `${label} returned an invalid Content-Length`);
    if (BigInt(contentLength) > BigInt(MAX_PUBLIC_RESPONSE_BYTES)) throw new ContractError("response_too_large", `${label} exceeds the 4 MiB response limit`);
  }
  let text = ""; let bytes = 0;
  if (response.body?.getReader) {
    const reader = response.body.getReader(); const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.byteLength; if (bytes > MAX_PUBLIC_RESPONSE_BYTES) { await reader.cancel(); throw new ContractError("response_too_large", `${label} exceeds the 4 MiB response limit`); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock?.(); }
  } else {
    text = await response.text(); bytes = new TextEncoder().encode(text).length;
    if (bytes > MAX_PUBLIC_RESPONSE_BYTES) throw new ContractError("response_too_large", `${label} exceeds the 4 MiB response limit`);
  }
  try { return JSON.parse(text); } catch { throw new ContractError("invalid_json", `${label} returned invalid JSON`); }
}

export async function readFallbackResponse(response, now = new Date()) {
  if (response.redirected) throw new ContractError("invalid_fallback", "Fallback redirects are not allowed");
  const lastModifiedHeader = response.headers?.get?.("Last-Modified"); let lastModified = null;
  if (lastModifiedHeader !== null && lastModifiedHeader !== undefined) {
    lastModified = Date.parse(lastModifiedHeader);
    if (!Number.isFinite(lastModified)) throw new ContractError("invalid_fallback", "Fallback Last-Modified is invalid");
    if (!Number.isFinite(now.getTime()) || lastModified > now.getTime() + 5 * 60_000) throw new ContractError("invalid_fallback", "Fallback Last-Modified is in the future");
  }
  const raw = await readPublicJsonResponse(response, "Fallback snapshot");
  if (lastModified !== null && typeof raw?.generatedAt === "string") {
    const generatedAt = Date.parse(raw.generatedAt);
    if (!Number.isFinite(generatedAt) || lastModified + 1_000 < generatedAt) throw new ContractError("invalid_fallback", "Fallback Last-Modified predates its generatedAt evidence");
  }
  return raw;
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
    const readPage = async (pageSpec) => {
      const pagePath = canonicalPath(pageSpec.path);
      if (!Object.hasOwn(bundle.responses, pagePath)) throw new ContractError("invalid_fallback", `Fallback is missing cursor page ${pagePath}`);
      const response = validateFor(pageSpec, bundle.responses[pagePath], schemaMajor); assertResponseIdentity(pageSpec, response);
      if (pageSpec.sourceId) assertPublishedRun(manifest, pageSpec.sourceId, response);
      return response;
    };
    responses[spec.key] = spec.kind === "free" ? (await collectFreeModelPages(spec, readPage)).response : await readPage(spec);
  }
  const oldest = isoTime(bundle.oldestFetchedAt, "Fallback oldestFetchedAt is invalid");
  const derivedOldest = Math.min(...Object.values(derivedFreshness).map((item) => Date.parse(item.oldestFetchedAt)));
  if (oldest !== derivedOldest) throw new ContractError("invalid_fallback", "Fallback oldestFetchedAt does not match dataset evidence");
  const age = now.getTime() - oldest;
  if (!Number.isFinite(now.getTime()) || (live && age < 0)) throw new ContractError("invalid_fallback", "Fallback evidence time is in the future");
  const snapshotStale = fixture || age >= MAX_PRODUCTION_FALLBACK_AGE_MS;
  return Object.freeze({ ...bundle, manifest, publicationIdentity: manifestPublicationIdentity(manifest), responses: Object.freeze(responses), errors: Object.freeze(errors), snapshotStale, productionEligible: live && !snapshotStale });
}

export function createOpenDashboardClient({ apiBase, schemaMajor, timeoutMs, fallbackUrl = null, fallbackOnMissingV2 = false, fixturePreviewOrigins = [], runtimeOrigin = globalThis.location?.origin ?? null, conditionalRequests = false, fetchImpl = globalThis.fetch }) {
  const base = safePublicUrl(apiBase);
  if (!base || base.protocol !== "https:" || base.pathname !== "/" || base.search || base.hash) throw new TypeError("apiBase must be a public credential-free HTTPS origin");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new TypeError("timeoutMs is outside the supported range");
  const cache = new Map();
  let fallbackRawPromise = null;
  const fallbackViewCache = new Map();

  async function fetchJson(spec, { conditional = true } = {}) {
    const key = canonicalPath(spec.path);
    const cached = cache.get(key);
    const headers = new Headers({ Accept: "application/json" });
    if (conditionalRequests && conditional && cached?.etag) headers.set("If-None-Match", cached.etag);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException("timed out", "TimeoutError")), timeoutMs);
    try {
      const response = await fetchImpl(new URL(`/api/public/v2${key}`, base).href, { method: "GET", headers, credentials: "omit", signal: controller.signal, cache: "no-store", redirect: "error" });
      if (response.status === 304) {
        if (!cached) return fetchJson(spec, { conditional: false });
        return cached.body;
      }
      if (!response.ok) {
        let publicError;
        try { publicError = validatePublicError(await readPublicJsonResponse(response), schemaMajor); }
        catch (error) { if (error?.code === "response_too_large") throw error; throw new ContractError("invalid_http_error", `Public API returned HTTP ${response.status} without a valid public error`, { status: response.status }); }
        throw new ContractError("http_error", publicError.error.message, { status: response.status, availability: response.status >= 500, apiCode: publicError.error.code, retryable: publicError.error.retryable });
      }
      let raw;
      raw = await readPublicJsonResponse(response);
      const body = validateFor(spec, raw, schemaMajor); assertResponseIdentity(spec, body);
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
    const cacheKey = requests.map((spec) => `${spec.key}:${canonicalPath(spec.path)}:${spec.kind}:${spec.sourceId || ""}:${Boolean(spec.optional)}`).join("|");
    if (!fallbackRawPromise) fallbackRawPromise = (async () => {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(new DOMException("timed out", "TimeoutError")), timeoutMs);
      try {
        const response = await fetchImpl(fallbackUrl, { method: "GET", credentials: "omit", cache: "no-store", redirect: "error", signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new ContractError("unavailable", "Fallback snapshot is unavailable");
        return readFallbackResponse(response);
      } catch (error) {
        if (controller.signal.aborted || error?.name === "AbortError" || error?.name === "TimeoutError") throw new ContractError("timeout", "Fallback snapshot request timed out");
        throw error;
      } finally { clearTimeout(timer); }
    })().catch((error) => { fallbackRawPromise = null; throw error; });
    if (!fallbackViewCache.has(cacheKey)) fallbackViewCache.set(cacheKey, (async () => {
      const bundle = await verifyFallbackBundle(await fallbackRawPromise, requests, schemaMajor);
      assertFallbackPolicy(bundle, runtimeOrigin, fixturePreviewOrigins);
      return Object.freeze({ mode: "snapshot", bundleKind: bundle.bundleKind, fallbackLabel: bundle.label, productionEligible: bundle.productionEligible, manifest: bundle.manifest, publicationIdentity: bundle.publicationIdentity, responses: bundle.responses, errors: bundle.errors, snapshotStale: bundle.snapshotStale, oldestFetchedAt: bundle.oldestFetchedAt, datasetFreshness: bundle.datasetFreshness });
    })().catch((error) => { fallbackViewCache.delete(cacheKey); throw error; }));
    return fallbackViewCache.get(cacheKey);
  }

  const fallbackEligible = (error) => error?.code === "timeout" || error?.code === "network_unavailable" || (error?.code === "http_error" && error?.details?.availability === true) || (fallbackOnMissingV2 && error?.code === "invalid_http_error" && error?.details?.status === 404);
  async function loadView(requests, options = {}) {
    let manifest = options.manifest ?? null;
    if (!manifest) try { manifest = await fetchJson({ key: "manifest", path: ENDPOINTS.manifest, kind: "manifest" }); }
    catch (error) { if (!fallbackEligible(error)) throw error; return loadFallbackView(requests); }
    const publicationIdentity = manifestPublicationIdentity(manifest);
    const settled = await mapBounded(requests, 6, async (spec) => { try { return { status: "fulfilled", value: spec.kind === "free" ? (await collectFreeModelPages(spec, (pageSpec) => load(pageSpec, manifest))).response : await load(spec, manifest) }; } catch (reason) { return { status: "rejected", reason }; } });
    const responses = {}; const errors = {};
    settled.forEach((result, index) => { const spec = requests[index]; if (result.status === "fulfilled") responses[spec.key] = result.value; else errors[spec.key] = result.reason; });
    if (requests.some((spec) => !spec.sourceId)) {
      const confirmedManifest = await fetchJson({ key: "manifest", path: ENDPOINTS.manifest, kind: "manifest" }, { conditional: false });
      if (manifestPublicationIdentity(confirmedManifest) !== publicationIdentity) throw new ContractError("mixed_snapshot", "Manifest publication changed while loading unbound evidence");
    }
    if (hasFixtureMarker(manifest, responses)) {
      if (!fixturePreviewAllowed(runtimeOrigin, fixturePreviewOrigins)) throw new ContractError("unavailable", "Fixture or deterministic preview v2 evidence is unavailable on production origins");
      return Object.freeze({ mode: "fixture", bundleKind: "fixture", fallbackLabel: FIXTURE_FALLBACK_LABEL, productionEligible: false, manifest, publicationIdentity, responses: Object.freeze(responses), errors: Object.freeze(errors), snapshotStale: true, oldestFetchedAt: oldestEvidenceAt(manifest, responses) });
    }
    return Object.freeze({ mode: "live", productionEligible: true, manifest, publicationIdentity, responses: Object.freeze(responses), errors: Object.freeze(errors), snapshotStale: false });
  }

  return Object.freeze({ load, loadManifest: () => fetchJson({ key: "manifest", path: ENDPOINTS.manifest, kind: "manifest" }), loadView, clear: () => { cache.clear(); fallbackRawPromise = null; fallbackViewCache.clear(); } });
}
