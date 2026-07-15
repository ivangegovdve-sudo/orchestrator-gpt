const POPULATION = new Set(["full", "requested_slice", "top_n_plus_other", "partial_or_unknown"]);
const WINDOW_BASIS = new Set(["source_meta", "query", "derived", "observed", "unknown"]);
const SOURCE_TIERS = new Set(["stable", "supported", "best_effort"]);
const RANK_METHODS = new Set(["source_published", "response_order", "locally_calculated"]);
const LIFECYCLE = new Set(["expiration_unknown", "no_announced_expiration", "scheduled_deprecation", "past_expiration_still_listed", "absent_from_catalog", "removed_or_unavailable"]);
const GITHUB_METRICS = new Set(["adoption", "momentum", "maintenance"]);
const GITHUB_CATEGORIES = new Set(["ai-harnesses", "inference", "ai-skills", "mcp", "connectors", "a2a", "agent-frameworks", "ai-orchestration"]);
const INTEGER = /^(0|[1-9]\d*)$/;
const DECIMAL = /^(0|[1-9]\d*)(\.\d+)?$/;
const SIGNED_DECIMAL = /^-?(0|[1-9]\d*)(\.\d+)?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ContractError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "ContractError";
    this.code = code;
    this.details = details;
  }
}

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = (code, message, details = null) => { throw new ContractError(code, message, details); };
const strictRecord = (value, keys, name) => {
  if (!isRecord(value)) fail("invalid_contract", `${name} must be an object`);
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail("unknown_field", `${name}.${key} is not in schema 2.0`);
  for (const key of keys) if (!Object.hasOwn(value, key)) fail("missing_field", `${name}.${key} is required`);
  return value;
};
const string = (value, name) => { if (typeof value !== "string") fail("invalid_contract", `${name} must be a string`); return value; };
const nullableString = (value, name) => value === null ? null : string(value, name);
const boolean = (value, name) => { if (typeof value !== "boolean") fail("invalid_contract", `${name} must be a boolean`); return value; };
const uuid = (value, name) => { if (typeof value !== "string" || !UUID.test(value)) fail("invalid_contract", `${name} must be a UUID`); return value; };
const date = (value, name) => { if (typeof value !== "string" || !ISO_DATE.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))) fail("invalid_contract", `${name} must be an ISO date`); return value; };
const dateTime = (value, name) => { if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) fail("invalid_contract", `${name} must be an ISO datetime`); return value; };
const integerString = (value, name) => { if (typeof value !== "string" || !INTEGER.test(value)) fail("invalid_contract", `${name} must be an unsigned integer string`); return value; };
const decimalString = (value, name) => { if (typeof value !== "string" || !DECIMAL.test(value)) fail("invalid_contract", `${name} must be an unsigned decimal string`); return value; };
const signedDecimalString = (value, name) => { if (typeof value !== "string" || !SIGNED_DECIMAL.test(value)) fail("invalid_contract", `${name} must be an exact decimal string`); return value; };
const schema = (value, expectedMajor) => {
  const version = string(value, "schemaVersion");
  if (version !== `${expectedMajor}.0`) fail("schema_major_mismatch", `Expected schema major ${expectedMajor}; received ${version}`);
  return version;
};

const validateWindow = (raw) => {
  const row = strictRecord(raw, ["start", "end", "timezone", "inclusive", "basis"], "window");
  if (row.start !== null) date(row.start, "window.start");
  if (row.end !== null) date(row.end, "window.end");
  if (!["UTC", "unknown"].includes(row.timezone) || (row.inclusive !== null && typeof row.inclusive !== "boolean") || !WINDOW_BASIS.has(row.basis)) fail("invalid_contract", "window is invalid");
  return Object.freeze({ ...row });
};

const validateCompleteness = (raw) => {
  const row = strictRecord(raw, ["acquisitionComplete", "populationCompleteness", "missingFields"], "completeness");
  boolean(row.acquisitionComplete, "completeness.acquisitionComplete");
  if (!POPULATION.has(row.populationCompleteness) || !Array.isArray(row.missingFields) || row.missingFields.some((item) => typeof item !== "string")) fail("invalid_contract", "completeness is invalid");
  return Object.freeze({ ...row, missingFields: Object.freeze(row.missingFields.slice()) });
};

