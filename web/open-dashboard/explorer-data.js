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
  unit: "video_second",
  inputTokens: 1000000,
  outputTokens: 250000,
  selected: "",
  app: "all",
  flowModel: "all",
  historyModel: "all",
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
const MODALITIES = ["text", "video", "image", "audio", "all"];
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
    "flowModel",
    "historyModel",
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
    ["models", "apps", "history", "benchmarks", "changes"].includes(
      q.get("view"),
    )
  )
    s.view = q.get("view");
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
        context: finite(row.contextLength),
        input: input === null ? null : finite(input * 1e6),
        output: output === null ? null : finite(output * 1e6),
        modalities,
        tools: Array.isArray(detail?.supportedParameters)
          ? detail.supportedParameters.includes("tools")
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
            : null,
        sourceAt: row.lastConfirmedAt ?? row.lastSeenAt ?? null,
      };
    });
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
    result.set(key, {
      ...existing,
      ...m,
      key,
      name: m.displayName || existing?.name || m.id,
      modalities,
      kind: "media",
      mediaKind: m.mediaKind,
      context: existing?.context ?? null,
      input: existing?.input ?? null,
      output: existing?.output ?? null,
      tools: existing?.tools ?? null,
      zeroText: false,
      freeOffer: quota?.kind === "free_plan_quota" ? "free_plan" : null,
      quota,
      catalogueSourceAt: existing?.sourceAt ?? null,
      sourceAt: m.fetchedAt ?? null,
      availability: existing?.availability ?? "listed",
      providerActive: existing?.providerActive ?? null,
    });
  }
  return [...result.values()];
}
export function filterModels(models, s) {
  const q = s.q.toLowerCase().trim();
  return models.filter(
    (m) =>
      (s.provider === "all" || m.provider === s.provider) &&
      (s.modality === "all" || m.modalities.includes(s.modality)) &&
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
    .filter((m) => m.kind !== "media" && textOnly(m))
    .map((m) => ({ ...m, px: metric(m, s.x, s), py: metric(m, s.y, s) }))
    .filter((m) => m.px !== null && m.py !== null);
}
export function exactComparisons(selected, models) {
  if (!textOnly(selected) || selected.kind === "media") return [];
  return models
    .filter(
      (m) =>
        m.id === selected.id &&
        m.kind !== "media" &&
        finite(m.input) !== null &&
        finite(m.output) !== null &&
        m.providerActive !== false &&
        m.availability !== "disappeared" &&
        textOnly(m),
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
