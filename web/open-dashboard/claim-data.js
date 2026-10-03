import { readProviderCatalogue } from "./live-source.js";
/** Public price evidence only. No credentials, inference, or model-equivalence claims. */
export const CLAIM_SOURCES = Object.freeze({
  openrouter: "https://openrouter.ai/api/v1/models",
  crazyrouter: "https://crazyrouter.com/api/pricing",
  kie: "https://api.kie.ai/client/v1/model-pricing/page",
  fal: "https://fal.ai/pricing",
});
export const CLAIM_LINKS = Object.freeze({
  media: "https://kie.ai/v3-api-pricing",
  text: "https://crazyrouter.com/en/blog/openrouter-vs-crazyrouter-ai-api-router-comparison-2026",
});
const LABELS = {
  openrouter: "OpenRouter",
  crazyrouter: "Crazyrouter",
  kie: "KIE",
  fal: "fal",
};
const FALLBACK_URL = new URL("./claim-catalogue.json", import.meta.url).href;
const validDate = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const text = (value) => (typeof value === "string" ? value : "");
const pick = (object, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => object?.[key] != null)
      .map((key) => [key, object[key]]),
  );
export function evidenceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Preserve JSON numeric lexemes before arithmetic, including long source coefficients. */
export function parsePriceJson(source) {
  let result = "",
    i = 0;
  while (i < source.length) {
    if (source[i] === '"') {
      const start = i++;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i++] === '"') break;
      }
      result += source.slice(start, i);
    } else if (/[0-9-]/.test(source[i])) {
      const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
        source.slice(i),
      );
      if (!number) throw new Error("INVALID_SOURCE_JSON");
      result += JSON.stringify(number[0]);
      i += number[0].length;
    } else result += source[i++];
  }
  return JSON.parse(result);
}

function parts(value) {
  const raw = String(value ?? "");
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw) || raw.length > 160)
    throw new Error("INVALID_DECIMAL");
  const [whole, fraction = ""] = raw.split(".");
  return { n: BigInt(whole + fraction), scale: fraction.length };
}
function decimalString(n, scale) {
  let out = n.toString().padStart(scale + 1, "0");
  if (scale)
    out = `${out.slice(0, -scale)}.${out.slice(-scale)}`
      .replace(/0+$/, "")
      .replace(/\.$/, "");
  return out;
}
export function multiplyDecimals(...values) {
  const result = values
    .map(parts)
    .reduce((a, b) => ({ n: a.n * b.n, scale: a.scale + b.scale }), {
      n: 1n,
      scale: 0,
    });
  return decimalString(result.n, result.scale);
}
function canonical(value) {
  return multiplyDecimals(value);
}
function pricePoint(
  provider,
  id,
  amount,
  unit,
  readAt,
  condition,
  provenance = "published",
) {
  return {
    id: `${provider}:${id}:${unit}`,
    amount: canonical(amount),
    unit,
    condition,
    source: { url: CLAIM_SOURCES[provider], readAt },
    provenance,
    measurementOrigin: "catalogue",
  };
}
function model(
  provider,
  id,
  name,
  kind,
  points,
  readAt,
  nativeBilling,
  note = null,
  metadata = null,
) {
  return {
    provider,
    id,
    displayName: name || id,
    mediaKind: kind,
    outputModalities: ["unknown", "other"].includes(kind) ? [] : [kind],
    pricePoints: points,
    pricingState: points.length ? "published" : "unknown",
    pricingNote: note,
    sourceUrl: CLAIM_SOURCES[provider],
    fetchedAt: readAt,
    nativeBilling,
    metadata,
  };
}
function snapshot(
  provider,
  models,
  readAt,
  {
    listed = models.length,
    completeness = "full",
    scope = "public_native_catalogue",
    notes = [],
  } = {},
) {
  const report = {
    provider,
    status: completeness === "full" ? "available" : "partial",
    freshness: "live",
    sourceUrl: CLAIM_SOURCES[provider],
    observedAt: readAt,
    catalogueModels: models.length,
    modelsWithPricePoints: models.filter((m) => m.pricePoints.length).length,
    populationScope: scope,
    population: {
      listed,
      received: models.length,
      retained: models.length,
      completeness,
    },
  };
  return {
    schemaVersion: 2,
    collector: "openDashboard public evidence reader",
    fetchedAt: readAt,
    providers: [report],
    population: { catalogueModels: models.length, completeness },
    notes,
    models,
  };
}