const validateProvenance = (raw) => {
  if (!Array.isArray(raw)) fail("invalid_contract", "provenance must be an array");
  return Object.freeze(raw.map((item, index) => {
    const row = strictRecord(item, ["sourceId", "sourceTier", "runId", "fetchedAt", "sourceAsOf", "transformVersion", "citation"], `provenance[${index}]`);
    string(row.sourceId, "provenance.sourceId");
    if (!SOURCE_TIERS.has(row.sourceTier)) fail("invalid_contract", "provenance source tier is invalid");
    uuid(row.runId, "provenance.runId"); dateTime(row.fetchedAt, "provenance.fetchedAt");
    if (row.sourceAsOf !== null) dateTime(row.sourceAsOf, "provenance.sourceAsOf");
    string(row.transformVersion, "provenance.transformVersion"); nullableString(row.citation, "provenance.citation");
    return Object.freeze({ ...row });
  }));
};

const validateRank = (raw) => {
  if (raw === null) return null;
  const row = strictRecord(raw, ["metric", "unit", "direction", "rankMethod", "baseline", "eligiblePopulation", "ruleVersion", "taxonomyVersion"], "rank");
  string(row.metric, "rank.metric"); string(row.unit, "rank.unit");
  if (!["asc", "desc"].includes(row.direction) || !RANK_METHODS.has(row.rankMethod)) fail("invalid_contract", "rank metadata is invalid");
  nullableString(row.baseline, "rank.baseline"); if (row.eligiblePopulation !== null) integerString(row.eligiblePopulation, "rank.eligiblePopulation");
  string(row.ruleVersion, "rank.ruleVersion"); nullableString(row.taxonomyVersion, "rank.taxonomyVersion");
  return Object.freeze({ ...row });
};

const MODEL_KEYS = ["id", "canonicalSlug", "name", "description", "contentTrust", "createdUnix", "contextLength", "architecture", "pricing", "supportedParameters", "expirationDate", "lifecycleState", "freeKind", "weeklyRank", "rankMethod"];
const validateModel = (raw, name) => {
  const row = strictRecord(raw, MODEL_KEYS, name);
  string(row.id, `${name}.id`); string(row.canonicalSlug, `${name}.canonicalSlug`); string(row.name, `${name}.name`); nullableString(row.description, `${name}.description`);
  if (row.contentTrust !== "untrusted-source") fail("invalid_contract", `${name}.contentTrust is invalid`);
  integerString(row.createdUnix, `${name}.createdUnix`); if (row.contextLength !== null) integerString(row.contextLength, `${name}.contextLength`);
  if (!isRecord(row.architecture) || !isRecord(row.pricing) || !Array.isArray(row.supportedParameters) || row.supportedParameters.some((item) => typeof item !== "string")) fail("invalid_contract", `${name} capability fields are invalid`);
  for (const [key, value] of Object.entries(row.pricing)) if (value !== null) decimalString(value, `${name}.pricing.${key}`);
  if (row.expirationDate !== null) date(row.expirationDate, `${name}.expirationDate`);
  if (!LIFECYCLE.has(row.lifecycleState) || !["concrete_free", "free_router", "paid_or_unknown"].includes(row.freeKind)) fail("invalid_contract", `${name} lifecycle/free kind is invalid`);
  if (row.weeklyRank !== null && (!Number.isInteger(row.weeklyRank) || row.weeklyRank < 1)) fail("invalid_contract", `${name}.weeklyRank is invalid`);
  if (row.rankMethod !== null && row.rankMethod !== "response_order") fail("invalid_contract", `${name}.rankMethod is invalid`);
  return Object.freeze({ ...row, architecture: Object.freeze({ ...row.architecture }), pricing: Object.freeze({ ...row.pricing }), supportedParameters: Object.freeze(row.supportedParameters.slice()) });
};

