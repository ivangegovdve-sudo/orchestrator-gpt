const POPULATION = new Set(["full", "requested_slice", "top_n_plus_other", "partial_or_unknown"]);
const WINDOW_BASIS = new Set(["source_meta", "query", "derived", "observed", "unknown"]);
const SOURCE_TIERS = new Set(["stable", "supported", "best_effort"]);
const FORBIDDEN_PUBLIC_KEYS = new Set(["sen" + "der", "sub" + "ject", "snip" + "pet", "body", "thread" + "id", "thread" + "ids", "labels", "extractedfacts", "rawpayload", "embedding", "embeddings", "access" + "code", "credentials", "authorization", "apikey", "accesstoken", "secret", "password", "cookie"]);
const RANK_METHODS = new Set(["source_published", "response_order", "locally_calculated"]);
const LIFECYCLE = new Set(["expiration_unknown", "no_announced_expiration", "scheduled_deprecation", "past_expiration_still_listed", "absent_from_catalog", "removed_or_unavailable"]);
const GITHUB_METRICS = new Set(["adoption", "momentum", "maintenance"]);
const GITHUB_CATEGORIES = new Set(["ai-harnesses", "inference", "ai-skills", "mcp", "connectors", "a2a", "agent-frameworks", "ai-orchestration"]);
const OPENROUTER_APP_CATEGORIES = new Set(["coding", "creative", "productivity", "entertainment"]);
const OPENROUTER_APP_SUBCATEGORIES = new Set(["cli-agent", "ide-extension", "cloud-agent", "programming-app", "native-app-builder", "creative-writing", "video-gen", "image-gen", "audio-gen", "roleplay", "game", "writing-assistant", "general-chat", "personal-agent", "legal"]);
const INTEGER = /^(?:0|[1-9]\d*)$/;
const POSITIVE_INTEGER = /^[1-9]\d*$/;
const SIGNED_INTEGER = /^(?:0|[1-9]\d*|-[1-9]\d*)$/;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SIGNED_DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_TEXT_LENGTH = 4096;
const MAX_URL_LENGTH = 2048;
const MAX_COLLECTION_ROWS = 200;
// One provenance entry per distinct contributing source, so this scales with the
// rows it explains, not with a hand-picked number. The old 32 was below what a
// full 100-row providers payload actually cites (42), which rejected the whole
// response — a bound must be a defence against a hostile payload, never a cap on
// how well-sourced an honest one is allowed to be.
const MAX_PROVENANCE_ROWS = MAX_COLLECTION_ROWS;
const MAX_OBJECT_KEYS = 64;
const MAX_NESTED_ITEMS = 256;
const MAX_NESTED_DEPTH = 10;
const MAX_PUBLIC_JSON_BYTES = 65_536;

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
// Data rows grow. A publisher adding a field is additive news, not a contract
// break, so rejecting the whole payload over one unknown key throws away every
// valid row with it — which is how 100 provider rows became "unavailable".
// openRecord tolerates unknown keys and PROJECTS to the known ones, so nothing
// unvalidated can reach the render layer, and the forbidden-key list is still
// enforced on what it drops. Response envelopes and their metadata blocks stay
// on strictRecord: an unexpected key there is a real contract change.
const openRecord = (value, keys, name) => {
  if (!isRecord(value)) fail("invalid_contract", `${name} must be an object`);
  for (const key of keys) if (!Object.hasOwn(value, key)) fail("missing_field", `${name}.${key} is required`);
  const allowed = new Set(keys);
  const projection = {};
  for (const key of Object.keys(value)) {
    if (allowed.has(key)) { projection[key] = value[key]; continue; }
    if (FORBIDDEN_PUBLIC_KEYS.has(key.replace(/[^A-Za-z0-9]/g, "").toLowerCase())) fail("invalid_contract", `${name}.${key} is a forbidden public field`);
  }
  return projection;
};
const string = (value, name, maximum = MAX_TEXT_LENGTH) => { if (typeof value !== "string") fail("invalid_contract", `${name} must be a string`); if (value.length > maximum) fail("invalid_contract", `${name} exceeds the bounded length ${maximum}`); return value; };
const nonEmptyString = (value, name, maximum = MAX_TEXT_LENGTH) => { string(value, name, maximum); if (value.length === 0) fail("invalid_contract", `${name} must not be empty`); return value; };
const nullableString = (value, name, maximum = MAX_TEXT_LENGTH) => value === null ? null : string(value, name, maximum);
const boolean = (value, name) => { if (typeof value !== "boolean") fail("invalid_contract", `${name} must be a boolean`); return value; };
const uuid = (value, name) => { if (typeof value !== "string" || !UUID.test(value)) fail("invalid_contract", `${name} must be a UUID`); return value; };
const date = (value, name) => {
  if (typeof value !== "string" || !ISO_DATE.test(value)) fail("invalid_contract", `${name} must be an ISO date`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail("invalid_contract", `${name} must be a real ISO calendar date`);
  return value;
};
const dateTime = (value, name) => {
  const match = typeof value === "string" && value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/);
  if (!match) fail("invalid_contract", `${name} must be an ISO datetime with an offset`);
  date(match[1], `${name} date`);
  const [, , hour, minute, second, , offsetHour, offsetMinute] = match;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || (offsetHour !== undefined && (Number(offsetHour) > 23 || Number(offsetMinute) > 59)) || !Number.isFinite(Date.parse(value))) fail("invalid_contract", `${name} must be a real ISO datetime with an offset`);
  return value;
};
const integerString = (value, name) => { if (typeof value !== "string" || !INTEGER.test(value)) fail("invalid_contract", `${name} must be a canonical unsigned integer string`); return value; };
const repositoryId = (value, name) => { if (typeof value !== "string" || !POSITIVE_INTEGER.test(value) || BigInt(value) > 9223372036854775807n) fail("invalid_contract", `${name} must be a canonical positive repositoryId`); return value; };
const signedIntegerString = (value, name) => { if (typeof value !== "string" || !SIGNED_INTEGER.test(value)) fail("invalid_contract", `${name} must be a canonical signed integer string`); return value; };
const decimalString = (value, name) => { if (typeof value !== "string" || !DECIMAL.test(value)) fail("invalid_contract", `${name} must be a canonical unsigned decimal string`); return value; };
const signedDecimalString = (value, name) => { if (typeof value !== "string" || !SIGNED_DECIMAL.test(value)) fail("invalid_contract", `${name} must be a canonical exact decimal string`); return value; };
const validateBoundedPublicJson = (value, name, depth = 0, ancestors = new WeakSet()) => {
  if (depth > MAX_NESTED_DEPTH) fail("invalid_contract", `${name} exceeds the bounded public JSON depth`);
  if (typeof value === "string") { string(value, name); return; }
  if (value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return;
  if (!Array.isArray(value) && !isRecord(value)) fail("invalid_contract", `${name} contains a non-JSON value`);
  if (ancestors.has(value)) fail("invalid_contract", `${name} contains a cycle`);
  ancestors.add(value);
  if (Array.isArray(value)) {
    if (value.length > MAX_NESTED_ITEMS) fail("invalid_contract", `${name} array exceeds the bounded length ${MAX_NESTED_ITEMS}`);
    value.forEach((item, index) => validateBoundedPublicJson(item, `${name}[${index}]`, depth + 1, ancestors));
  } else {
    const entries = Object.entries(value);
    if (entries.length > MAX_NESTED_ITEMS) fail("invalid_contract", `${name} object exceeds the bounded size ${MAX_NESTED_ITEMS}`);
    for (const [key, child] of entries) {
      string(key, `${name} key`, 256);
      const normalized = key.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
      if (FORBIDDEN_PUBLIC_KEYS.has(normalized)) fail("invalid_contract", `${name}.${key} is a forbidden public field`);
      validateBoundedPublicJson(child, `${name}.${key}`, depth + 1, ancestors);
    }
  }
  ancestors.delete(value);
};
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
  if (!POPULATION.has(row.populationCompleteness) || !Array.isArray(row.missingFields) || row.missingFields.length > MAX_COLLECTION_ROWS) fail("invalid_contract", "completeness is invalid or unbounded");
  row.missingFields.forEach((item, index) => string(item, `completeness.missingFields[${index}]`));
  return Object.freeze({ ...row, missingFields: Object.freeze(row.missingFields.slice()) });
};