export function normalizeOpenRouterPrices(payload, readAt) {
  if (!validDate(readAt) || !Array.isArray(payload?.data))
    throw new Error("OPENROUTER_SHAPE_CHANGED");
  const models = payload.data
    .filter((r) => typeof r?.id === "string")
    .map((row) => {
      const points = [],
        price = row.pricing ?? {};
      for (const [key, unit] of [
        ["prompt", "token_in"],
        ["completion", "token_out"],
        ["input_cache_read", "token_cached"],
      ]) {
        try {
          if (price[key] != null)
            points.push(
              pricePoint("openrouter", row.id, price[key], unit, readAt, {
                kind: "price_scope",
                name: "public_base_rate",
              }),
            );
        } catch {
          /* Invalid is unknown. */
        }
      }
      const modalities = row.architecture?.output_modalities ?? [];
      const kind = modalities.includes("text")
        ? "text"
        : modalities.find((v) => ["image", "video", "audio"].includes(v)) ||
          "unknown";
      return model(
        "openrouter",
        row.id,
        row.name,
        kind,
        points,
        readAt,
        { pricing: price, canonicalSlug: row.canonical_slug ?? null },
        points.length ? null : "Price not published in the collected row.",
        { contextLength: row.context_length ?? null },
      );
    });
  return snapshot("openrouter", models, readAt);
}

export function normalizeCrazyrouterPrices(payload, readAt) {
  if (
    !validDate(readAt) ||
    payload?.success !== true ||
    !Array.isArray(payload.data)
  )
    throw new Error("CRAZYROUTER_SHAPE_CHANGED");
  const models = payload.data
    .filter((r) => typeof r?.model_name === "string")
    .map((row) => {
      const points = [],
        id = row.model_name;
      let note = "Native billing formula is not supported for this comparison.";
      const simple =
        String(row.quota_type) === "0" &&
        ![
          "billing_expr",
          "tiered_expr",
          "time_pricing",
          "video_pricing",
          "image_pricing",
        ].some((k) => row[k]) &&
        (!row.billing_mode || row.billing_mode === "per_token");
      try {
        if (
          simple &&
          row.enable_groups?.includes("default") &&
          payload.group_ratio?.default != null
        ) {
          const discount = row.group_discounts?.default ?? row.discount ?? "1";
          if (!(Number(discount) > 0 && Number(discount) <= 1))
            throw new Error("INVALID_DISCOUNT");
          const input = multiplyDecimals(
            row.model_ratio,
            "2",
            payload.group_ratio.default,
            discount,
            "0.000001",
          );
          const condition = {
            kind: "price_scope",
            name: "public_default_group",
            discount: String(discount),
          };
          points.push(
            pricePoint(
              "crazyrouter",
              id,
              input,
              "token_in",
              readAt,
              condition,
              "derived",
            ),
            pricePoint(
              "crazyrouter",
              id,
              multiplyDecimals(input, row.completion_ratio),
              "token_out",
              readAt,
              condition,
              "derived",
            ),
          );
          note =
            "Calculated from public default-group coefficients and discount; not settled account charges.";
        }
      } catch {
        points.length = 0;
        note = "Missing or invalid price coefficients; price unknown.";
      }
      return model(
        "crazyrouter",
        id,
        id,
        simple ? "text" : "unknown",
        points,
        readAt,
        {
          coefficients: pick(row, [
            "quota_type",
            "model_ratio",
            "completion_ratio",
            "discount",
            "group_discounts",
            "enable_groups",
            "billing_mode",
          ]),
          unsupportedBillingFields: [
            "billing_expr",
            "tiered_expr",
            "time_pricing",
            "video_pricing",
            "image_pricing",
          ].filter((key) => row[key]),
          groupRatio: payload.group_ratio?.default ?? null,
          formula:
            "USD/input token = model_ratio × 2 × group_ratio.default × default discount / 1000000; output = input × completion_ratio",
        },
        note,
      );
    });
  return snapshot("crazyrouter", models, readAt);
}

