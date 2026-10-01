import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CLAIM_SOURCES,
  parsePriceJson,
  multiplyDecimals,
  normalizeKiePrices,
  normalizeCrazyrouterPrices,
  normalizeOpenRouterPrices,
  normalizeFalSummary,
  collectKieCatalogue,
  loadKieCatalogue,
  loadClaimEvidence,
  datedProvider,
  selectClaimRows,
} from "./claim-data.js";
import { normalizeMediaCatalogue } from "./media-data.js";
import {
  mergeMedia,
  readState,
  stateQuery,
  DEFAULT_STATE,
  providerCoverage,
} from "./explorer-data.js";

const at = "2026-09-29T12:00:00.000Z";
const kie = (overrides = {}) => ({
  modelDescription: "Example, image, 1K",
  interfaceType: "image",
  creditPrice: "8",
  usdPrice: "0.04",
  creditUnit: "per image",
  falPrice: "999",
  discountRate: "99",
  ...overrides,
});
const response = (value) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });

test("source coefficients keep decimal lexemes without binary rounding or changing quoted text", () => {
  const parsed = parsePriceJson(
    '{"value":0.123456789012345678901,"text":"123 \\"x\\"","items":[true,null,2e-7]}',
  );
  assert.equal(parsed.value, "0.123456789012345678901");
  assert.equal(parsed.text, '123 "x"');
  assert.deepEqual(parsed.items, [true, null, "2e-7"]);
  assert.equal(multiplyDecimals(parsed.value, "2"), "0.246913578024691357802");
  assert.equal(multiplyDecimals("0.1", "0.005"), "0.0005");
  assert.throws(() => multiplyDecimals("-1", "0.005"));
});

test("KIE keeps full variants, unknown units and disagreeing credits without importing competitor prices", () => {
  const data = normalizeKiePrices(
    [
      kie(),
      kie({ modelDescription: "Example, image, 2K", creditUnit: "per vedio" }),
      kie({ modelDescription: "Example, image, 4K", usdPrice: "0.03" }),
      kie({
        modelDescription: "Example chat",
        interfaceType: "chat",
        creditUnit: "per image",
      }),
    ],
    at,
  );
  assert.equal(data.models.length, 4);
  assert.equal(data.providers[0].population.retained, 4);
  assert.equal(data.models[0].pricePoints[0].amount, "0.04");
  assert.equal(data.models[0].pricePoints[0].unit, "image");
  assert.equal(
    Object.hasOwn(data.models[0].nativeBilling.kieRow, "falPrice"),
    false,
  );
  assert.deepEqual(Object.keys(data.models[0].nativeBilling.kieRow).sort(), [
    "creditPrice",
    "creditUnit",
    "interfaceType",
    "usdPrice",
  ]);
  assert.equal(
    data.models.slice(1).every((m) => m.pricePoints.length === 0),
    true,
  );
  assert.match(data.models[2].pricingNote, /disagree/);
  const media = normalizeMediaCatalogue(data),
    merged = mergeMedia([], media);
  assert.equal(merged.length, 4);
  assert.equal(merged[1].input, null);
  assert.equal(merged[1].zeroText, false);
});

test("KIE only converts direction-specific token labels and rejects ambiguous identities", () => {
  const data = normalizeKiePrices(
    [
      kie({
        modelDescription: "  Model  , chat, Input ",
        interfaceType: "chat",
        creditUnit: "per million tokens",
        creditPrice: "20",
        usdPrice: "0.1",
      }),
      kie({
        modelDescription: "Model, chat",
        interfaceType: "chat",
        creditUnit: "per million tokens",
        creditPrice: "20",
        usdPrice: "0.1",
      }),
    ],
    at,
  );
  assert.equal(data.models[0].id, "Model, chat, Input");
  assert.equal(data.models[0].pricePoints[0].amount, "0.0000001");
  assert.equal(data.models[0].pricePoints[0].unit, "token_in");
  assert.equal(data.models[1].pricePoints.length, 0);
  assert.throws(() => normalizeKiePrices([kie(), kie()], at), /DUPLICATED/);
});

test("Crazyrouter default-group derivation keeps formulas, exact rates and unsupported billing unknown", () => {
  const data = normalizeCrazyrouterPrices(
    {
      success: true,
      group_ratio: { default: "1" },
      data: [
        {
          model_name: "gpt-5-nano",
          quota_type: "0",
          model_ratio: "0.025",
          completion_ratio: "8",
          enable_groups: ["default"],
          discount: "0.5",
          group_discounts: { default: "0.65" },
        },
        {
          model_name: "tiered",
          quota_type: "0",
          billing_expr: "formula",
          model_ratio: "0.1",
          completion_ratio: "1",
        },
      ],
    },
    at,
  );
  const [row] = selectClaimRows(data, "crazyrouter");
  assert.equal(row.input, "0.0325");
  assert.equal(row.output, "0.26");
  assert.equal(row.provenance, "derived");
  assert.equal(row.condition.name, "public_default_group");
  assert.equal(data.models[1].pricePoints.length, 0);
});

