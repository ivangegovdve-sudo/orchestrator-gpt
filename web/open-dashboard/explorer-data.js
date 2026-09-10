import { getFreeTierOffer } from "./provider-limits.js";
export const API_BASE =
  "https://openrouter-github-dashboard.vercel.app/api/public/v2";
export const PROVIDERS = {
  openrouter: "OpenRouter",
  groq: "Groq",
  cerebras: "Cerebras",
  sail: "Sail",
  qwencloud: "QwenCloud",
  deepinfra: "DeepInfra",
  novita: "Novita",
  sambanova: "SambaNova",
  chutes: "Chutes",
  wavespeed: "WaveSpeed",
  wavespeedai: "WaveSpeed",
  fal: "fal",
  crazyrouter: "Crazyrouter",
};
export const DEFAULT_STATE = Object.freeze({
  provider: "all",
  modality: "text",
  free: false,
  tools: false,
  inactive: false,
  context: 0,
  q: "",
  x: "input",
  y: "output",
  scale: "symlog",
  view: "models",
  modelChart: "prices",
  modelGroup: "provider",
  appChart: "flow",
  historyChart: "lines",
  historyDataset: "modelUsage",
  unit: "video_second",
  inputTokens: 1000000,
  outputTokens: 250000,
  selected: "",
  app: "all",
  usageApp: "",
  flowModel: "all",
  historyModel: "all",
  historyScope: "",
  weight: "tokens",
  benchSource: "artificial-analysis",
  benchMetric: "codingIndex",
  benchPrice: "input",
  benchGroup: "",
  changeRange: "year",
  changeKind: "all",
});
export const AXES = {
  input: "Input price · USD / 1M tokens",
  output: "Output price · USD / 1M tokens",
  context: "Context window · tokens",
  workload: "Example workload · USD",
};
const MODALITIES = ["text", "video", "image", "audio", "unknown", "all"];
const CHART_CHOICES = {
  modelChart: ["prices", "catalogue", "bars", "donut"],
  modelGroup: ["provider", "modality"],
  appChart: ["flow", "bars", "donut"],
  historyChart: ["lines", "bars"],
  historyDataset: ["modelUsage", "appRanks", "githubRanks"],
};
export const DIRECT_PROVIDER_IDS = Object.freeze(
  Object.keys(PROVIDERS).filter((id) => id !== "wavespeedai"),
);
const PROVIDER_SOURCE = {
  groq: "https://console.groq.com/docs/models",
  cerebras: "https://inference-docs.cerebras.ai/api-reference/models",
  sail: "https://docs.sailresearch.com/pricing.md",
  qwencloud: "https://www.alibabacloud.com/help/en/model-studio/models",
  deepinfra: "https://deepinfra.com/models",
  novita: "https://novita.ai/docs/api-reference/model-apis-llm-list-models",
  sambanova: "https://docs.sambanova.ai/cloud/api-reference/endpoints/models",
  chutes: "https://chutes.ai/app/api",
  wavespeed: "https://wavespeed.ai/api/models",
  fal: "https://api.fal.ai/v1/models",
  crazyrouter: "https://crazyrouter.com/api/pricing",
};
export const keyOf = (provider, id) => `${provider}:${id}`;
export function finite(value) {
  if (
    typeof value !== "number" &&
    (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value))
  )
    return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  // A tiny positive decimal must not underflow into a false zero-price claim.
  if (number === 0 && typeof value === "string" && /[1-9]/.test(value))
    return null;
  return number;
}
export const compact = (value) =>
  value == null
    ? "Not reported"
    : new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
export const money = (value) =>
  value == null
    ? "Not reported"
    : new Intl.NumberFormat("en", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits:
          value > 0 && value < 0.01 ? 6 : value < 1 ? 4 : 2,
      }).format(value);