const validators = {
  models: validateModel,
  free: validateModel,
  apps(raw, name) {
    const row = strictRecord(raw, ["appId", "appName", "rank", "totalTokens", "totalRequests"], name);
    integerString(row.appId, `${name}.appId`); string(row.appName, `${name}.appName`);
    if (!Number.isInteger(row.rank) || row.rank < 1) fail("invalid_contract", `${name}.rank is invalid`);
    integerString(row.totalTokens, `${name}.totalTokens`); integerString(row.totalRequests, `${name}.totalRequests`);
    return Object.freeze({ ...row });
  },
  deprecations(raw, name) {
    const row = strictRecord(raw, ["modelId", "state", "expirationDate", "firstObservedAt", "lastObservedAt", "evidenceRunId"], name);
    string(row.modelId, `${name}.modelId`); if (!LIFECYCLE.has(row.state)) fail("invalid_contract", `${name}.state is invalid`);
    if (row.expirationDate !== null) date(row.expirationDate, `${name}.expirationDate`);
    dateTime(row.firstObservedAt, `${name}.firstObservedAt`); dateTime(row.lastObservedAt, `${name}.lastObservedAt`); uuid(row.evidenceRunId, `${name}.evidenceRunId`);
    return Object.freeze({ ...row });
  },
  tasks(raw, name) {
    const row = strictRecord(raw, ["tag", "displayName", "macroCategory", "usageShare", "tokenShare", "categoryUsageShare", "categoryTokenShare", "sampled", "absoluteVolumeAvailable", "otherExcluded", "topModelsComplete", "models"], name);
    string(row.tag, `${name}.tag`); string(row.displayName, `${name}.displayName`); string(row.macroCategory, `${name}.macroCategory`);
    for (const key of ["usageShare", "tokenShare", "categoryUsageShare", "categoryTokenShare"]) decimalString(row[key], `${name}.${key}`);
    if (row.sampled !== true || row.absoluteVolumeAvailable !== false || row.otherExcluded !== true || row.topModelsComplete !== false || !Array.isArray(row.models)) fail("invalid_contract", `${name} sampled caveats are invalid`);
    const models = row.models.map((model, index) => {
      const item = strictRecord(model, ["id", "sourcePosition", "usageShare", "tokenShare"], `${name}.models[${index}]`);
      string(item.id, "task model id"); if (!Number.isInteger(item.sourcePosition) || item.sourcePosition < 1) fail("invalid_contract", "task model position is invalid"); decimalString(item.usageShare, "task model usageShare"); decimalString(item.tokenShare, "task model tokenShare");
      return Object.freeze({ ...item });
    });
    return Object.freeze({ ...row, models: Object.freeze(models) });
  },
  benchmarks(raw, name) {
    const artificial = raw?.source === "artificial-analysis";
    const keys = artificial ? ["source", "modelPermaslug", "displayName", "matchStatus", "pricing", "citation", "sourceUrl", "intelligenceIndex", "codingIndex", "agenticIndex"] : ["source", "modelPermaslug", "displayName", "matchStatus", "pricing", "citation", "sourceUrl", "arena", "category", "elo", "winRate", "avgGenerationTimeMs", "tournamentStats"];
    const row = strictRecord(raw, keys, name);
    if (!['artificial-analysis', 'design-arena'].includes(row.source) || !['matched', 'unmatched'].includes(row.matchStatus)) fail("invalid_contract", `${name} benchmark discriminator is invalid`);
    string(row.modelPermaslug, `${name}.modelPermaslug`); string(row.displayName, `${name}.displayName`); string(row.citation, `${name}.citation`);
    if (row.sourceUrl !== null && !safePublicUrl(row.sourceUrl)) fail("invalid_contract", `${name}.sourceUrl is not public`);
    const pricing = strictRecord(row.pricing, ["prompt", "completion"], `${name}.pricing`); if (pricing.prompt !== null) decimalString(pricing.prompt, `${name}.pricing.prompt`); if (pricing.completion !== null) decimalString(pricing.completion, `${name}.pricing.completion`);
    if (artificial) {
      for (const key of ["intelligenceIndex", "codingIndex", "agenticIndex"]) if (row[key] !== null && typeof row[key] !== "number") fail("invalid_contract", `${name}.${key} is invalid`);
      return Object.freeze({ ...row, pricing: Object.freeze({ ...pricing }) });
    }
    string(row.arena, `${name}.arena`); string(row.category, `${name}.category`);
    if (typeof row.elo !== "number" || typeof row.winRate !== "number" || row.winRate < 0 || row.winRate > 100 || (row.avgGenerationTimeMs !== null && (typeof row.avgGenerationTimeMs !== "number" || row.avgGenerationTimeMs < 0))) fail("invalid_contract", `${name} metrics are invalid`);
    const stats = strictRecord(row.tournamentStats, ["firstPlace", "secondPlace", "thirdPlace", "fourthPlace", "total"], `${name}.tournamentStats`); for (const value of Object.values(stats)) if (value !== null && !Number.isInteger(value)) fail("invalid_contract", `${name} tournament stats are invalid`);
    return Object.freeze({ ...row, pricing: Object.freeze({ ...pricing }), tournamentStats: Object.freeze({ ...stats }) });
  },
  providers(raw, name) {
    const row = strictRecord(raw, ["modelId", "provider", "endpoint", "quantization", "contextLength", "promptPrice", "completionPrice", "uptime", "latency", "throughput", "status", "sourceUrl", "fetchedAt"], name);
    string(row.modelId, `${name}.modelId`); string(row.provider, `${name}.provider`); string(row.endpoint, `${name}.endpoint`); nullableString(row.quantization, `${name}.quantization`);
    if (row.contextLength !== null) integerString(row.contextLength, `${name}.contextLength`);
    for (const key of ["promptPrice", "completionPrice", "uptime", "latency", "throughput"]) if (row[key] !== null) decimalString(row[key], `${name}.${key}`);
    nullableString(row.status, `${name}.status`); if (!safePublicUrl(row.sourceUrl)) fail("invalid_contract", `${name}.sourceUrl is not public`); dateTime(row.fetchedAt, `${name}.fetchedAt`);
    return Object.freeze({ ...row });
  },
  freeFrontiers(raw, name) {
    const row = strictRecord(raw, ["ruleVersion", "dimensions", "members", "excluded"], name);
    if (row.ruleVersion !== "openrouter-free-pareto-v1") fail("invalid_contract", `${name}.ruleVersion is invalid`);
    const dimensions = strictRecord(row.dimensions, ["x", "y", "xDirection", "yDirection"], `${name}.dimensions`);
    if (!["benchmarkQuality", "contextLength"].includes(dimensions.x) || !["medianThroughput", "weeklyPopularityRank"].includes(dimensions.y) || !["min", "max"].includes(dimensions.xDirection) || !["min", "max"].includes(dimensions.yDirection)) fail("invalid_contract", `${name}.dimensions are invalid`);
    if (!Array.isArray(row.members) || !Array.isArray(row.excluded)) fail("invalid_contract", `${name} membership is invalid`);
    const members = row.members.map((item, index) => { const member = strictRecord(item, ["modelId", "x", "y"], `${name}.members[${index}]`); string(member.modelId, "frontier.modelId"); decimalString(member.x, "frontier.x"); decimalString(member.y, "frontier.y"); return Object.freeze({ ...member }); });
    const excluded = row.excluded.map((item, index) => { const value = strictRecord(item, ["modelId", "reason"], `${name}.excluded[${index}]`); string(value.modelId, "frontier excluded modelId"); string(value.reason, "frontier excluded reason"); return Object.freeze({ ...value }); });
    return Object.freeze({ ...row, dimensions: Object.freeze({ ...dimensions }), members: Object.freeze(members), excluded: Object.freeze(excluded) });
  }
};

