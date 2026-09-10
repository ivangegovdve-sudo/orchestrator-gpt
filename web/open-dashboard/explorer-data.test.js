import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STATE,
  finite,
  normalizeModels,
  mergeMedia,
  filterModels,
  metric,
  tokenPoints,
  exactComparisons,
  observedCells,
  readState,
  stateQuery,
  loadCollection,
  request,
  API_BASE,
  consecutiveHistoryDays,
} from "./explorer-data.js";

const raw = (overrides = {}) => ({
  provider: "openrouter",
  id: "vendor/model",
  displayName: "Model",
  outputModalities: ["text"],
  pricing: { promptUsdPerToken: "0", completionUsdPerToken: "0" },
  isFree: true,
  freeKind: "concrete_free",
  contextLength: "128000",
  providerActive: null,
  availability: "available",
  lastConfirmedAt: "2026-09-10T00:00:00Z",
  ...overrides,
});
const normalized = (overrides) =>
  normalizeModels({ data: [raw(overrides)] })[0];
const state = (overrides) => ({ ...DEFAULT_STATE, ...overrides });
const period = {
  start: "2026-09-09",
  end: "2026-09-09",
  unit: "day",
  inclusive: true,
};
const cell = (overrides) => ({
  state: "observed",
  appId: "1",
  modelId: "vendor/model",
  totalTokens: "9007199254740993",
  period: { ...period },
  metricSemantics: "observed_daily_total_tokens",
  ...overrides,
});
const matrix = (cells) => ({
  status: "available",
  resolvedPeriod: { ...period },
  apps: [{ appId: "1", appName: "App" }],
  models: [{ modelId: "vendor/model", modelName: "Model" }],
  appIds: ["1"],
  modelIds: ["vendor/model"],
  cells,
});

test("numeric fields reject absence, coercion, nondecimal strings, overflow and positive underflow", () => {
  for (const value of [
    null,
    undefined,
    "",
    "   ",
    [],
    [0],
    {},
    true,
    false,
    NaN,
    Infinity,
    -1,
    "0x10",
    "1e4",
    "Infinity",
    "0." + "0".repeat(400) + "1",
  ]) {
    assert.equal(
      finite(value),
      null,
      `unexpected numeric value for ${String(value)}`,
    );
  }
  assert.equal(finite("0"), 0);
  assert.equal(finite("0.000001"), 0.000001);
  assert.equal(finite(3.5), 3.5);
});

test("zero token prices require an affirmative free classification and text-only output", () => {
  assert.equal(normalized().freeOffer, "zero_price");
  for (const overrides of [
    { isFree: false, freeKind: "paid_or_unknown" },
    { isFree: null },
    { freeKind: "free_router" },
    { outputModalities: ["video"] },
    { outputModalities: ["text", "image"] },
    { outputModalities: null },
  ]) {
    assert.equal(normalized(overrides).freeOffer, null);
  }
  const withCharge = normalizeModels(
    { data: [raw()] },
    {
      data: [
        {
          id: "vendor/model",
          pricing: { prompt: "0", completion: "0", request: "0.01" },
        },
      ],
    },
  )[0];
  assert.equal(withCharge.freeOffer, null);
});

test("reported provider quotas remain separate from paid token rates and unknown modalities", () => {
  const model = normalized({
    provider: "groq",
    id: "openai/gpt-oss-120b",
    outputModalities: null,
    isFree: false,
    freeKind: "paid_or_unknown",
    pricing: {
      promptUsdPerToken: "0.000001",
      completionUsdPerToken: "0.000002",
    },
  });
  assert.equal(model.freeOffer, "free_plan");
  assert.equal(model.input, 1);
  assert.equal(model.output, 2);
  assert.equal(model.zeroText, false);
  assert.equal(
    filterModels([model], state({ free: true, modality: "all" })).length,
    1,
  );
  assert.equal(
    filterModels([model], state({ free: true, modality: "text" })).length,
    0,
  );
});

test("free filters exclude unreported or unrecognized offers", () => {
  const model = normalized();
  for (const freeOffer of [null, undefined, "unknown"])
    assert.equal(
      filterModels([{ ...model, freeOffer }], state({ free: true })).length,
      0,
    );
});

test("media merge preserves source modalities but never carries a token-free claim into media", () => {
  const model = normalized();
  const [merged] = mergeMedia(
    [model],
    [
      {
        provider: model.provider,
        id: model.id,
        displayName: "Media Model",
        mediaKind: "image",
        outputModalities: ["image"],
        fetchedAt: "2026-09-09T00:00:00Z",
        pricePoints: [],
      },
    ],
  );
  assert.deepEqual(merged.modalities, ["text", "image"]);
  assert.equal(merged.zeroText, false);
  assert.equal(merged.freeOffer, null);
  assert.equal(merged.kind, "media");
  assert.equal(tokenPoints([merged], state()).length, 0);
  assert.equal(merged.catalogueSourceAt, model.sourceAt);
});