const KIE_UNITS = {
  "per image": ["image", ["image"]],
  "per megapixel": ["megapixel", ["image"]],
  "per second": ["video_second", ["video"]],
  "per video": ["video", ["video"]],
  "per request": ["request", ["image", "video", "audio", "text"]],
  "per million tokens": ["token", ["text"]],
  "per 1m tokens": ["token", ["text"]],
};
export function normalizeKiePrices(
  rows,
  readAt,
  { total = rows?.length, completeness = "full" } = {},
) {
  if (!validDate(readAt) || !Array.isArray(rows))
    throw new Error("KIE_SHAPE_CHANGED");
  const seen = new Set();
  const models = rows.map((row) => {
    const name = text(row?.modelDescription),
      id = name.trim().replace(/\s+/g, " ").replace(/\s+,/g, ",");
    if (!id || seen.has(id))
      throw new Error("KIE_IDENTITY_MISSING_OR_DUPLICATED");
    seen.add(id);
    const kind =
      { image: "image", video: "video", music: "audio", chat: "text" }[
        row.interfaceType
      ] || "unknown";
    const mapped = KIE_UNITS[text(row.creditUnit).trim().toLowerCase()],
      points = [];
    let note =
      "Native billing unit is not comparable; retained without a USD quote.";
    try {
      if (row.creditPrice == null || row.usdPrice == null)
        note = "Price absent from collected source.";
      else if (mapped && mapped[1].includes(kind)) {
        const leg = /,\s*input$/i.test(id)
          ? "token_in"
          : /,\s*output$/i.test(id)
            ? "token_out"
            : /,\s*cached input$/i.test(id)
              ? "token_cached"
              : /,\s*cache writes?$/i.test(id)
                ? "token_cache_create"
                : null;
        if (mapped[0] === "token" && !leg) note = "Token direction not stated.";
        else if (
          multiplyDecimals(row.creditPrice, "0.005") !== canonical(row.usdPrice)
        )
          note = "Credit and USD price columns disagree.";
        else {
          const unit = mapped[0] === "token" ? leg : mapped[0];
          const amount =
            mapped[0] === "token"
              ? multiplyDecimals(row.usdPrice, "0.000001")
              : row.usdPrice;
          points.push(
            pricePoint("kie", id, amount, unit, readAt, {
              kind: "price_scope",
              name: "public_listed_variant",
              variant: id,
            }),
          );
          note =
            "Exact listed variant; USD agrees with credits × $0.005. Top-up bonuses excluded.";
        }
      }
    } catch {
      note = "Invalid native decimal; price unknown.";
    }
    return {
      ...model(
        "kie",
        id,
        name,
        kind,
        points,
        readAt,
        {
          kieRow: pick(row, [
            "creditPrice",
            "usdPrice",
            "creditUnit",
            "interfaceType",
          ]),
          usdPerCredit: "0.005",
        },
        note,
      ),
      modelUrl: evidenceUrl(row.anchor),
      sourceNotes: [
        "The full description identifies a priced variant, not an inference endpoint ID. KIE competitor-price fields are unverified and excluded.",
      ],
    };
  });
  return snapshot("kie", models, readAt, {
    listed: total,
    completeness,
    scope: "public_priced_variants",
  });
}

/** The public fal table is a summary, not its complete catalogue or account pricing. */
export function normalizeFalSummary(html, readAt) {
  if (!validDate(readAt)) throw new Error("SOURCE_DATE_MISSING");
  const plain = (value) =>
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const models = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (m) => m[1],
    );
    const id = /href="\/models\/([^"?#]+)"/.exec(cells[0] || "")?.[1];
    const unit = plain(cells[1] || ""),
      value = /^\$\s*(\d+(?:\.\d+)?)$/.exec(plain(cells[2] || ""))?.[1];
    if (
      !id ||
      !value ||
      !["image", "megapixel", "video", "second"].includes(unit)
    )
      continue;
    const image = ["image", "megapixel"].includes(unit),
      kind = image ? "image" : "video";
    const condition = {
      kind: "price_scope",
      name: "public_summary",
      details: image
        ? "Image summary normalized to 1MP; configuration equivalence not established."
        : "Video summary example; exact generation settings not established.",
    };
    models.push({
      ...model(
        "fal",
        id,
        plain(cells[0]),
        kind,
        [
          pricePoint(
            "fal",
            id,
            value,
            unit === "second" ? "video_second" : unit,
            readAt,
            condition,
          ),
        ],
        readAt,
        { tableText: plain(row[1]), nativeUnit: unit },
        condition.details,
      ),
      modelUrl: `https://fal.ai/models/${id}`,
    });
  }
  if (!models.length) throw new Error("FAL_SUMMARY_SHAPE_CHANGED");
  return snapshot("fal", models, readAt, {
    scope: "public_pricing_summary",
    notes: [
      "This is the public fal pricing summary, not a full model catalogue. No account-specific rates are read.",
    ],
  });
}