export function validateOpenRouterCollection(raw, kind, expectedMajor = "2") {
  const free = kind === "free";
  const keys = ["schemaVersion", "data", "cursor", "window", "completeness", "stale", "rank", "provenance", ...(free ? ["router", "concreteFreeCount"] : [])];
  const row = strictRecord(raw, keys, `${kind} response`); schema(row.schemaVersion, expectedMajor);
  if (!validators[kind] || !Array.isArray(row.data) || (row.cursor !== null && typeof row.cursor !== "string") || typeof row.stale !== "boolean") fail("invalid_contract", `${kind} response is invalid`);
  const result = { schemaVersion: row.schemaVersion, data: Object.freeze(row.data.map((item, index) => validators[kind](item, `${kind}.data[${index}]`))), cursor: row.cursor, window: validateWindow(row.window), completeness: validateCompleteness(row.completeness), stale: row.stale, rank: validateRank(row.rank), provenance: validateProvenance(row.provenance) };
  if (free) { result.router = row.router === null ? null : validateModel(row.router, "free.router"); result.concreteFreeCount = integerString(row.concreteFreeCount, "free.concreteFreeCount"); }
  return Object.freeze(result);
}

export const validateProviders = (raw, expectedMajor = "2") => validateOpenRouterCollection(raw, "providers", expectedMajor);
export const validateFreeFrontiers = (raw, expectedMajor = "2") => validateOpenRouterCollection(raw, "freeFrontiers", expectedMajor);

const validateObservedPeriod = (raw, name) => {
  const row = strictRecord(raw, ["start", "end", "unit", "inclusive"], name); date(row.start, `${name}.start`); date(row.end, `${name}.end`);
  if (row.unit !== "day" || row.inclusive !== true) fail("invalid_contract", `${name} must be one inclusive day`);
  return Object.freeze({ ...row });
};
const validateAppModelCell = (raw, name) => {
  if (raw?.state === "observed") {
    const row = strictRecord(raw, ["state", "appId", "modelId", "totalTokens", "rankWithinPeriod", "period", "metricSemantics", "evidenceUrl"], name);
    integerString(row.appId, `${name}.appId`); string(row.modelId, `${name}.modelId`); integerString(row.totalTokens, `${name}.totalTokens`);
    if (!Number.isInteger(row.rankWithinPeriod) || row.rankWithinPeriod < 1 || row.metricSemantics !== "observed_daily_total_tokens" || !safePublicUrl(row.evidenceUrl)) fail("invalid_contract", `${name} observed evidence is invalid`);
    return Object.freeze({ ...row, period: validateObservedPeriod(row.period, `${name}.period`) });
  }
  const row = strictRecord(raw, ["state", "appId", "modelId", "reason"], name);
  if (row.state !== "unknown" || !["not_observed", "unmapped_alias", "not_published"].includes(row.reason)) fail("invalid_contract", `${name} unknown state is invalid`);
  integerString(row.appId, `${name}.appId`); string(row.modelId, `${name}.modelId`); return Object.freeze({ ...row });
};