test("OpenRouter zero is retained only from an explicit price and missing output cannot form a pair", () => {
  const data = normalizeOpenRouterPrices(
    {
      data: [
        {
          id: "model:free",
          pricing: { prompt: "0", completion: "0" },
          architecture: { output_modalities: ["text"] },
        },
        { id: "missing", pricing: { prompt: "0.000001" } },
      ],
    },
    at,
  );
  const rows = selectClaimRows(data, "openrouter");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].input, "0");
  assert.equal(rows[0].output, "0");
});

test("fal summary preserves endpoint identity, source date, native units and limited scope", () => {
  const html =
    '<table><tr><td><a href="/models/fal-ai/example">Example</a></td><td>image</td><td>$<!-- -->0.04</td></tr></table>';
  const data = normalizeFalSummary(html, at);
  assert.equal(data.models[0].id, "fal-ai/example");
  assert.match(data.models[0].pricePoints[0].condition.details, /1MP/);
  assert.equal(data.providers[0].populationScope, "public_pricing_summary");
  assert.throws(
    () => normalizeFalSummary("<html>unavailable</html>", at),
    /SHAPE_CHANGED/,
  );
});

test("media samples can be selected by exact native unit without per-video conversions", () => {
  const data = normalizeKiePrices(
    [
      kie({ modelDescription: "Image variant" }),
      kie({
        modelDescription: "Video variant, 10s",
        interfaceType: "video",
        creditUnit: "per video",
      }),
      kie({
        modelDescription: "Second variant",
        interfaceType: "video",
        creditUnit: "per second",
      }),
    ],
    at,
  );
  assert.equal(selectClaimRows(data, "kie", 6, "image")[0].unit, "image");
  assert.equal(selectClaimRows(data, "kie", 6, "video")[0].amount, "0.04");
  assert.equal(
    selectClaimRows(data, "kie", 6, "video_second")[0].amount,
    "0.04",
  );
  assert.equal(selectClaimRows(data, "kie", 6, "megapixel").length, 0);
});

test("KIE pagination is bounded, read-only and refuses changing populations", async () => {
  const calls = [];
  const fetched = await collectKieCatalogue({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const page = JSON.parse(options.body).pageNum;
      return response({
        code: 200,
        data: {
          total: 2,
          records: [kie({ modelDescription: `Variant ${page}` })],
        },
      });
    },
  });
  assert.equal(fetched.models.length, 2);
  assert.equal(fetched.population.completeness, "full");
  assert.equal(calls.length, 2);
  assert.equal(
    calls.every(
      (c) =>
        c.url === CLAIM_SOURCES.kie &&
        c.options.method === "POST" &&
        c.options.credentials === "omit",
    ),
    true,
  );
  let page = 0;
  await assert.rejects(
    collectKieCatalogue({
      fetchImpl: async () =>
        response({
          code: 200,
          data: {
            total: ++page === 1 ? 2 : 3,
            records: [kie({ modelDescription: `V${page}` })],
          },
        }),
    }),
    /POPULATION_CHANGED/,
  );
  const bounded = await collectKieCatalogue({
    maxPages: 1,
    fetchImpl: async () =>
      response({ code: 200, data: { total: 20, records: [kie()] } }),
  });
  assert.equal(bounded.population.completeness, "partial");
});

test(
  "KIE pages share a total deadline instead of renewing it per page",
  { timeout: 1000 },
  async () => {
    const signals = [];
    await assert.rejects(
      collectKieCatalogue({
        timeoutMs: 90,
        fetchImpl: async (_url, options) => {
          signals.push(options.signal);
          const page = JSON.parse(options.body).pageNum;
          // Both pages individually fit the budget, but their sum does not.
          await new Promise((resolve) =>
            setTimeout(resolve, page === 1 ? 35 : 70),
          );
          return response({
            code: 200,
            data: {
              total: 2,
              records: [kie({ modelDescription: `Deadline ${page}` })],
            },
          });
        },
      }),
      { name: "AbortError" },
    );
    assert.equal(signals.length, 2);
    assert.equal(signals[1].aborted, true);
  },
);

test(
  "KIE deadline settles even when the fetch implementation ignores abort",
  { timeout: 1000 },
  async () => {
    let signal;
    await assert.rejects(
      collectKieCatalogue({
        timeoutMs: 15,
        fetchImpl: (_url, options) => {
          signal = options.signal;
          return new Promise(() => {});
        },
      }),
      { name: "AbortError" },
    );
    assert.equal(signal.aborted, true);
  },
);