function sourceTimeout() {
  const error = new Error("Source read timed out.");
  error.name = "AbortError";
  return error;
}

async function readSource(
  url,
  { fetchImpl = fetch, body, timeoutMs = 12000, local = false } = {},
) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(sourceTimeout());
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(url, {
          method: body ? "POST" : "GET",
          credentials: "omit",
          cache: "no-store",
          redirect: "error",
          signal: controller.signal,
          ...(body
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }
            : {}),
        });
        if (controller.signal.aborted) throw sourceTimeout();
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const raw = await response.text();
        if (controller.signal.aborted) throw sourceTimeout();
        if (raw.length > 12_000_000) throw new Error("SOURCE_SIZE_LIMIT");
        return {
          data: local ? JSON.parse(raw) : raw,
          readAt: new Date().toISOString(),
        };
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function collectKieCatalogue({
  fetchImpl = fetch,
  maxPages = 20,
  timeoutMs = 12000,
} = {}) {
  // Pagination shares one budget; slow pages cannot reset the twelve-second cap.
  const deadline =
    performance.now() +
    Math.min(12000, Math.max(1, Number(timeoutMs) || 12000));
  const rows = [];
  let total = null,
    readAt = null,
    pages = 0,
    complete = false;
  for (let page = 1; page <= Math.min(20, maxPages); page++) {
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw sourceTimeout();
    const result = await readSource(CLAIM_SOURCES.kie, {
      fetchImpl,
      timeoutMs: remaining,
      body: {
        pageNum: page,
        pageSize: 100,
        modelDescription: "",
        interfaceType: "",
      },
    });
    if (performance.now() >= deadline) throw sourceTimeout();
    const payload = parsePriceJson(result.data);
    if (String(payload.code) !== "200" || !Array.isArray(payload.data?.records))
      throw new Error("KIE_ENVELOPE_NOT_OK");
    const reported = Number(payload.data.total);
    if (!Number.isSafeInteger(reported) || reported < 0 || reported > 20000)
      throw new Error("KIE_POPULATION_INVALID");
    if (total !== null && reported !== total)
      throw new Error("KIE_POPULATION_CHANGED_DURING_READ");
    total = reported;
    rows.push(...payload.data.records);
    readAt = result.readAt;
    pages++;
    if (rows.length >= total) {
      complete = rows.length === total;
      break;
    }
    if (!payload.data.records.length) throw new Error("KIE_PAGE_MISSING");
  }
  const result = normalizeKiePrices(rows, readAt, {
    total,
    completeness: complete ? "full" : "partial",
  });
  if (performance.now() >= deadline) throw sourceTimeout();
  result.providers[0].pagesFetched = pages;
  return result;
}

export async function collectClaimSource(
  provider,
  { fetchImpl = fetch, timeoutMs = 12000 } = {},
) {
  if (provider === "kie") return collectKieCatalogue({ fetchImpl, timeoutMs });
  const result = await readSource(CLAIM_SOURCES[provider], { fetchImpl });
  if (provider === "fal")
    return normalizeFalSummary(result.data, result.readAt);
  return (
    provider === "openrouter"
      ? normalizeOpenRouterPrices
      : normalizeCrazyrouterPrices
  )(parsePriceJson(result.data), result.readAt);
}