export function validateAppModelMatrix(raw, expectedMajor = "2") {
  if (raw?.status === "available") {
    const row = strictRecord(raw, ["schemaVersion", "status", "watermark", "resolvedPeriod", "appIds", "modelIds", "cells", "missingAliases", "coverage", "provenance"], "app-model matrix"); schema(row.schemaVersion, expectedMajor); string(row.watermark, "matrix.watermark");
    if (!Array.isArray(row.appIds) || row.appIds.length > 10 || !Array.isArray(row.modelIds) || row.modelIds.length > 10 || !Array.isArray(row.cells) || !Array.isArray(row.missingAliases)) fail("invalid_contract", "matrix axes/cells are invalid");
    const coverage = strictRecord(row.coverage, ["observedCells", "possibleCells", "populationCompleteness"], "matrix.coverage");
    if (!Number.isInteger(coverage.observedCells) || coverage.observedCells < 0 || !Number.isInteger(coverage.possibleCells) || coverage.possibleCells < 0 || coverage.populationCompleteness !== "partial_or_unknown") fail("invalid_contract", "matrix coverage is invalid");
    return Object.freeze({ ...row, resolvedPeriod: validateObservedPeriod(row.resolvedPeriod, "matrix.resolvedPeriod"), appIds: Object.freeze(row.appIds.map((value) => integerString(value, "matrix.appId"))), modelIds: Object.freeze(row.modelIds.map((value) => string(value, "matrix.modelId"))), cells: Object.freeze(row.cells.map((item, index) => validateAppModelCell(item, `matrix.cells[${index}]`))), missingAliases: Object.freeze(row.missingAliases.map((value) => integerString(value, "matrix.missingAlias"))), coverage: Object.freeze({ ...coverage }), provenance: validateProvenance(row.provenance) });
  }
  const row = strictRecord(raw, ["schemaVersion", "status", "reason", "lastSuccessAt", "appIds", "modelIds", "cells"], "app-model matrix unavailable"); schema(row.schemaVersion, expectedMajor);
  if (row.status !== "unavailable" || !["collection_disabled", "not_published", "no_common_period"].includes(row.reason) || (row.lastSuccessAt !== null && !Number.isFinite(Date.parse(row.lastSuccessAt))) || !Array.isArray(row.appIds) || row.appIds.length > 10 || !Array.isArray(row.modelIds) || row.modelIds.length > 10 || !Array.isArray(row.cells) || row.cells.length !== 0) fail("invalid_contract", "matrix unavailable state is invalid");
  return Object.freeze({ ...row, appIds: Object.freeze(row.appIds.map((value) => integerString(value, "matrix.appId"))), modelIds: Object.freeze(row.modelIds.map((value) => string(value, "matrix.modelId"))), cells: Object.freeze([]) });
}