export const dateLabel = (value) =>
  !value || !Number.isFinite(Date.parse(value))
    ? "Date not reported"
    : new Date(value).toLocaleDateString("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
export const safeUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
};
export function readState(search = "") {
  const q = new URLSearchParams(search),
    s = { ...DEFAULT_STATE };
  for (const k of [
    "provider",
    "q",
    "selected",
    "app",
    "usageApp",
    "flowModel",
    "historyModel",
    "historyScope",
    "unit",
    "benchSource",
    "benchMetric",
    "benchPrice",
    "benchGroup",
    "changeRange",
    "changeKind",
  ])
    if (q.has(k)) s[k] = q.get(k).slice(0, k === "selected" ? 512 : 240);
  for (const k of ["free", "tools", "inactive"]) s[k] = q.get(k) === "1";
  for (const k of ["x", "y"])
    if (Object.hasOwn(AXES, q.get(k))) s[k] = q.get(k);
  if (MODALITIES.includes(q.get("modality"))) s.modality = q.get("modality");
  if (
    ["overview", "models", "apps", "history", "benchmarks", "changes"].includes(
      q.get("view"),
    )
  )
    s.view = q.get("view");
  for (const [key, choices] of Object.entries(CHART_CHOICES))
    if (choices.includes(q.get(key))) s[key] = q.get(key);
  if (["linear", "symlog"].includes(q.get("scale"))) s.scale = q.get("scale");
  if (["equal", "tokens"].includes(q.get("weight"))) s.weight = q.get("weight");
  for (const k of ["context", "inputTokens", "outputTokens"])
    if (q.has(k) && finite(q.get(k)) !== null)
      s[k] = Math.min(1e9, Math.floor(Number(q.get(k))));
  return s;
}
export function stateQuery(s) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(DEFAULT_STATE))
    if (s[key] !== value && s[key] != null)
      q.set(
        key,
        typeof s[key] === "boolean" ? (s[key] ? "1" : "0") : String(s[key]),
      );
  return q.toString();
}
export function modelFilterSummary(s = DEFAULT_STATE) {
  const state = { ...DEFAULT_STATE, ...s };
  const summary = [];
  const add = (key, label, advanced = false) =>
    summary.push({ key, label, advanced });
  if (state.provider !== "all")
    add("provider", `Provider: ${PROVIDERS[state.provider] || state.provider}`);
  if (state.modality !== "all") {
    const outputs = {
      text: "Text output",
      video: "Video output",
      image: "Image output",
      audio: "Audio output",
      unknown: "Output not reported",
    };
    add("modality", outputs[state.modality] || `Output: ${state.modality}`);
  }
  if (state.free) add("free", "Free offers only");
  if (finite(state.context) > 0)
    add(
      "context",
      `Context ≥ ${Number(state.context).toLocaleString("en")} tokens`,
      true,
    );
  if (state.tools) add("tools", "Confirmed tool calling", true);
  if (state.inactive) add("inactive", "Including inactive models", true);
  if (state.q.trim()) add("q", `Search: “${state.q.trim()}”`);
  return summary;
}
export function clearModelFilters(s = DEFAULT_STATE) {
  return {
    ...DEFAULT_STATE,
    ...s,
    provider: "all",
    modality: "all",
    free: false,
    tools: false,
    inactive: false,
    context: 0,
    q: "",
    selected: "",
  };
}
export async function request(path) {
  const location = globalThis.location;
  const base =
    ["127.0.0.1", "localhost"].includes(location?.hostname) &&
    location?.port === "4174"
      ? "/__open_dashboard_api"
      : API_BASE;
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(20000),
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`Data source returned ${response.status}`);
  const raw = await response.json();
  if (!String(raw?.schemaVersion ?? "").startsWith("2."))
    throw new Error("Unsupported public data format");
  return raw;
}
export async function loadCollection(path, maxPages = 20) {
  const data = [],
    pages = [],
    seen = new Set();
  let cursor = null;
  do {
    const raw = await request(
      path +
        (cursor
          ? `${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`
          : ""),
    );
    if (!Array.isArray(raw.data))
      throw new Error("Catalogue did not return a collection");
    data.push(...raw.data);
    const { data: rows, ...meta } = raw;
    pages.push(meta);
    cursor = raw.cursor ?? null;
    if (cursor !== null && typeof cursor !== "string")
      throw new Error("Catalogue returned an invalid cursor");
    if (cursor && seen.has(cursor))
      throw new Error("Catalogue repeated a page");
    if (cursor) seen.add(cursor);
  } while (cursor && pages.length < maxPages);
  return { data, pages, hasMore: !!cursor };
}
const modalitySet = (input) =>
  Array.isArray(input)
    ? [
        ...new Set(
          input
            .filter((v) => typeof v === "string" && v.trim())
            .map((v) => {
              const modality = v.trim().toLowerCase();
              return ["speech", "transcription"].includes(modality)
                ? "audio"
                : modality;
            }),
        ),
      ]
    : [];