let fallbackPromise;
async function fallback(fetchImpl, force) {
  if (!fallbackPromise || force || fetchImpl !== globalThis.fetch) {
    const next = readSource(FALLBACK_URL, { fetchImpl, local: true })
      .then((r) => r.data)
      .catch(() => null);
    if (fetchImpl === globalThis.fetch) fallbackPromise = next;
    return next;
  }
  return fallbackPromise;
}
export function datedProvider(snapshotValue, provider, error = null) {
  const report = snapshotValue?.providers?.find((p) => p.provider === provider);
  const models =
    snapshotValue?.models?.filter(
      (m) => m.provider === provider && validDate(m.fetchedAt),
    ) ?? [];
  if (!report || !validDate(report.observedAt) || !models.length) return null;
  return {
    schemaVersion: 2,
    collector: snapshotValue.collector,
    fetchedAt: report.observedAt,
    providers: [
      {
        ...report,
        freshness: "snapshot",
        ...(error ? { refreshError: error } : {}),
      },
    ],
    population: {
      completeness: report.population?.completeness ?? "unknown",
      catalogueModels: models.length,
    },
    models,
    notes: [
      `Dated ${LABELS[provider]} observation from ${report.observedAt}; not fetched live from the provider in this browser.`,
      ...(snapshotValue.notes ?? []),
    ],
  };
}

const pending = new Map();
async function loadProvider(provider, { fetchImpl = fetch, force = false } = {}) {
  if (!force && fetchImpl === globalThis.fetch && pending.has(provider)) return pending.get(provider);
  const work = readProviderCatalogue(provider, { fetchImpl }).then(current => ({ ...current, notes: ['Live MCP provider catalogue read.'] })).catch(() => ({
    schemaVersion: '1.0', fetchedAt: null, models: [], notes: [], providers: [{ provider, status: 'unavailable', freshness: 'unavailable', observedAt: null, sourceUrl: CLAIM_SOURCES[provider], error: 'Live provider source unavailable.' }]
  }));
  if (fetchImpl === globalThis.fetch) pending.set(provider, work);
  return work;
}
export function loadKieCatalogue(options = {}) { return loadProvider('kie', options); }

export function selectClaimRows(
  source,
  provider,
  limit = 6,
  nativeUnit = null,
) {
  const models = (source?.models ?? []).filter(
    (m) => m.provider === provider && m.pricePoints?.length,
  );
  const preferences =
    provider === "openrouter"
      ? [
          "openai/gpt-5-nano",
          "openai/gpt-4o-mini",
          "openai/gpt-4.1-mini",
          "google/gemini-2.5-flash",
        ]
      : provider === "crazyrouter"
        ? ["gpt-5-nano", "gpt-4o-mini", "gpt-4.1-mini", "gemini-2.5-flash"]
        : [];
  const ordered = [...models].sort((a, b) => {
    const rank = (m) =>
      preferences.includes(m.id)
        ? preferences.indexOf(m.id)
        : preferences.length;
    return rank(a) - rank(b);
  });
  const rows = [];
  for (const m of ordered) {
    const points = m.pricePoints,
      input = points.find((p) => p.unit === "token_in"),
      output = points.find((p) => p.unit === "token_out");
    const textPair = provider === "openrouter" || provider === "crazyrouter";
    const point = textPair
      ? input
      : points.find(
          (p) =>
            ["image", "megapixel", "video", "video_second"].includes(p.unit) &&
            (!nativeUnit || p.unit === nativeUnit),
        );
    if (!point || (textPair && !output)) continue;
    rows.push({
      id: m.id,
      name: m.displayName,
      amount: point.amount,
      unit: point.unit,
      currency: "USD",
      readAt: point.source.readAt,
      sourceUrl: point.source.url,
      modelUrl: m.modelUrl,
      condition: point.condition,
      note: m.pricingNote,
      provenance: point.provenance,
      nativeBilling: m.nativeBilling,
      ...(textPair
        ? {
            input: multiplyDecimals(input.amount, "1000000"),
            output: multiplyDecimals(output.amount, "1000000"),
          }
        : {}),
    });
    if (rows.length >= limit) break;
  }
  return rows;
}
export async function loadClaimEvidence(options = {}) {
  const sources = await Promise.all(
    Object.keys(LABELS).map((id) => loadProvider(id, options)),
  );
  return {
    checkedAt: new Date().toISOString(),
    providers: sources.map((source) => {
      const report = source.providers[0];
      return {
        ...report,
        id: report.provider,
        label: LABELS[report.provider],
        readAt: report.observedAt,
        rows: ["kie", "fal"].includes(report.provider)
          ? ["image", "megapixel", "video_second", "video"].flatMap((unit) =>
              selectClaimRows(source, report.provider, 6, unit),
            )
          : selectClaimRows(source, report.provider),
        selection:
          "Up to six illustrative observations per native unit; no like-for-like ranking.",
        notes: source.notes,
      };
    }),
  };
}