test("native Groq speech catalogue preserves its documented free-plan offer", () => {
  const [model] = mergeMedia(
    [],
    [
      {
        provider: "groq",
        id: "canopylabs/orpheus-v1-english",
        mediaKind: "audio",
        outputModalities: ["speech"],
        pricePoints: [],
      },
    ],
  );
  assert.deepEqual(model.modalities, ["audio"]);
  assert.equal(model.freeOffer, "free_plan");
  assert.equal(model.zeroText, false);
});

test("dimensions preserve missing prices and reject non-finite computed coordinates", () => {
  const incomplete = normalized({
    pricing: { promptUsdPerToken: null, completionUsdPerToken: "0" },
  });
  assert.equal(incomplete.input, null);
  assert.equal(metric(incomplete, "workload"), null);
  assert.deepEqual(tokenPoints([incomplete], state()), []);
  const huge = normalized({
    pricing: { promptUsdPerToken: "9".repeat(305), completionUsdPerToken: "0" },
  });
  assert.equal(huge.input, null);
  assert.deepEqual(tokenPoints([huge], state()), []);
  assert.equal(
    metric(
      { ...normalized(), input: 1e308 },
      "workload",
      state({ inputTokens: 1e9 }),
    ),
    null,
  );
  assert.equal(metric(normalized(), "name"), null);
  assert.equal(
    metric(
      normalized(),
      "workload",
      state({ inputTokens: 0, outputTokens: 0 }),
    ),
    0,
  );
});

test("same-ID comparisons retain provider identity and require text-compatible comparable prices", () => {
  const selected = normalized({
    pricing: {
      promptUsdPerToken: "0.000001",
      completionUsdPerToken: "0.000002",
    },
    isFree: false,
  });
  const peers = [
    selected,
    normalized({ provider: "novita" }),
    normalized({ id: "vendor/model:free" }),
    normalized({ provider: "deepinfra", providerActive: false }),
    normalized({ provider: "chutes", outputModalities: ["video"] }),
  ];
  assert.deepEqual(
    exactComparisons(selected, peers).map((row) => row.provider),
    ["novita", "openrouter"],
  );
  assert.deepEqual(
    exactComparisons(
      { ...selected, kind: "media", modalities: ["video"] },
      peers,
    ),
    [],
  );
});

test("observed matrix cells retain exact counts and require the stated day, semantics and axes", () => {
  const good = cell(),
    zero = cell({ modelId: "other", totalTokens: "0" });
  const invalid = [
    cell({ totalTokens: 9007199254740992 }),
    cell({ totalTokens: "1e3" }),
    cell({ totalTokens: "9".repeat(400) }),
    cell({ period: { ...period, start: "2026-09-08" } }),
    cell({ period: { ...period, unit: "week" } }),
    cell({ metricSemantics: "weekly_total" }),
    cell({ appId: "unknown" }),
    cell({ state: "unknown" }),
  ];
  assert.deepEqual(observedCells(matrix([good, ...invalid])), [good]);
  const withZero = matrix([zero]);
  withZero.models.push({ modelId: "other" });
  withZero.modelIds.push("other");
  assert.deepEqual(observedCells(withZero), [zero]);
  assert.deepEqual(observedCells({ status: "available" }), []);
  assert.deepEqual(
    observedCells(matrix([good, cell()])),
    [],
    "ambiguous duplicate coordinates must not create doubled connections",
  );
});

test("URL state round-trips exact model IDs and rejects invalid numeric or axis inputs", () => {
  const selected = state({
    provider: "openrouter",
    selected: "openrouter:vendor/model:free",
    q: "tools & video",
    view: "apps",
    context: 128000,
    free: true,
  });
  assert.deepEqual(readState(stateQuery(selected)), selected);
  assert.equal(
    readState("?inputTokens=%20%20&outputTokens=0x10").inputTokens,
    DEFAULT_STATE.inputTokens,
  );
  assert.equal(
    readState("?inputTokens=%20%20&outputTokens=0x10").outputTokens,
    DEFAULT_STATE.outputTokens,
  );
  assert.equal(readState("?x=prototype&y=unknown").x, DEFAULT_STATE.x);
  assert.equal(readState("?context=999999999999").context, 1e9);
  for (const view of ["benchmarks", "changes"])
    assert.equal(readState(stateQuery(state({ view }))).view, view);
  const history = state({ view: "history", historyModel: "vendor/model:free" });
  assert.deepEqual(readState(stateQuery(history)), history);
  assert.equal(readState("").historyModel, "all");
});

test("unreported source facts remain unknown and catalog presence does not override inactivity", () => {
  const unknown = normalized({
    outputModalities: null,
    contextLength: null,
    lastConfirmedAt: null,
    lastSeenAt: null,
    pricing: { promptUsdPerToken: null, completionUsdPerToken: null },
    isFree: null,
    freeKind: "paid_or_unknown",
  });
  assert.deepEqual(unknown.modalities, []);
  assert.equal(unknown.context, null);
  assert.equal(unknown.tools, null);
  assert.equal(unknown.sourceAt, null);
  assert.equal(filterModels([unknown], state({ modality: "all" })).length, 1);
  assert.equal(
    filterModels([unknown], state({ tools: true, modality: "all" })).length,
    0,
  );
  const retired = normalized({
    providerActive: false,
    availability: "available",
  });
  assert.equal(filterModels([retired], state()).length, 0);
  assert.equal(filterModels([retired], state({ inactive: true })).length, 1);
});