export function validateAppModels(raw, expectedMajor = "2") {
  if (raw?.status === "available") {
    const row = strictRecord(raw, ["schemaVersion", "status", "watermark", "appId", "appName", "resolvedPeriod", "data", "cursor", "coverage", "provenance"], "app models"); schema(row.schemaVersion, expectedMajor); string(row.watermark, "appModels.watermark"); integerString(row.appId, "appModels.appId"); string(row.appName, "appModels.appName");
    if (!Array.isArray(row.data) || row.data.length > 100 || row.cursor !== null) fail("invalid_contract", "appModels data/cursor is invalid");
    const data = row.data.map((item, index) => { const value = strictRecord(item, ["modelId", "rank", "rankMethod", "totalTokens", "metricSemantics", "evidenceUrl", "period"], `appModels.data[${index}]`); string(value.modelId, "appModels.modelId"); integerString(value.totalTokens, "appModels.totalTokens"); if (!Number.isInteger(value.rank) || value.rank < 1 || value.rankMethod !== "locally_calculated" || value.metricSemantics !== "observed_daily_total_tokens" || !safePublicUrl(value.evidenceUrl)) fail("invalid_contract", "appModels row is invalid"); return Object.freeze({ ...value, period: validateObservedPeriod(value.period, "appModels.period") }); });
    const coverage = strictRecord(row.coverage, ["observedModels", "populationCompleteness"], "appModels.coverage"); if (!Number.isInteger(coverage.observedModels) || coverage.observedModels < 0 || coverage.populationCompleteness !== "partial_or_unknown") fail("invalid_contract", "appModels coverage is invalid");
    return Object.freeze({ ...row, resolvedPeriod: validateObservedPeriod(row.resolvedPeriod, "appModels.resolvedPeriod"), data: Object.freeze(data), coverage: Object.freeze({ ...coverage }), provenance: validateProvenance(row.provenance) });
  }
  const row = strictRecord(raw, ["schemaVersion", "status", "reason", "lastSuccessAt", "appId", "data", "cursor"], "app models unavailable"); schema(row.schemaVersion, expectedMajor);
  if (row.status !== "unavailable" || !["collection_disabled", "unmapped_alias", "not_published", "no_observed_period"].includes(row.reason) || (row.lastSuccessAt !== null && !Number.isFinite(Date.parse(row.lastSuccessAt))) || !Array.isArray(row.data) || row.data.length !== 0 || row.cursor !== null) fail("invalid_contract", "appModels unavailable state is invalid");
  integerString(row.appId, "appModels.appId"); return Object.freeze({ ...row, data: Object.freeze([]) });
}

const validateHistoryBucket = (raw, name) => {
  const bucket = strictRecord(raw, ["date", "complete", "rows"], name); date(bucket.date, `${name}.date`); boolean(bucket.complete, `${name}.complete`); if (!Array.isArray(bucket.rows)) fail("invalid_contract", `${name}.rows is invalid`);
  const rows = bucket.rows.map((rawRow, index) => { const row = strictRecord(rawRow, ["id", "label", "scope", "rank", "value", "remainder", "stars", "forks"], `${name}.rows[${index}]`); string(row.id, `${name}.id`); string(row.label, `${name}.label`); nullableString(row.scope, `${name}.scope`); if (row.rank !== null && (!Number.isInteger(row.rank) || row.rank < 1)) fail("invalid_contract", `${name}.rank is invalid`); if (row.value !== null) signedDecimalString(row.value, `${name}.value`); if (row.remainder !== null) signedDecimalString(row.remainder, `${name}.remainder`); if (row.stars !== null) integerString(row.stars, `${name}.stars`); if (row.forks !== null) integerString(row.forks, `${name}.forks`); return Object.freeze({ ...row }); });
  return Object.freeze({ ...bucket, rows: Object.freeze(rows) });
};
export function validateHistory(raw, expectedMajor = "2") {
  if (raw?.status === "available") {
    const row = strictRecord(raw, ["schemaVersion", "status", "data", "window", "completeness", "stale", "rank", "provenance"], "history"); schema(row.schemaVersion, expectedMajor); if (row.rank !== null || typeof row.stale !== "boolean") fail("invalid_contract", "history rank/stale is invalid");
    const data = strictRecord(row.data, ["modelUsage", "appRanks", "githubRanks"], "history.data"); const map = (key) => { if (!Array.isArray(data[key]) || data[key].length > 365) fail("invalid_contract", `history.${key} is invalid`); return Object.freeze(data[key].map((bucket, index) => validateHistoryBucket(bucket, `history.${key}[${index}]`))); };
    return Object.freeze({ ...row, data: Object.freeze({ modelUsage: map("modelUsage"), appRanks: map("appRanks"), githubRanks: map("githubRanks") }), window: validateWindow(row.window), completeness: validateCompleteness(row.completeness), provenance: validateProvenance(row.provenance) });
  }
  const row = strictRecord(raw, ["schemaVersion", "status", "reason", "lastSuccessAt"], "history unavailable"); schema(row.schemaVersion, expectedMajor);
  if (row.status !== "unavailable" || row.reason !== "insufficient_history" || (row.lastSuccessAt !== null && !Number.isFinite(Date.parse(row.lastSuccessAt)))) fail("invalid_contract", "history unavailable state is invalid"); return Object.freeze({ ...row });
}