const validateProvenance = (raw) => {
  if (!Array.isArray(raw) || raw.length > MAX_PROVENANCE_ROWS) fail("invalid_contract", "provenance must be a bounded array");
  return Object.freeze(raw.map((item, index) => {
    const row = strictRecord(item, ["sourceId", "sourceTier", "runId", "fetchedAt", "sourceAsOf", "transformVersion", "citation"], `provenance[${index}]`);
    nonEmptyString(row.sourceId, "provenance.sourceId");
    if (!SOURCE_TIERS.has(row.sourceTier)) fail("invalid_contract", "provenance source tier is invalid");
    uuid(row.runId, "provenance.runId"); dateTime(row.fetchedAt, "provenance.fetchedAt");
    if (row.sourceAsOf !== null) dateTime(row.sourceAsOf, "provenance.sourceAsOf");
    nonEmptyString(row.transformVersion, "provenance.transformVersion"); nullableString(row.citation, "provenance.citation");
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
  const row = openRecord(raw, MODEL_KEYS, name);
  string(row.id, `${name}.id`); string(row.canonicalSlug, `${name}.canonicalSlug`); string(row.name, `${name}.name`); nullableString(row.description, `${name}.description`, 16_384);
  if (row.contentTrust !== "untrusted-source") fail("invalid_contract", `${name}.contentTrust is invalid`);
  integerString(row.createdUnix, `${name}.createdUnix`); if (row.contextLength !== null) integerString(row.contextLength, `${name}.contextLength`);
  if (!isRecord(row.architecture) || Object.keys(row.architecture).length > MAX_OBJECT_KEYS || !isRecord(row.pricing) || Object.keys(row.pricing).length > MAX_OBJECT_KEYS || !Array.isArray(row.supportedParameters) || row.supportedParameters.length > 128 || row.supportedParameters.some((item) => typeof item !== "string" || item.length > 256)) fail("invalid_contract", `${name} capability fields are not bounded`);
  validateBoundedPublicJson(row.architecture, `${name}.architecture`); let architectureBytes; try { architectureBytes = new TextEncoder().encode(JSON.stringify(row.architecture)).length; } catch { fail("invalid_contract", `${name}.architecture is not public JSON`); } if (architectureBytes > MAX_PUBLIC_JSON_BYTES) fail("invalid_contract", `${name}.architecture exceeds the public JSON byte budget`);
  for (const [key, value] of Object.entries(row.pricing)) { string(key, `${name}.pricing key`, 256); if (value !== null) decimalString(value, `${name}.pricing.${key}`); }
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
    const row = openRecord(raw, ["appId", "appName", "rank", "totalTokens", "totalRequests"], name);
    integerString(row.appId, `${name}.appId`); string(row.appName, `${name}.appName`);
    if (!Number.isInteger(row.rank) || row.rank < 1) fail("invalid_contract", `${name}.rank is invalid`);
    integerString(row.totalTokens, `${name}.totalTokens`); integerString(row.totalRequests, `${name}.totalRequests`);
    return Object.freeze({ ...row });
  },
  deprecations(raw, name) {
    const row = openRecord(raw, ["modelId", "state", "expirationDate", "firstObservedAt", "lastObservedAt", "evidenceRunId"], name);
    string(row.modelId, `${name}.modelId`); if (!LIFECYCLE.has(row.state)) fail("invalid_contract", `${name}.state is invalid`);
    if (row.expirationDate !== null) date(row.expirationDate, `${name}.expirationDate`);
    dateTime(row.firstObservedAt, `${name}.firstObservedAt`); dateTime(row.lastObservedAt, `${name}.lastObservedAt`); uuid(row.evidenceRunId, `${name}.evidenceRunId`);
    return Object.freeze({ ...row });
  },
  tasks(raw, name) {
    const row = openRecord(raw, ["tag", "displayName", "macroCategory", "usageShare", "tokenShare", "categoryUsageShare", "categoryTokenShare", "sampled", "absoluteVolumeAvailable", "otherExcluded", "topModelsComplete", "models"], name);
    string(row.tag, `${name}.tag`); string(row.displayName, `${name}.displayName`); string(row.macroCategory, `${name}.macroCategory`);
    for (const key of ["usageShare", "tokenShare", "categoryUsageShare", "categoryTokenShare"]) decimalString(row[key], `${name}.${key}`);
    if (row.sampled !== true || row.absoluteVolumeAvailable !== false || row.otherExcluded !== true || row.topModelsComplete !== false || !Array.isArray(row.models) || row.models.length > 100) fail("invalid_contract", `${name} sampled caveats are invalid`);
    const models = row.models.map((model, index) => {
      const item = openRecord(model, ["id", "sourcePosition", "usageShare", "tokenShare"], `${name}.models[${index}]`);
      string(item.id, "task model id"); if (!Number.isInteger(item.sourcePosition) || item.sourcePosition < 1) fail("invalid_contract", "task model position is invalid"); decimalString(item.usageShare, "task model usageShare"); decimalString(item.tokenShare, "task model tokenShare");
      return Object.freeze({ ...item });
    });
    return Object.freeze({ ...row, models: Object.freeze(models) });
  },
  benchmarks(raw, name) {
    const artificial = raw?.source === "artificial-analysis";
    const keys = artificial ? ["source", "modelPermaslug", "displayName", "matchStatus", "pricing", "citation", "sourceUrl", "intelligenceIndex", "codingIndex", "agenticIndex"] : ["source", "modelPermaslug", "displayName", "matchStatus", "pricing", "citation", "sourceUrl", "arena", "category", "elo", "winRate", "avgGenerationTimeMs", "tournamentStats"];
    const row = openRecord(raw, keys, name);
    if (!['artificial-analysis', 'design-arena'].includes(row.source) || !['matched', 'unmatched'].includes(row.matchStatus)) fail("invalid_contract", `${name} benchmark discriminator is invalid`);
    string(row.modelPermaslug, `${name}.modelPermaslug`); string(row.displayName, `${name}.displayName`); string(row.citation, `${name}.citation`);
    if (row.sourceUrl !== null && !safePublicUrl(row.sourceUrl)) fail("invalid_contract", `${name}.sourceUrl is not public`);
    const pricing = openRecord(row.pricing, ["prompt", "completion"], `${name}.pricing`); if (pricing.prompt !== null) decimalString(pricing.prompt, `${name}.pricing.prompt`); if (pricing.completion !== null) decimalString(pricing.completion, `${name}.pricing.completion`);
    if (artificial) {
      for (const key of ["intelligenceIndex", "codingIndex", "agenticIndex"]) if (row[key] !== null && typeof row[key] !== "number") fail("invalid_contract", `${name}.${key} is invalid`);
      return Object.freeze({ ...row, pricing: Object.freeze({ ...pricing }) });
    }
    string(row.arena, `${name}.arena`); string(row.category, `${name}.category`);
    if (typeof row.elo !== "number" || typeof row.winRate !== "number" || row.winRate < 0 || row.winRate > 100 || (row.avgGenerationTimeMs !== null && (typeof row.avgGenerationTimeMs !== "number" || row.avgGenerationTimeMs < 0))) fail("invalid_contract", `${name} metrics are invalid`);
    const stats = openRecord(row.tournamentStats, ["firstPlace", "secondPlace", "thirdPlace", "fourthPlace", "total"], `${name}.tournamentStats`); for (const value of Object.values(stats)) if (value !== null && !Number.isInteger(value)) fail("invalid_contract", `${name} tournament stats are invalid`);
    return Object.freeze({ ...row, pricing: Object.freeze({ ...pricing }), tournamentStats: Object.freeze({ ...stats }) });
  },
  providers(raw, name) {
    const row = openRecord(raw, ["modelId", "provider", "endpoint", "quantization", "contextLength", "promptPrice", "completionPrice", "uptime", "latency", "throughput", "status", "sourceUrl", "fetchedAt"], name);
    string(row.modelId, `${name}.modelId`); string(row.provider, `${name}.provider`); string(row.endpoint, `${name}.endpoint`); nullableString(row.quantization, `${name}.quantization`);
    if (row.contextLength !== null) integerString(row.contextLength, `${name}.contextLength`);
    for (const key of ["promptPrice", "completionPrice", "uptime", "latency", "throughput"]) if (row[key] !== null) decimalString(row[key], `${name}.${key}`);
    nullableString(row.status, `${name}.status`); if (!safePublicUrl(row.sourceUrl)) fail("invalid_contract", `${name}.sourceUrl is not public`); dateTime(row.fetchedAt, `${name}.fetchedAt`);
    return Object.freeze({ ...row });
  },
  freeFrontiers(raw, name) {
    const row = openRecord(raw, ["ruleVersion", "dimensions", "members", "excluded"], name);
    if (row.ruleVersion !== "openrouter-free-pareto-v1") fail("invalid_contract", `${name}.ruleVersion is invalid`);
    const dimensions = strictRecord(row.dimensions, ["x", "y", "xDirection", "yDirection"], `${name}.dimensions`);
    if (!["benchmarkQuality", "contextLength"].includes(dimensions.x) || !["medianThroughput", "weeklyPopularityRank"].includes(dimensions.y) || !["min", "max"].includes(dimensions.xDirection) || !["min", "max"].includes(dimensions.yDirection)) fail("invalid_contract", `${name}.dimensions are invalid`);
    if (!Array.isArray(row.members) || row.members.length > MAX_COLLECTION_ROWS || !Array.isArray(row.excluded) || row.excluded.length > MAX_COLLECTION_ROWS) fail("invalid_contract", `${name} membership is not bounded`);
    const members = row.members.map((item, index) => { const member = openRecord(item, ["modelId", "x", "y"], `${name}.members[${index}]`); string(member.modelId, "frontier.modelId"); decimalString(member.x, "frontier.x"); decimalString(member.y, "frontier.y"); return Object.freeze({ ...member }); });
    const excluded = row.excluded.map((item, index) => { const value = openRecord(item, ["modelId", "reason"], `${name}.excluded[${index}]`); string(value.modelId, "frontier excluded modelId"); string(value.reason, "frontier excluded reason"); return Object.freeze({ ...value }); });
    return Object.freeze({ ...row, dimensions: Object.freeze({ ...dimensions }), members: Object.freeze(members), excluded: Object.freeze(excluded) });
  }
};

const validateAppRequestSlice = (raw) => {
  const row = strictRecord(raw, ["period", "sort", "category", "subcategory", "limit"], "apps.requestSlice");
  if (row.period !== "30d" || !["popular", "trending"].includes(row.sort)) fail("invalid_contract", "apps.requestSlice period or sort is invalid");
  if (row.category !== null && !OPENROUTER_APP_CATEGORIES.has(row.category)) fail("invalid_contract", "apps.requestSlice category is invalid");
  if (row.subcategory !== null && !OPENROUTER_APP_SUBCATEGORIES.has(row.subcategory)) fail("invalid_contract", "apps.requestSlice subcategory is invalid");
  if (row.category !== null && row.subcategory !== null) fail("invalid_contract", "apps.requestSlice cannot combine category and subcategory");
  if (!Number.isInteger(row.limit) || row.limit < 1 || row.limit > 100) fail("invalid_contract", "apps.requestSlice limit is invalid");
  return Object.freeze({ ...row });
};

export function validateOpenRouterCollection(raw, kind, expectedMajor = "2") {
  const free = kind === "free";
  const apps = kind === "apps";
  const keys = ["schemaVersion", "data", "cursor", "window", "completeness", "stale", "rank", "provenance", ...(free ? ["router", "concreteFreeCount"] : []), ...(apps ? ["requestSlice"] : [])];
  const row = strictRecord(raw, keys, `${kind} response`); schema(row.schemaVersion, expectedMajor);
  if (!validators[kind] || !Array.isArray(row.data) || row.data.length > MAX_COLLECTION_ROWS || (row.cursor !== null && typeof row.cursor !== "string") || typeof row.stale !== "boolean") fail("invalid_contract", `${kind} response data must contain at most ${MAX_COLLECTION_ROWS} rows`);
  if (row.cursor !== null) string(row.cursor, `${kind}.cursor`);
  const result = { schemaVersion: row.schemaVersion, data: Object.freeze(row.data.map((item, index) => validators[kind](item, `${kind}.data[${index}]`))), cursor: row.cursor, window: validateWindow(row.window), completeness: validateCompleteness(row.completeness), stale: row.stale, rank: validateRank(row.rank), provenance: validateProvenance(row.provenance) };
  if (free) { result.router = row.router === null ? null : validateModel(row.router, "free.router"); result.concreteFreeCount = integerString(row.concreteFreeCount, "free.concreteFreeCount"); }
  if (apps) result.requestSlice = validateAppRequestSlice(row.requestSlice);
  return Object.freeze(result);
}

export const validateProviders = (raw, expectedMajor = "2") => validateOpenRouterCollection(raw, "providers", expectedMajor);
export const validateFreeFrontiers = (raw, expectedMajor = "2") => validateOpenRouterCollection(raw, "freeFrontiers", expectedMajor);

const validateObservedPeriod = (raw, name) => {
  const row = strictRecord(raw, ["start", "end", "unit", "inclusive"], name); date(row.start, `${name}.start`); date(row.end, `${name}.end`);
  if (row.unit !== "day" || row.inclusive !== true) fail("invalid_contract", `${name} must be one inclusive day`);
  return Object.freeze({ ...row });
};
const validateAppModelCompleteness = (raw, name) => {
  const row = strictRecord(raw, ["acquisitionComplete", "populationCompleteness", "missingFields"], name);
  boolean(row.acquisitionComplete, `${name}.acquisitionComplete`);
  if (row.populationCompleteness !== "partial_or_unknown" || !Array.isArray(row.missingFields) || row.missingFields.length > MAX_COLLECTION_ROWS) fail("invalid_contract", `${name} is invalid or unbounded`);
  row.missingFields.forEach((value, index) => string(value, `${name}.missingFields[${index}]`));
  return Object.freeze({ ...row, missingFields: Object.freeze(row.missingFields.slice()) });
};
const validateAppModelCell = (raw, name) => {
  if (raw?.state === "observed") {
    const row = openRecord(raw, ["state", "appId", "modelId", "totalTokens", "rankWithinPeriod", "period", "metricSemantics", "evidenceUrl"], name);
    integerString(row.appId, `${name}.appId`); nonEmptyString(row.modelId, `${name}.modelId`); integerString(row.totalTokens, `${name}.totalTokens`);
    if (!Number.isInteger(row.rankWithinPeriod) || row.rankWithinPeriod < 1 || row.metricSemantics !== "observed_daily_total_tokens" || !safePublicUrl(row.evidenceUrl)) fail("invalid_contract", `${name} observed evidence is invalid`);
    return Object.freeze({ ...row, period: validateObservedPeriod(row.period, `${name}.period`) });
  }
  const row = openRecord(raw, ["state", "appId", "modelId", "reason"], name);
  if (row.state !== "unknown" || !["not_observed", "unmapped_alias", "not_published"].includes(row.reason)) fail("invalid_contract", `${name} unknown state is invalid`);
  integerString(row.appId, `${name}.appId`); nonEmptyString(row.modelId, `${name}.modelId`); return Object.freeze({ ...row });
};

export function validateAppModelMatrix(raw, expectedMajor = "2") {
  if (raw?.status === "available") {
    const row = strictRecord(raw, ["schemaVersion", "status", "watermark", "lastSuccessAt", "stale", "staleAfterSeconds", "completeness", "resolvedPeriod", "apps", "models", "appIds", "modelIds", "cells", "missingAliases", "unmappedModels", "coverage", "provenance"], "app-model matrix"); schema(row.schemaVersion, expectedMajor); nonEmptyString(row.watermark, "matrix.watermark"); dateTime(row.lastSuccessAt, "matrix.lastSuccessAt"); boolean(row.stale, "matrix.stale"); if (row.staleAfterSeconds !== 172800) fail("invalid_contract", "matrix.staleAfterSeconds is invalid");
    const completeness = validateAppModelCompleteness(row.completeness, "matrix.completeness");
    if (!Array.isArray(row.apps) || row.apps.length > 10 || !Array.isArray(row.models) || row.models.length > 10 || !Array.isArray(row.appIds) || row.appIds.length > 10 || !Array.isArray(row.modelIds) || row.modelIds.length > 10 || !Array.isArray(row.cells) || row.cells.length > 100 || !Array.isArray(row.missingAliases) || row.missingAliases.length > 10 || !Array.isArray(row.unmappedModels) || row.unmappedModels.length > 100) fail("invalid_contract", "matrix axes/cells are invalid or exceed their bounds");
    const apps = row.apps.map((item, index) => { const app = openRecord(item, ["appId", "appName"], `matrix.apps[${index}]`); integerString(app.appId, `matrix.apps[${index}].appId`); nonEmptyString(app.appName, `matrix.apps[${index}].appName`); return Object.freeze({ ...app }); });
    const models = row.models.map((item, index) => { const model = openRecord(item, ["modelId", "modelName"], `matrix.models[${index}]`); nonEmptyString(model.modelId, `matrix.models[${index}].modelId`); nonEmptyString(model.modelName, `matrix.models[${index}].modelName`); return Object.freeze({ ...model }); });
    const appIds = row.appIds.map((value) => integerString(value, "matrix.appId"));
    const modelIds = row.modelIds.map((value) => string(value, "matrix.modelId"));
    if (new Set(appIds).size !== appIds.length || new Set(modelIds).size !== modelIds.length || new Set(apps.map((item) => item.appId)).size !== apps.length || new Set(models.map((item) => item.modelId)).size !== models.length) fail("invalid_contract", "matrix axes must contain unique IDs");
    if (apps.length !== appIds.length || models.length !== modelIds.length || apps.some((item, index) => item.appId !== appIds[index]) || models.some((item, index) => item.modelId !== modelIds[index])) fail("invalid_contract", "matrix named axes must match appIds/modelIds in order");
    const resolvedPeriod = validateObservedPeriod(row.resolvedPeriod, "matrix.resolvedPeriod");
    const appSet = new Set(appIds); const modelSet = new Set(modelIds); const pairs = new Set(); let observedCells = 0;
    const cells = row.cells.map((item, index) => {
      const cell = validateAppModelCell(item, `matrix.cells[${index}]`); const pair = `${cell.appId}\0${cell.modelId}`;
      if (!appSet.has(cell.appId) || !modelSet.has(cell.modelId)) fail("invalid_contract", `matrix.cells[${index}] references an ID outside its axis`);
      if (pairs.has(pair)) fail("invalid_contract", `matrix cells must be unique for ${cell.appId}/${cell.modelId}`); pairs.add(pair);
      if (cell.state === "observed") { observedCells += 1; if (cell.period.start !== resolvedPeriod.start || cell.period.end !== resolvedPeriod.end) fail("invalid_contract", `matrix.cells[${index}] period does not match the resolved period`); }
      return cell;
    });
    const possibleCells = appIds.length * modelIds.length;
    if (cells.length !== possibleCells) fail("invalid_contract", "matrix cells must form one complete axis grid");
    const unmappedModels = row.unmappedModels.map((item, index) => { const value = openRecord(item, ["appId", "sourcePermaslug", "totalTokens", "rankWithinPeriod", "reason"], `matrix.unmappedModels[${index}]`); integerString(value.appId, "matrix.unmappedModels.appId"); nonEmptyString(value.sourcePermaslug, "matrix.unmappedModels.sourcePermaslug"); integerString(value.totalTokens, "matrix.unmappedModels.totalTokens"); if (!appSet.has(value.appId) || !Number.isInteger(value.rankWithinPeriod) || value.rankWithinPeriod < 1 || !["ambiguous_model", "unmapped_model"].includes(value.reason)) fail("invalid_contract", `matrix.unmappedModels[${index}] is invalid`); return Object.freeze({ ...value }); });
    const coverage = strictRecord(row.coverage, ["observedCells", "possibleCells", "unmappedObservations", "populationCompleteness"], "matrix.coverage");
    if (!Number.isInteger(coverage.observedCells) || coverage.observedCells !== observedCells || !Number.isInteger(coverage.possibleCells) || coverage.possibleCells !== possibleCells || !Number.isInteger(coverage.unmappedObservations) || coverage.unmappedObservations < 0 || coverage.populationCompleteness !== "partial_or_unknown") fail("invalid_contract", "matrix coverage does not match its cells and axes");
    const missingAliases = row.missingAliases.map((value) => integerString(value, "matrix.missingAlias"));
    if (new Set(missingAliases).size !== missingAliases.length || missingAliases.some((value) => !appSet.has(value))) fail("invalid_contract", "matrix missingAliases must be unique app-axis IDs");
    return Object.freeze({ ...row, completeness, resolvedPeriod, apps: Object.freeze(apps), models: Object.freeze(models), appIds: Object.freeze(appIds), modelIds: Object.freeze(modelIds), cells: Object.freeze(cells), missingAliases: Object.freeze(missingAliases), unmappedModels: Object.freeze(unmappedModels), coverage: Object.freeze({ ...coverage }), provenance: validateProvenance(row.provenance) });
  }
  const row = strictRecord(raw, ["schemaVersion", "status", "reason", "lastSuccessAt", "stale", "staleAfterSeconds", "completeness", "provenance", "appIds", "modelIds", "cells"], "app-model matrix unavailable"); schema(row.schemaVersion, expectedMajor);
  if (row.status !== "unavailable" || !["collection_disabled", "not_published", "no_observed_period", "no_common_period", "period_mismatch"].includes(row.reason) || !Array.isArray(row.appIds) || row.appIds.length > 10 || !Array.isArray(row.modelIds) || row.modelIds.length > 10 || !Array.isArray(row.cells) || row.cells.length !== 0 || typeof row.stale !== "boolean" || row.staleAfterSeconds !== 172800) fail("invalid_contract", "matrix unavailable state is invalid");
  if (row.lastSuccessAt !== null) dateTime(row.lastSuccessAt, "matrix.lastSuccessAt");
  return Object.freeze({ ...row, completeness: validateAppModelCompleteness(row.completeness, "matrix.completeness"), provenance: validateProvenance(row.provenance), appIds: Object.freeze(row.appIds.map((value) => integerString(value, "matrix.appId"))), modelIds: Object.freeze(row.modelIds.map((value) => string(value, "matrix.modelId"))), cells: Object.freeze([]) });
}

export function validateAppModels(raw, expectedMajor = "2") {
  if (raw?.status === "available") {
    const row = strictRecord(raw, ["schemaVersion", "status", "watermark", "lastSuccessAt", "stale", "staleAfterSeconds", "completeness", "appId", "appName", "resolvedPeriod", "data", "cursor", "coverage", "provenance"], "app models"); schema(row.schemaVersion, expectedMajor); nonEmptyString(row.watermark, "appModels.watermark"); dateTime(row.lastSuccessAt, "appModels.lastSuccessAt"); boolean(row.stale, "appModels.stale"); if (row.staleAfterSeconds !== 172800) fail("invalid_contract", "appModels.staleAfterSeconds is invalid"); integerString(row.appId, "appModels.appId"); nonEmptyString(row.appName, "appModels.appName");
    if (!Array.isArray(row.data) || row.data.length > 100 || row.cursor !== null) fail("invalid_contract", "appModels data/cursor is invalid");
    const data = row.data.map((item, index) => { const value = openRecord(item, ["modelId", "sourcePermaslug", "resolvedModelId", "matchMethod", "rank", "rankMethod", "totalTokens", "metricSemantics", "evidenceUrl", "period"], `appModels.data[${index}]`); nonEmptyString(value.modelId, "appModels.modelId"); nonEmptyString(value.sourcePermaslug, "appModels.sourcePermaslug"); if (value.resolvedModelId !== null) nonEmptyString(value.resolvedModelId, "appModels.resolvedModelId"); integerString(value.totalTokens, "appModels.totalTokens"); if (!["source_model_id", "canonical_slug", "ambiguous_model", "unmapped_model"].includes(value.matchMethod) || !Number.isInteger(value.rank) || value.rank < 1 || value.rankMethod !== "locally_calculated" || value.metricSemantics !== "observed_daily_total_tokens" || !safePublicUrl(value.evidenceUrl)) fail("invalid_contract", "appModels row is invalid"); return Object.freeze({ ...value, period: validateObservedPeriod(value.period, "appModels.period") }); });
    const coverage = strictRecord(row.coverage, ["observedModels", "mappedModels", "unmappedModels", "populationCompleteness"], "appModels.coverage"); if (![coverage.observedModels, coverage.mappedModels, coverage.unmappedModels].every((value) => Number.isInteger(value) && value >= 0) || coverage.populationCompleteness !== "partial_or_unknown") fail("invalid_contract", "appModels coverage is invalid");
    return Object.freeze({ ...row, completeness: validateAppModelCompleteness(row.completeness, "appModels.completeness"), resolvedPeriod: validateObservedPeriod(row.resolvedPeriod, "appModels.resolvedPeriod"), data: Object.freeze(data), coverage: Object.freeze({ ...coverage }), provenance: validateProvenance(row.provenance) });
  }
  const row = strictRecord(raw, ["schemaVersion", "status", "reason", "lastSuccessAt", "stale", "staleAfterSeconds", "completeness", "provenance", "appId", "data", "cursor"], "app models unavailable"); schema(row.schemaVersion, expectedMajor);
  if (row.status !== "unavailable" || !["collection_disabled", "unmapped_alias", "not_published", "no_observed_period", "period_mismatch"].includes(row.reason) || !Array.isArray(row.data) || row.data.length !== 0 || row.cursor !== null || typeof row.stale !== "boolean" || row.staleAfterSeconds !== 172800) fail("invalid_contract", "appModels unavailable state is invalid");
  if (row.lastSuccessAt !== null) dateTime(row.lastSuccessAt, "appModels.lastSuccessAt");
  integerString(row.appId, "appModels.appId"); return Object.freeze({ ...row, completeness: validateAppModelCompleteness(row.completeness, "appModels.completeness"), provenance: validateProvenance(row.provenance), data: Object.freeze([]) });
}

const validateHistoryBucket = (raw, name) => {
  const bucket = strictRecord(raw, ["date", "complete", "rows"], name); date(bucket.date, `${name}.date`); boolean(bucket.complete, `${name}.complete`); if (!Array.isArray(bucket.rows) || bucket.rows.length > MAX_COLLECTION_ROWS) fail("invalid_contract", `${name}.rows must be a bounded array of at most ${MAX_COLLECTION_ROWS}`);
  const rows = bucket.rows.map((rawRow, index) => { const row = openRecord(rawRow, ["id", "label", "scope", "rank", "value", "remainder", "stars", "forks"], `${name}.rows[${index}]`); string(row.id, `${name}.id`); string(row.label, `${name}.label`); nullableString(row.scope, `${name}.scope`); if (row.rank !== null && (!Number.isInteger(row.rank) || row.rank < 1)) fail("invalid_contract", `${name}.rank is invalid`); if (row.value !== null) signedDecimalString(row.value, `${name}.value`); if (row.remainder !== null) signedDecimalString(row.remainder, `${name}.remainder`); if (row.stars !== null) integerString(row.stars, `${name}.stars`); if (row.forks !== null) integerString(row.forks, `${name}.forks`); return Object.freeze({ ...row }); });
  return Object.freeze({ ...bucket, rows: Object.freeze(rows) });
};
export function validateHistory(raw, expectedMajor = "2") {
  if (raw?.status === "available") {
    const row = strictRecord(raw, ["schemaVersion", "status", "data", "window", "completeness", "stale", "rank", "provenance"], "history"); schema(row.schemaVersion, expectedMajor); if (row.rank !== null || typeof row.stale !== "boolean") fail("invalid_contract", "history rank/stale is invalid");
    const data = strictRecord(row.data, ["modelUsage", "appRanks", "githubRanks"], "history.data"); const map = (key) => { if (!Array.isArray(data[key]) || data[key].length > 365) fail("invalid_contract", `history.${key} is invalid`); return Object.freeze(data[key].map((bucket, index) => validateHistoryBucket(bucket, `history.${key}[${index}]`))); };
    return Object.freeze({ ...row, data: Object.freeze({ modelUsage: map("modelUsage"), appRanks: map("appRanks"), githubRanks: map("githubRanks") }), window: validateWindow(row.window), completeness: validateCompleteness(row.completeness), provenance: validateProvenance(row.provenance) });
  }
  const row = strictRecord(raw, ["schemaVersion", "status", "reason", "lastSuccessAt"], "history unavailable"); schema(row.schemaVersion, expectedMajor);
  if (row.status !== "unavailable" || row.reason !== "insufficient_history") fail("invalid_contract", "history unavailable state is invalid"); if (row.lastSuccessAt !== null) dateTime(row.lastSuccessAt, "history.lastSuccessAt"); return Object.freeze({ ...row });
}

const SOURCE_KEYS = ["sourceId", "sourceTier", "cadenceSeconds", "staleAfterSeconds", "publishedRunId", "publishedAt", "nextScheduledAt", "stale", "transformVersion", "citationUrl", "lastAttemptRunId", "lastAttemptStatus", "lastAttemptStartedAt", "lastAttemptFinishedAt", "lastAttemptErrorCode", "lastAttemptAcquisitionComplete", "lastAttemptPopulationCompleteness"];
export function validateManifest(raw, expectedMajor = "2") {
  const row = strictRecord(raw, ["schemaVersion", "publishedAt", "routes", "sources", "provenance", "window"], "manifest"); schema(row.schemaVersion, expectedMajor);
  if (!Array.isArray(row.routes) || row.routes.length > MAX_COLLECTION_ROWS || !Array.isArray(row.sources) || row.sources.length > MAX_COLLECTION_ROWS) fail("invalid_manifest", `manifest routes/sources must be bounded to ${MAX_COLLECTION_ROWS}`);
  const sources = row.sources.map((item, index) => { const source = openRecord(item, SOURCE_KEYS, `manifest.sources[${index}]`); string(source.sourceId, "sourceId"); if (!SOURCE_TIERS.has(source.sourceTier)) fail("invalid_manifest", `manifest source tier is invalid: ${source.sourceId} declares ${JSON.stringify(source.sourceTier)}`); if (typeof source.stale !== "boolean") fail("invalid_manifest", `manifest source state is invalid: ${source.sourceId} declares stale ${JSON.stringify(source.stale)}`); if (!Number.isInteger(source.cadenceSeconds) || source.cadenceSeconds < 1 || !Number.isInteger(source.staleAfterSeconds) || source.staleAfterSeconds < 1) fail("invalid_manifest", "manifest source cadence is invalid"); if (source.publishedRunId !== null) uuid(source.publishedRunId, "publishedRunId"); if (source.publishedAt !== null) dateTime(source.publishedAt, "publishedAt"); if (source.nextScheduledAt !== null) dateTime(source.nextScheduledAt, "nextScheduledAt"); string(source.transformVersion, "transformVersion"); if (source.lastAttemptRunId !== null) uuid(source.lastAttemptRunId, "lastAttemptRunId"); if (source.lastAttemptStatus !== null && !["running", "published", "failed"].includes(source.lastAttemptStatus)) fail("invalid_manifest", "lastAttemptStatus is invalid"); if (source.lastAttemptStartedAt !== null) dateTime(source.lastAttemptStartedAt, "lastAttemptStartedAt"); if (source.lastAttemptFinishedAt !== null) dateTime(source.lastAttemptFinishedAt, "lastAttemptFinishedAt"); if (source.lastAttemptErrorCode !== null) string(source.lastAttemptErrorCode, "lastAttemptErrorCode"); if (source.lastAttemptAcquisitionComplete !== null) boolean(source.lastAttemptAcquisitionComplete, "lastAttemptAcquisitionComplete"); if (source.lastAttemptPopulationCompleteness !== null && !POPULATION.has(source.lastAttemptPopulationCompleteness)) fail("invalid_manifest", "lastAttemptPopulationCompleteness is invalid"); if (source.citationUrl !== null && !safePublicUrl(source.citationUrl)) fail("invalid_manifest", "citationUrl is not public"); return Object.freeze({ ...source }); });
  if (new Set(sources.map((item) => item.sourceId)).size !== sources.length) fail("invalid_manifest", "manifest source IDs must be unique");
  if (row.publishedAt !== null) dateTime(row.publishedAt, "manifest.publishedAt"); if (row.routes.some((route, index) => { try { string(route, `manifest.routes[${index}]`); return !route.startsWith("/api/public/v2/"); } catch { return true; } })) fail("invalid_manifest", "manifest route is invalid");
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
  const row = strictRecord(raw, ["schemaVersion", "watermark", "coverage", "ranking", "data", "metricEvidence", "page", "provenance"], "github ranking"); schema(row.schemaVersion, expectedMajor); string(row.watermark, "watermark");
  const coverage = strictRecord(row.coverage, ["resolvedAsOf", "acquisitionComplete", "populationCompleteness", "missingFields", "stale", "lastSuccessAt", "staleAfterSeconds"], "coverage"); date(coverage.resolvedAsOf, "coverage.resolvedAsOf"); boolean(coverage.acquisitionComplete, "coverage.acquisitionComplete"); boolean(coverage.stale, "coverage.stale"); dateTime(coverage.lastSuccessAt, "coverage.lastSuccessAt"); if (!POPULATION.has(coverage.populationCompleteness) || !Array.isArray(coverage.missingFields) || coverage.missingFields.length > MAX_COLLECTION_ROWS || !Number.isInteger(coverage.staleAfterSeconds) || coverage.staleAfterSeconds < 1) fail("invalid_contract", "GitHub coverage is invalid"); coverage.missingFields.forEach((value, index) => string(value, `coverage.missingFields[${index}]`));
  const ranking = strictRecord(row.ranking, ["metric", "rankMethod", "definition", "unit", "direction", "ruleVersion", "taxonomyVersion", "category", "entityLevel", "eligiblePopulation", "coverageExcluded", "windowDays", "baselineDate"], "ranking");
  if (!GITHUB_METRICS.has(ranking.metric) || !GITHUB_CATEGORIES.has(ranking.category) || ranking.rankMethod !== "locally_calculated" || ranking.direction !== "higher_is_better" || !["project-family", "repository"].includes(ranking.entityLevel) || !Number.isInteger(ranking.eligiblePopulation) || ranking.eligiblePopulation < 0 || !Number.isInteger(ranking.coverageExcluded) || ranking.coverageExcluded < 0 || (ranking.windowDays !== null && ![7,30,90].includes(ranking.windowDays))) fail("invalid_contract", "GitHub ranking metadata is invalid");
  for (const key of ["definition", "unit", "ruleVersion", "taxonomyVersion"]) string(ranking[key], `ranking.${key}`); if (ranking.baselineDate !== null) date(ranking.baselineDate, "ranking.baselineDate");
  if (!Array.isArray(row.data) || row.data.length > 100) fail("invalid_contract", "GitHub data must be a bounded array");
  const data = row.data.map((item, index) => { const value = openRecord(item, ["entityId", "familyId", "repositoryId", "memberRepositoryIds", "fullName", "stars", "forks", "rank", "score", "maintenanceEvidence"], `github.data[${index}]`); nonEmptyString(value.entityId, "entityId"); if (value.familyId !== null) nonEmptyString(value.familyId, "familyId"); repositoryId(value.repositoryId, "repositoryId"); if (!Array.isArray(value.memberRepositoryIds) || value.memberRepositoryIds.length < 1 || value.memberRepositoryIds.length > 100) fail("invalid_contract", "memberRepositoryIds is invalid or unbounded"); const memberRepositoryIds = value.memberRepositoryIds.map((id) => repositoryId(id, "memberRepositoryId")); string(value.fullName, "fullName"); integerString(value.stars, "stars"); integerString(value.forks, "forks"); if (!Number.isInteger(value.rank) || value.rank < 1 || (value.score !== null && typeof value.score !== "string")) fail("invalid_contract", "GitHub ranking row is invalid"); if (value.score !== null) string(value.score, "score"); const maintenanceEvidence = value.maintenanceEvidence === null ? null : validateReleaseCadence(value.maintenanceEvidence, "maintenanceEvidence"); return Object.freeze({ ...value, memberRepositoryIds: Object.freeze(memberRepositoryIds), maintenanceEvidence }); });
  if (!Array.isArray(row.metricEvidence) || row.metricEvidence.length > 100) fail("invalid_contract", "GitHub metricEvidence must be a bounded array");
  const metricEvidence = row.metricEvidence.map((item, index) => {
    const value = openRecord(item, ["repositoryId", "baselineStars", "starDelta", "forkDelta", "relativeGrowth", "defaultBranchCommittedAt", "latestStableReleaseAt", "stableReleaseCount90d"], `github.metricEvidence[${index}]`);
    repositoryId(value.repositoryId, "metricEvidence.repositoryId"); if (value.baselineStars !== null) integerString(value.baselineStars, "metricEvidence.baselineStars"); if (value.starDelta !== null) signedIntegerString(value.starDelta, "metricEvidence.starDelta"); if (value.forkDelta !== null) signedIntegerString(value.forkDelta, "metricEvidence.forkDelta");
    if (value.relativeGrowth !== null && (typeof value.relativeGrowth !== "string" || !/^-?(?:0|[1-9]\d*)\.\d{6}$/.test(value.relativeGrowth))) fail("invalid_contract", "metricEvidence.relativeGrowth must be canonical with six decimal places");
    if (value.defaultBranchCommittedAt !== null) dateTime(value.defaultBranchCommittedAt, "metricEvidence.defaultBranchCommittedAt"); if (value.latestStableReleaseAt !== null) dateTime(value.latestStableReleaseAt, "metricEvidence.latestStableReleaseAt"); if (value.stableReleaseCount90d !== null && (!Number.isInteger(value.stableReleaseCount90d) || value.stableReleaseCount90d < 0)) fail("invalid_contract", "metricEvidence.stableReleaseCount90d is invalid"); return Object.freeze({ ...value });
  });
  const page = strictRecord(row.page, ["limit", "nextCursor"], "page"); if (!Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100 || (page.nextCursor !== null && typeof page.nextCursor !== "string")) fail("invalid_contract", "GitHub page is invalid"); if (page.nextCursor !== null) string(page.nextCursor, "page.nextCursor", 2048);
  if (!Array.isArray(row.provenance) || row.provenance.length > MAX_PROVENANCE_ROWS) fail("invalid_contract", "GitHub provenance is not bounded"); const provenance = row.provenance.map((item, index) => { const value = strictRecord(item, ["id", "sourceUrl", "fetchedAt", "payloadSha256"], `github.provenance[${index}]`); string(value.id, "provenance.id"); if (!safePublicUrl(value.sourceUrl)) fail("invalid_contract", "GitHub sourceUrl is not public"); dateTime(value.fetchedAt, "provenance.fetchedAt"); if (typeof value.payloadSha256 !== "string" || !SHA256.test(value.payloadSha256)) fail("invalid_contract", "GitHub payloadSha256 is invalid"); return Object.freeze({ ...value }); });
  return Object.freeze({ schemaVersion: row.schemaVersion, watermark: row.watermark, coverage: Object.freeze({ ...coverage }), ranking: Object.freeze({ ...ranking }), data: Object.freeze(data), metricEvidence: Object.freeze(metricEvidence), page: Object.freeze({ ...page }), provenance: Object.freeze(provenance) });
}

const validateReleaseCadence = (raw, name) => {
  const row = strictRecord(raw, ["latestStableReleaseAt", "stableReleaseCount90d", "medianStableReleaseIntervalDays365d", "coverageStart", "coverageEnd", "coverageComplete"], name);
  if (row.latestStableReleaseAt !== null) dateTime(row.latestStableReleaseAt, `${name}.latestStableReleaseAt`);
  if (row.stableReleaseCount90d !== null) integerString(row.stableReleaseCount90d, `${name}.stableReleaseCount90d`);
  if (row.medianStableReleaseIntervalDays365d !== null) signedDecimalString(row.medianStableReleaseIntervalDays365d, `${name}.medianStableReleaseIntervalDays365d`);
  if (row.coverageStart !== null) date(row.coverageStart, `${name}.coverageStart`);
  if (row.coverageEnd !== null) date(row.coverageEnd, `${name}.coverageEnd`);
  boolean(row.coverageComplete, `${name}.coverageComplete`);
  return Object.freeze({ ...row });
};

export function validateGitHubEnrichment(raw, expectedMajor = "2") {
  const row = strictRecord(raw, ["schemaVersion", "repositoryId", "requestRange", "releaseCadence", "starBuckets", "provenance"], "github enrichment"); schema(row.schemaVersion, expectedMajor); repositoryId(row.repositoryId, "github enrichment.repositoryId");
  const requestRange = strictRecord(row.requestRange, ["from", "to"], "github enrichment.requestRange"); date(requestRange.from, "github enrichment.requestRange.from"); date(requestRange.to, "github enrichment.requestRange.to"); if (requestRange.from > requestRange.to) fail("invalid_contract", "github enrichment.requestRange is reversed");
  if (!Array.isArray(row.starBuckets) || row.starBuckets.length > 366) fail("invalid_contract", "GitHub starBuckets must contain at most 366 rows");
  const starBuckets = row.starBuckets.map((item, index) => { const value = strictRecord(item, ["start", "end", "count", "populationCompleteness"], `github enrichment.starBuckets[${index}]`); date(value.start, "starBucket.start"); date(value.end, "starBucket.end"); integerString(value.count, "starBucket.count"); if (!["full", "partial_or_unknown"].includes(value.populationCompleteness)) fail("invalid_contract", "starBucket.populationCompleteness is invalid"); return Object.freeze({ ...value }); });
  for (const [index, bucket] of starBuckets.entries()) { if (bucket.start > bucket.end) fail("invalid_contract", `github enrichment.starBuckets[${index}] start is after end`); if (bucket.start < requestRange.from || bucket.end > requestRange.to) fail("invalid_contract", `github enrichment.starBuckets[${index}] is outside requestRange`); }
  if (!Array.isArray(row.provenance) || row.provenance.length > MAX_PROVENANCE_ROWS) fail("invalid_contract", "GitHub enrichment provenance is not bounded");
  const provenance = row.provenance.map((item, index) => { const value = strictRecord(item, ["id", "sourceUrl", "fetchedAt"], `github enrichment.provenance[${index}]`); nonEmptyString(value.id, "enrichment.provenance.id"); if (!safePublicUrl(value.sourceUrl)) fail("invalid_contract", "GitHub enrichment sourceUrl is not public"); dateTime(value.fetchedAt, "enrichment.provenance.fetchedAt"); return Object.freeze({ ...value }); });
  return Object.freeze({ ...row, requestRange: Object.freeze({ ...requestRange }), releaseCadence: validateReleaseCadence(row.releaseCadence, "github enrichment.releaseCadence"), starBuckets: Object.freeze(starBuckets), provenance: Object.freeze(provenance) });
}

export function compactIntegerString(raw) {
  if (!SIGNED_INTEGER.test(String(raw))) throw new TypeError("Expected a canonical integer string"); const value = BigInt(raw); const negative = value < 0n; const absolute = negative ? -value : value;
  for (const [divisor, suffix] of [[1000000000000000000n,"Q"],[1000000000000000n,"q"],[1000000000000n,"T"],[1000000000n,"B"],[1000000n,"M"],[1000n,"K"]]) if (absolute >= divisor) { const tenths = absolute * 10n / divisor; return `${negative ? "-" : ""}${tenths / 10n}.${tenths % 10n}${suffix}`; }
  return String(value);
}
export function exactDecimalString(raw) { const value = String(raw); if (!SIGNED_DECIMAL.test(value)) throw new TypeError("Expected a canonical exact decimal string"); return value; }
const privateHostname = (hostname) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || (!host.includes(".") && !host.includes(":")) || host === "::" || host === "::1" || host.startsWith("::ffff:") || /^f[cd][0-9a-f]:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)) return true;
  const octets = host.split(".").map(Number); if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false; const [a,b] = octets;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};
export function safePublicUrl(raw) { try { if (typeof raw !== "string" || raw.length > MAX_URL_LENGTH) return null; const url = new URL(raw); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || privateHostname(url.hostname)) return null; return url; } catch { return null; } }
export function canonicalJson(value) { if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`; if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`; return JSON.stringify(value); }
export async function sha256Hex(value) { const bytes = new TextEncoder().encode(canonicalJson(value)); const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