const textOnly = (model) =>
  Array.isArray(model?.modalities) &&
  model.modalities.length === 1 &&
  model.modalities[0] === "text";
// A positive, explicitly per-token pair can be compared without inventing an
// output modality. These entries remain outside the explicit Text-only filter.
const tokenComparable = (model) =>
  model.kind !== "media" &&
  (textOnly(model) ||
    (!model.modalities?.length &&
      finite(model.input) !== null &&
      finite(model.output) !== null &&
      (model.input > 0 || model.output > 0)));
export function normalizeModels(collection, details = { data: [] }) {
  const detailMap = new Map(
    (Array.isArray(details?.data) ? details.data : [])
      .filter((row) => row && typeof row.id === "string")
      .map((row) => [row.id, row]),
  );
  return (Array.isArray(collection?.data) ? collection.data : [])
    .filter(
      (r) =>
        r &&
        typeof r.id === "string" &&
        r.id.trim() &&
        typeof r.provider === "string" &&
        r.provider.trim(),
    )
    .map((row) => {
      const detail =
        row.provider === "openrouter" ? detailMap.get(row.id) : null;
      const modalities = modalitySet(
        row.outputModalities ?? detail?.architecture?.output_modalities,
      );
      const isText = modalities.length === 1 && modalities[0] === "text";
      const input = finite(row.pricing?.promptUsdPerToken),
        output = finite(row.pricing?.completionUsdPerToken);
      const otherCharges = detail?.pricing
        ? Object.entries(detail.pricing).some(
            ([k, v]) =>
              !["prompt", "completion", "discount"].includes(k) &&
              finite(v) > 0,
          )
        : false;
      const zeroText =
        isText &&
        row.isFree === true &&
        row.freeKind === "concrete_free" &&
        input === 0 &&
        output === 0 &&
        !otherCharges;
      const offer = getFreeTierOffer(row.provider, row.id);
      return {
        ...row,
        key: keyOf(row.provider, row.id),
        name: row.displayName || detail?.name || row.id,
        context: finite(row.contextLength) ?? finite(detail?.contextLength),
        input: input === null ? null : finite(input * 1e6),
        output: output === null ? null : finite(output * 1e6),
        modalities,
        tools: Array.isArray(
          detail?.supportedParameters ?? row.supportedParameters,
        )
          ? (detail?.supportedParameters ?? row.supportedParameters).includes(
              "tools",
            )
          : null,
        detail,
        freeOffer: zeroText
          ? "zero_price"
          : offer?.kind === "free_plan_quota"
            ? "free_plan"
            : null,
        quota: offer,
        zeroText,
        kind: "catalogue",
        sourceUrl:
          row.provider === "openrouter"
            ? `https://openrouter.ai/${row.id}`
            : (PROVIDER_SOURCE[row.provider] ?? null),
        sourceAt: row.lastConfirmedAt ?? row.lastSeenAt ?? null,
      };
    });
}
export function nativeTokenPair(points = []) {
  const inputs = points.filter(
      (p) => p.unit === "token_in" && finite(p.amount) !== null,
    ),
    outputs = points.filter(
      (p) => p.unit === "token_out" && finite(p.amount) !== null,
    );
  if (
    inputs.length !== 1 ||
    outputs.length !== 1 ||
    JSON.stringify(inputs[0].condition) !== JSON.stringify(outputs[0].condition)
  )
    return null;
  const input = finite(Number(inputs[0].amount) * 1e6),
    output = finite(Number(outputs[0].amount) * 1e6);
  return input === null || output === null
    ? null
    : { input, output, condition: inputs[0].condition ?? null };
}
/** Coverage separates registered adapters, acquired catalogue rows and router routes. */
export function providerCoverage(models, snapshot, sourceStatus, live) {
  const registry = Array.isArray(snapshot?.registry?.providers)
    ? snapshot.registry.providers
    : DIRECT_PROVIDER_IDS.map((id) => ({
        id,
        displayName: PROVIDERS[id],
        citationUrl: PROVIDER_SOURCE[id],
      }));
  const allIds = [
    ...new Set([
      ...registry.map((p) => p.id),
      ...models.map((m) => m.provider),
    ]),
  ];
  return allIds.map((id) => {
    const descriptor = registry.find((p) => p.id === id),
      native = snapshot?.providers?.find((p) => p.provider === id);
    const sourceId =
      id === "openrouter" ? "models_current" : `${id}_models_current`;
    const source = sourceStatus?.data?.find((p) => p.sourceId === sourceId);
    const entries = models.filter((m) => m.provider === id),
      archiveCount = live
        ? live.data.filter((m) => m.provider === id).length
        : null;
    return {
      id,
      label: descriptor?.displayName || PROVIDERS[id] || id,
      models: entries.length,
      archiveCount,
      nativeCount:
        native?.catalogueModels ?? native?.population?.retained ?? null,
      pricedModels: entries.filter(
        (m) =>
          m.pricePoints?.length ||
          (finite(m.input) !== null &&
            finite(m.output) !== null &&
            tokenComparable(m)),
      ).length,
      sourceAt: native?.observedAt || source?.lastSuccessAt || null,
      sourceUrl:
        native?.sourceUrl ||
        source?.citationUrl ||
        descriptor?.citationUrl ||
        null,
      status: entries.length
        ? native?.status === "partial"
          ? "partial"
          : "observed"
        : "unavailable",
      scope:
        native?.populationScope ||
        (source ? "published_model_catalogue" : "not_acquired"),
      population:
        native?.population?.completeness ||
        (source?.lastAttemptRunId === source?.publishedRunId &&
        source?.lastAttemptStatus === "published"
          ? source?.lastAttemptPopulationCompleteness
          : null) ||
        "unknown",
      note:
        native?.pricingCoverage ||
        descriptor?.comparabilityNote ||
        "Source-specific coverage has not been established.",
      verification: native?.pricingStatus || null,
      stale: source?.stale ?? null,
    };
  });
}