test(
  "a stalled KIE response body times out into the original dated fallback",
  { timeout: 1000 },
  async () => {
    const old = normalizeKiePrices([kie()], at);
    let signal;
    const result = await loadKieCatalogue({
      timeoutMs: 15,
      fetchImpl: async (url, options) => {
        if (url === CLAIM_SOURCES.kie) {
          signal = options.signal;
          return { ok: true, text: () => new Promise(() => {}) };
        }
        return response(old);
      },
    });
    assert.equal(signal.aborted, true);
    assert.equal(result.providers[0].freshness, "snapshot");
    assert.equal(result.providers[0].observedAt, at);
    assert.equal(result.providers[0].refreshError, "Source read timed out.");
    assert.equal(result.models[0].fetchedAt, at);
  },
);

test("failed browser read uses dated fallback without relabelling its source time as live", async () => {
  const old = normalizeKiePrices([kie()], at);
  const result = await loadKieCatalogue({
    fetchImpl: async (url) => {
      if (url === CLAIM_SOURCES.kie)
        throw new TypeError("CORS or network unavailable");
      return response(old);
    },
  });
  assert.equal(result.providers[0].freshness, "snapshot");
  assert.equal(result.providers[0].observedAt, at);
  assert.equal(result.models[0].fetchedAt, at);
  assert.match(result.providers[0].refreshError, /did not complete/);
  const merged = mergeMedia([], normalizeMediaCatalogue(result));
  assert.equal(merged[0].sourceFreshness, "snapshot");
  assert.equal(merged[0].sourceAt, at);
  assert.equal(
    datedProvider(
      { ...old, providers: [{ ...old.providers[0], observedAt: null }] },
      "kie",
    ),
    null,
  );
});

test("provider freshness reaches native model inspectors and coverage without promoting dated neighbours", () => {
  const current = normalizeKiePrices([kie()], at);
  const datedAt = "2026-09-22T06:00:00.000Z";
  const dated = {
    provider: "fal",
    id: "fal-ai/example",
    displayName: "Example",
    mediaKind: "image",
    pricePoints: [],
    sourceUrl: "https://fal.ai/pricing",
    fetchedAt: datedAt,
  };
  const combined = {
    ...current,
    providers: [
      ...current.providers,
      { provider: "fal", observedAt: datedAt, status: "available" },
    ],
    models: [...current.models, dated],
  };
  const merged = mergeMedia([], normalizeMediaCatalogue(combined));
  assert.equal(
    merged.find((m) => m.provider === "kie").sourceFreshness,
    "live",
  );
  assert.equal(
    merged.find((m) => m.provider === "fal").sourceFreshness,
    "snapshot",
  );
  assert.equal(merged.find((m) => m.provider === "fal").sourceAt, datedAt);
  const coverage = providerCoverage(merged, combined, null, null);
  assert.equal(coverage.find((p) => p.id === "kie").sourceFreshness, "live");
  assert.equal(
    coverage.find((p) => p.id === "fal").sourceFreshness,
    "snapshot",
  );
  const forged = {
    ...current,
    providers: [{ ...current.providers[0], observedAt: null }],
    models: [{ ...current.models[0], sourceFreshness: "live" }],
  };
  assert.equal(normalizeMediaCatalogue(forged)[0].sourceFreshness, "snapshot");
  const legacy = { ...current, providers: [] };
  assert.equal(normalizeMediaCatalogue(legacy)[0].sourceFreshness, "snapshot");
});

test("the checked-in fallback identifies every saved source as a dated snapshot", async () => {
  const saved = JSON.parse(
    await readFile(new URL("./claim-catalogue.json", import.meta.url), "utf8"),
  );
  assert.ok(saved.providers.length > 0);
  for (const provider of saved.providers) {
    assert.equal(provider.freshness, "snapshot", provider.provider);
    assert.ok(Number.isFinite(Date.parse(provider.observedAt)));
  }
  const normalized = normalizeMediaCatalogue(saved);
  assert.ok(normalized.length > 0);
  assert.ok(normalized.every((model) => model.sourceFreshness === "snapshot"));
});

test("missing fallback remains unavailable and fal HTML is not requested by the browser loader", async () => {
  const urls = [];
  const data = await loadClaimEvidence({
    fetchImpl: async (url) => {
      urls.push(url);
      throw new Error("offline");
    },
  });
  assert.equal(
    data.providers.every(
      (p) =>
        p.status === "unavailable" && p.rows.length === 0 && p.readAt === null,
    ),
    true,
  );
  assert.equal(urls.includes(CLAIM_SOURCES.fal), false);
});

test("atlas and KIE survive shared-link encoding while prior chart choices remain valid", () => {
  assert.equal(DEFAULT_STATE.modelChart, "atlas");
  for (const modelChart of [
    "atlas",
    "prices",
    "catalogue",
    "bars",
    "donut",
    "compare",
  ]) {
    const state = readState(
      `?view=models&modelChart=${modelChart}&provider=kie`,
    );
    assert.equal(state.modelChart, modelChart);
    assert.equal(state.provider, "kie");
    assert.equal(readState(stateQuery(state)).modelChart, modelChart);
  }
});