const SOURCE_KEYS = ["sourceId", "sourceTier", "cadenceSeconds", "staleAfterSeconds", "publishedRunId", "publishedAt", "nextScheduledAt", "stale", "transformVersion", "citationUrl", "lastAttemptRunId", "lastAttemptStatus", "lastAttemptStartedAt", "lastAttemptFinishedAt", "lastAttemptErrorCode", "lastAttemptAcquisitionComplete", "lastAttemptPopulationCompleteness"];
export function validateManifest(raw, expectedMajor = "2") {
  const row = strictRecord(raw, ["schemaVersion", "publishedAt", "routes", "sources", "provenance", "window"], "manifest"); schema(row.schemaVersion, expectedMajor);
  if (!Array.isArray(row.routes) || !Array.isArray(row.sources)) fail("invalid_manifest", "manifest routes/sources are invalid");
  const sources = row.sources.map((item, index) => { const source = strictRecord(item, SOURCE_KEYS, `manifest.sources[${index}]`); string(source.sourceId, "sourceId"); if (!SOURCE_TIERS.has(source.sourceTier) || typeof source.stale !== "boolean") fail("invalid_manifest", "manifest source state is invalid"); if (!Number.isInteger(source.cadenceSeconds) || source.cadenceSeconds < 1 || !Number.isInteger(source.staleAfterSeconds) || source.staleAfterSeconds < 1) fail("invalid_manifest", "manifest source cadence is invalid"); if (source.publishedRunId !== null) uuid(source.publishedRunId, "publishedRunId"); if (source.publishedAt !== null) dateTime(source.publishedAt, "publishedAt"); if (source.nextScheduledAt !== null) dateTime(source.nextScheduledAt, "nextScheduledAt"); string(source.transformVersion, "transformVersion"); if (source.lastAttemptRunId !== null) uuid(source.lastAttemptRunId, "lastAttemptRunId"); if (source.lastAttemptStatus !== null && !["running", "published", "failed"].includes(source.lastAttemptStatus)) fail("invalid_manifest", "lastAttemptStatus is invalid"); if (source.lastAttemptStartedAt !== null) dateTime(source.lastAttemptStartedAt, "lastAttemptStartedAt"); if (source.lastAttemptFinishedAt !== null) dateTime(source.lastAttemptFinishedAt, "lastAttemptFinishedAt"); if (source.lastAttemptErrorCode !== null) string(source.lastAttemptErrorCode, "lastAttemptErrorCode"); if (source.lastAttemptAcquisitionComplete !== null) boolean(source.lastAttemptAcquisitionComplete, "lastAttemptAcquisitionComplete"); if (source.lastAttemptPopulationCompleteness !== null && !POPULATION.has(source.lastAttemptPopulationCompleteness)) fail("invalid_manifest", "lastAttemptPopulationCompleteness is invalid"); if (source.citationUrl !== null && !safePublicUrl(source.citationUrl)) fail("invalid_manifest", "citationUrl is not public"); return Object.freeze({ ...source }); });
  if (new Set(sources.map((item) => item.sourceId)).size !== sources.length) fail("invalid_manifest", "manifest source IDs must be unique");
  if (row.publishedAt !== null) dateTime(row.publishedAt, "manifest.publishedAt"); if (row.routes.some((route) => typeof route !== "string" || !route.startsWith("/api/public/v2/"))) fail("invalid_manifest", "manifest route is invalid");
  const result = { schemaVersion: row.schemaVersion, publishedAt: row.publishedAt, routes: Object.freeze(row.routes.slice()), sources: Object.freeze(sources), provenance: validateProvenance(row.provenance), window: validateWindow(row.window) };
  Object.defineProperty(result, "sourceIndex", { value: Object.freeze(Object.fromEntries(sources.map((source) => [source.sourceId, source]))), enumerable: false });
  return Object.freeze(result);
}

export function assertPublishedRun(manifest, sourceId, response) {
  const expected = manifest.sourceIndex[sourceId]?.publishedRunId; const actual = response.provenance?.find((item) => item.sourceId === sourceId)?.runId;
  if (!expected || actual !== expected) fail("mixed_snapshot", "Response provenance does not match the manifest published run", { sourceId, expected: expected || null, actual: actual || null });
}

export function validatePublicError(raw, expectedMajor = "2") {
  const row = strictRecord(raw, ["schemaVersion", "error"], "public error"); schema(row.schemaVersion, expectedMajor); const error = strictRecord(row.error, ["code", "message", "correlationId", "retryable"], "public error.error"); string(error.code, "error.code"); string(error.message, "error.message"); uuid(error.correlationId, "error.correlationId"); boolean(error.retryable, "error.retryable"); return Object.freeze({ schemaVersion: row.schemaVersion, error: Object.freeze({ ...error }) });
}