test("pagination appends a query separator correctly and detects repeated cursors", async () => {
  const original = globalThis.fetch;
  const urls = [];
  let page = 0;
  globalThis.fetch = async (url) => {
    urls.push(url);
    return {
      ok: true,
      json: async () => ({
        schemaVersion: "2.0",
        data: [{ id: ++page }],
        cursor: page === 1 ? "next" : null,
      }),
    };
  };
  try {
    const result = await loadCollection("/models");
    assert.match(urls[1], /\/models\?cursor=next$/);
    assert.equal(result.data.length, 2);
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ schemaVersion: "2.0", data: [], cursor: "same" }),
    });
    await assert.rejects(loadCollection("/models?limit=2"), /repeated a page/);
  } finally {
    globalThis.fetch = original;
  }
});

test("only the explicit local preview host and port use the read-only proxy", async () => {
  const originalFetch = globalThis.fetch,
    originalLocation = Object.getOwnPropertyDescriptor(globalThis, "location"),
    urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ schemaVersion: "2.0" }) };
  };
  try {
    for (const [hostname, port, base] of [
      ["127.0.0.1", "4174", "/__open_dashboard_api"],
      ["localhost", "4174", "/__open_dashboard_api"],
      ["localhost", "8080", API_BASE],
      ["www.sdforest.site", "4174", API_BASE],
    ]) {
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: { hostname, port },
      });
      await request("/models?limit=1");
      assert.equal(urls.at(-1), `${base}/models?limit=1`);
    }
    assert.equal(
      API_BASE,
      "https://openrouter-github-dashboard.vercel.app/api/public/v2",
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocation)
      Object.defineProperty(globalThis, "location", originalLocation);
    else delete globalThis.location;
  }
});

test("daily history inserts absent UTC buckets without invented zeros and retains source rows", () => {
  const first = {
    date: "2026-09-01",
    complete: true,
    rows: [{ id: "model", value: "9007199254740993" }],
    source: "published",
  };
  const last = {
    date: "2026-09-04",
    complete: true,
    rows: [{ id: "model", value: "0" }],
  };
  const incomplete = {
    date: "2026-09-03",
    complete: false,
    rows: [{ id: "model", value: "20" }],
  };
  const input = [last, first, incomplete];
  const days = consecutiveHistoryDays(input);
  assert.deepEqual(
    days.map((day) => day.date),
    ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"],
  );
  assert.deepEqual(days[1], { date: "2026-09-02", complete: false, rows: [] });
  assert.equal(days[0].rows, first.rows);
  assert.equal(days[2].rows, incomplete.rows);
  assert.equal(days[0].source, "published");
  assert.equal(input[0], last, "input order must not be mutated");
  const plotted = days.map((day) =>
    day.complete === true
      ? (day.rows.find((row) => row.id === "model")?.value ?? null)
      : null,
  );
  assert.deepEqual(plotted, ["9007199254740993", null, null, "0"]);
});

test("history only treats explicit true completeness as complete and marks duplicate days ambiguous", () => {
  const days = consecutiveHistoryDays([
    {
      date: "2026-09-01",
      complete: "true",
      rows: [{ id: "model", value: "5" }],
    },
    { date: "2026-09-02", rows: [{ id: "model", value: "10" }] },
    {
      date: "2026-09-03",
      complete: true,
      rows: [{ id: "model", value: "15" }],
    },
    {
      date: "2026-09-03",
      complete: true,
      rows: [{ id: "model", value: "16" }],
    },
  ]);
  assert.deepEqual(
    days.map((day) => day.complete),
    [false, false, false],
  );
  assert.deepEqual(days[2], {
    date: "2026-09-03",
    complete: false,
    rows: [],
    gapReason: "ambiguous_date",
  });
});

test("daily history observes leap days and rejects invalid or oversized ranges", () => {
  assert.deepEqual(consecutiveHistoryDays([]), []);
  const leap = consecutiveHistoryDays([
    { date: "2024-03-01", complete: true, rows: [] },
    { date: "2024-02-28", complete: true, rows: [] },
  ]);
  assert.deepEqual(
    leap.map((day) => day.date),
    ["2024-02-28", "2024-02-29", "2024-03-01"],
  );
  assert.throws(
    () => consecutiveHistoryDays([{ date: "2026-02-30", rows: [] }]),
    /invalid history date/,
  );
  assert.throws(
    () =>
      consecutiveHistoryDays([
        { date: "2026-01-01", rows: [] },
        { date: "2027-01-02", rows: [] },
      ]),
    /history range exceeds/,
  );
  assert.throws(
    () =>
      consecutiveHistoryDays(
        [
          { date: "2026-01-01", rows: [] },
          { date: "2026-02-01", rows: [] },
        ],
        30,
      ),
    /history range exceeds/,
  );
  assert.throws(() => consecutiveHistoryDays([], 367), /history limit/);
});