async function openRouterJson(url) {
  const response = await fetch(url, {
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(`OpenRouter public source returned ${response.status}`);
  const text = await response.text();
  if (text.length > 2 * 1024 * 1024)
    throw new Error("OpenRouter public response exceeded the size limit");
  return JSON.parse(text);
}
export async function loadRoutingProviders() {
  const sourceUrl = "https://openrouter.ai/api/v1/providers",
    payload = await openRouterJson(sourceUrl);
  if (!Array.isArray(payload?.data) || payload.data.length > 1000)
    throw new Error("OpenRouter provider directory format changed");
  const seen = new Set(),
    data = [];
  for (const row of payload.data) {
    if (
      typeof row?.slug !== "string" ||
      !row.slug ||
      typeof row.name !== "string" ||
      seen.has(row.slug)
    )
      continue;
    seen.add(row.slug);
    data.push({ id: row.slug, name: row.name });
  }
  if (!data.length)
    throw new Error("OpenRouter provider directory is unavailable");
  return { data, sourceUrl, fetchedAt: new Date().toISOString() };
}
export function normalizeModelEndpoints(
  payload,
  model,
  sourceAt = new Date().toISOString(),
) {
  if (
    payload?.data?.id !== model.id ||
    !Array.isArray(payload.data.endpoints) ||
    payload.data.endpoints.length > 500
  )
    throw new Error("Exact model endpoint identity or format did not match");
  const sourceUrl = `https://openrouter.ai/${model.id}/providers`,
    seen = new Set();
  const textPricing = textOnly(model) && model.kind !== "media";
  const rows = [];
  for (const row of payload.data.endpoints) {
    if (
      row?.model_id !== model.id ||
      typeof row.provider_name !== "string" ||
      typeof row.name !== "string"
    )
      continue;
    const key = JSON.stringify([
      model.id,
      row.provider_name,
      row.name,
      row.tag ?? null,
    ]);
    if (seen.has(key)) continue;
    seen.add(key);
    const prompt = finite(row.pricing?.prompt),
      completion = finite(row.pricing?.completion);
    rows.push({
      key,
      modelId: model.id,
      provider: row.provider_name,
      name: row.name,
      tag: typeof row.tag === "string" ? row.tag : null,
      input: textPricing && prompt !== null ? finite(prompt * 1e6) : null,
      output:
        textPricing && completion !== null ? finite(completion * 1e6) : null,
      context:
        finite(row.context_length) > 0 ? finite(row.context_length) : null,
      quantization:
        typeof row.quantization === "string" ? row.quantization : null,
      tools: Array.isArray(row.supported_parameters)
        ? row.supported_parameters.includes("tools")
        : null,
      supportedParameters: Array.isArray(row.supported_parameters)
        ? row.supported_parameters
            .filter((v) => typeof v === "string")
            .slice(0, 100)
        : [],
      sourceUrl,
      sourceAt,
      status: typeof row.status === "number" ? row.status : null,
    });
  }
  return {
    modelId: model.id,
    rows,
    sourceUrl,
    sourceAt,
    providerCount: new Set(rows.map((r) => r.provider)).size,
    textPricing,
  };
}
export async function loadModelEndpoints(model) {
  if (
    model.provider !== "openrouter" ||
    typeof model.id !== "string" ||
    model.id.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error("A valid exact OpenRouter model ID is required");
  const path = model.id.split("/").map(encodeURIComponent).join("/");
  return normalizeModelEndpoints(
    await openRouterJson(
      `https://openrouter.ai/api/v1/models/${path}/endpoints`,
    ),
    model,
  );
}
export function mergeMedia(models, media) {
  const result = new Map(models.map((m) => [m.key, m]));
  for (const m of media) {
    const key = keyOf(m.provider, m.id),
      existing = result.get(key),
      quota = getFreeTierOffer(m.provider, m.id);
    const modalities = modalitySet([
      ...(existing?.modalities ?? []),
      ...modalitySet(m.outputModalities),
    ]);
    const isMedia =
      modalities.some((value) => ["image", "video", "audio"].includes(value)) ||
      ["image", "video", "audio"].includes(m.mediaKind);
    const nativePair = !isMedia ? nativeTokenPair(m.pricePoints) : null;
    const nativeMeta = m.metadata ?? {};
    result.set(key, {
      ...existing,
      ...m,
      key,
      name: m.displayName || existing?.name || m.id,
      modalities,
      kind: isMedia ? "media" : "catalogue",
      nativeCatalogue: true,
      context: finite(nativeMeta.contextLength) ?? existing?.context ?? null,
      input: nativePair?.input ?? existing?.input ?? null,
      output: nativePair?.output ?? existing?.output ?? null,
      priceCondition: nativePair?.condition ?? null,
      tools: nativeMeta.tools === true ? true : (existing?.tools ?? null),
      capabilities: Array.isArray(nativeMeta.capabilities)
        ? nativeMeta.capabilities
        : [],
      zeroText: false,
      freeOffer: quota?.kind === "free_plan_quota" ? "free_plan" : null,
      quota,
      catalogueSourceAt: existing?.sourceAt ?? null,
      sourceAt: m.fetchedAt ?? null,
      availability: existing?.availability ?? "listed",
      providerActive:
        existing?.providerActive ??
        (nativeMeta.retirementAt &&
        Date.parse(nativeMeta.retirementAt) <= Date.parse(m.fetchedAt)
          ? false
          : null),
    });
  }
  return [...result.values()];
}
export function filterModels(models, s) {
  const q = s.q.toLowerCase().trim();
  return models.filter(
    (m) =>
      (s.provider === "all" || m.provider === s.provider) &&
      (s.modality === "all" ||
        (s.modality === "unknown"
          ? !m.modalities.length
          : m.modalities.includes(s.modality))) &&
      (!s.free || ["zero_price", "free_plan"].includes(m.freeOffer)) &&
      (!s.tools || m.tools === true) &&
      (!s.context || (m.context !== null && m.context >= s.context)) &&
      (s.inactive ||
        (m.providerActive !== false && m.availability !== "disappeared")) &&
      (!q || `${m.id} ${m.name} ${m.provider}`.toLowerCase().includes(q)),
  );
}
export function metric(m, axis, s = DEFAULT_STATE) {
  if (!Object.hasOwn(AXES, axis)) return null;
  if (axis !== "workload") return finite(m[axis]);
  const input = finite(m.input),
    output = finite(m.output),
    inputTokens = finite(s.inputTokens),
    outputTokens = finite(s.outputTokens);
  return [input, output, inputTokens, outputTokens].includes(null)
    ? null
    : finite((input * inputTokens + output * outputTokens) / 1e6);
}
export function tokenPoints(models, s) {
  return models
    .filter(tokenComparable)
    .map((m) => ({ ...m, px: metric(m, s.x, s), py: metric(m, s.y, s) }))
    .filter((m) => m.px !== null && m.py !== null);
}
export function exactComparisons(selected, models) {
  if (!tokenComparable(selected)) return [];
  return models
    .filter(
      (m) =>
        m.id === selected.id &&
        m.kind !== "media" &&
        finite(m.input) !== null &&
        finite(m.output) !== null &&
        m.providerActive !== false &&
        m.availability !== "disappeared" &&
        tokenComparable(m),
    )
    .sort((a, b) => a.input / 2 + a.output / 2 - (b.input / 2 + b.output / 2));
}
export function observedCells(matrix) {
  const period = matrix?.resolvedPeriod;
  if (
    matrix?.status !== "available" ||
    !Array.isArray(matrix.cells) ||
    period?.unit !== "day" ||
    period.inclusive !== true ||
    typeof period.start !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(period.start) ||
    period.start !== period.end
  )
    return [];
  const apps = new Set((matrix.apps ?? []).map((a) => a.appId)),
    models = new Set((matrix.models ?? []).map((m) => m.modelId));
  const eligible = matrix.cells.filter(
    (c) =>
      c?.state === "observed" &&
      apps.has(c.appId) &&
      models.has(c.modelId) &&
      c.metricSemantics === "observed_daily_total_tokens" &&
      c.period?.start === period.start &&
      c.period?.end === period.end &&
      c.period?.unit === "day" &&
      c.period?.inclusive === true &&
      typeof c.totalTokens === "string" &&
      /^\d{1,40}$/.test(c.totalTokens),
  );
  const counts = new Map();
  for (const c of eligible) {
    const key = JSON.stringify([c.appId, c.modelId]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return eligible.filter(
    (c) => counts.get(JSON.stringify([c.appId, c.modelId])) === 1,
  );
}

/** Consecutive UTC buckets for line charts; only complete === true may be plotted. */
export function consecutiveHistoryDays(days, maxDays = 366) {
  if (!Number.isInteger(maxDays) || maxDays < 1 || maxDays > 366)
    throw new RangeError("invalid history limit");
  if (!Array.isArray(days) || days.length === 0) return [];
  const dayMs = 86400000,
    byDate = new Map();
  let first = Infinity,
    last = -Infinity;
  for (const day of days) {
    const date = day?.date;
    const time =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? Date.parse(`${date}T00:00:00.000Z`)
        : NaN;
    if (
      !Number.isFinite(time) ||
      new Date(time).toISOString().slice(0, 10) !== date
    )
      throw new Error("invalid history date");
    first = Math.min(first, time);
    last = Math.max(last, time);
    // A duplicate cannot safely be summed or selected arbitrarily. Keep a gap
    // with a reason so consumers can distinguish ambiguity from no bucket.
    byDate.set(
      date,
      byDate.has(date)
        ? { date, complete: false, rows: [], gapReason: "ambiguous_date" }
        : {
            ...day,
            complete: day.complete === true && Array.isArray(day.rows),
            rows: Array.isArray(day.rows) ? day.rows : [],
          },
    );
  }
  const length = (last - first) / dayMs + 1;
  if (length > maxDays)
    throw new RangeError(`history range exceeds ${maxDays} days`);
  return Array.from({ length }, (_, index) => {
    const date = new Date(first + index * dayMs).toISOString().slice(0, 10);
    return byDate.get(date) ?? { date, complete: false, rows: [] };
  });
}