export function validateGitHubRanking(raw, expectedMajor = "2") {
  const row = strictRecord(raw, ["schemaVersion", "watermark", "coverage", "ranking", "data", "page", "provenance"], "github ranking"); schema(row.schemaVersion, expectedMajor); string(row.watermark, "watermark");
  const coverage = strictRecord(row.coverage, ["resolvedAsOf", "acquisitionComplete", "populationCompleteness"], "coverage"); date(coverage.resolvedAsOf, "coverage.resolvedAsOf"); boolean(coverage.acquisitionComplete, "coverage.acquisitionComplete"); if (!POPULATION.has(coverage.populationCompleteness)) fail("invalid_contract", "GitHub coverage is invalid");
  const ranking = strictRecord(row.ranking, ["metric", "rankMethod", "ruleVersion", "taxonomyVersion", "category", "entityLevel", "eligiblePopulation", "windowDays"], "ranking"); if (!GITHUB_METRICS.has(ranking.metric) || !GITHUB_CATEGORIES.has(ranking.category) || ranking.rankMethod !== "locally_calculated" || !["project-family", "repository"].includes(ranking.entityLevel) || !Number.isInteger(ranking.eligiblePopulation) || ranking.eligiblePopulation < 0 || (ranking.windowDays !== null && ![7,30,90].includes(ranking.windowDays))) fail("invalid_contract", "GitHub ranking metadata is invalid"); string(ranking.ruleVersion, "ranking.ruleVersion"); string(ranking.taxonomyVersion, "ranking.taxonomyVersion");
  if (!Array.isArray(row.data)) fail("invalid_contract", "GitHub data is invalid"); const data = row.data.map((item, index) => { const value = strictRecord(item, ["repositoryId", "fullName", "stars", "forks", "rank", "score"], `github.data[${index}]`); integerString(value.repositoryId, "repositoryId"); string(value.fullName, "fullName"); integerString(value.stars, "stars"); integerString(value.forks, "forks"); if (!Number.isInteger(value.rank) || value.rank < 1 || (value.score !== null && typeof value.score !== "string")) fail("invalid_contract", "GitHub ranking row is invalid"); if (value.score !== null) signedDecimalString(value.score, "score"); return Object.freeze({ ...value }); });
  const page = strictRecord(row.page, ["limit", "nextCursor"], "page"); if (!Number.isInteger(page.limit) || page.limit < 1 || (page.nextCursor !== null && typeof page.nextCursor !== "string")) fail("invalid_contract", "GitHub page is invalid");
  if (!Array.isArray(row.provenance)) fail("invalid_contract", "GitHub provenance is invalid"); const provenance = row.provenance.map((item, index) => { const value = strictRecord(item, ["id", "sourceUrl", "fetchedAt"], `github.provenance[${index}]`); string(value.id, "provenance.id"); if (!safePublicUrl(value.sourceUrl)) fail("invalid_contract", "GitHub sourceUrl is not public"); dateTime(value.fetchedAt, "provenance.fetchedAt"); return Object.freeze({ ...value }); });
  return Object.freeze({ schemaVersion: row.schemaVersion, watermark: row.watermark, coverage: Object.freeze({ ...coverage }), ranking: Object.freeze({ ...ranking }), data: Object.freeze(data), page: Object.freeze({ ...page }), provenance: Object.freeze(provenance) });
}

export function compactIntegerString(raw) {
  if (!/^-?\d+$/.test(String(raw))) throw new TypeError("Expected an integer string"); const value = BigInt(raw); const negative = value < 0n; const absolute = negative ? -value : value;
  for (const [divisor, suffix] of [[1000000000000000000n,"Q"],[1000000000000000n,"q"],[1000000000000n,"T"],[1000000000n,"B"],[1000000n,"M"],[1000n,"K"]]) if (absolute >= divisor) { const tenths = absolute * 10n / divisor; return `${negative ? "-" : ""}${tenths / 10n}.${tenths % 10n}${suffix}`; }
  return String(value);
}
export function exactDecimalString(raw) { const value = String(raw); if (!/^-?\d+(?:\.\d+)?$/.test(value)) throw new TypeError("Expected an exact decimal string"); return value; }
const privateHostname = (hostname) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || (!host.includes(".") && !host.includes(":")) || host === "::" || host === "::1" || host.startsWith("::ffff:") || /^f[cd][0-9a-f]:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)) return true;
  const octets = host.split(".").map(Number); if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false; const [a,b] = octets;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};
export function safePublicUrl(raw) { try { const url = new URL(String(raw)); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || privateHostname(url.hostname)) return null; return url; } catch { return null; } }
export function canonicalJson(value) { if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`; if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`; return JSON.stringify(value); }
export async function sha256Hex(value) { const bytes = new TextEncoder().encode(canonicalJson(value)); const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
