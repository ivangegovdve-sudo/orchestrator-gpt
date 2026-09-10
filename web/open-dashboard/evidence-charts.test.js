import assert from "node:assert/strict";
import test from "node:test";
import { benchmarkView, changeView, loadEvidence } from "./evidence-charts.js";

const collection = (data, extra = {}) => ({
  data,
  hasMore: false,
  pages: [
    {
      window: { start: "2026-09-09", end: "2026-09-09" },
      provenance: [
        {
          fetchedAt: "2026-09-09T06:10:56Z",
          sourceAsOf: "2026-09-09T00:00:00Z",
        },
      ],
      completeness: { acquisitionComplete: true },
      stale: false,
      ...extra,
    },
  ],
});
const benchmark = (extra) => ({
  source: "artificial-analysis",
  modelPermaslug: "vendor/model",
  displayName: "Model (Reasoning)",
  matchStatus: "matched",
  pricing: { prompt: "0.000002", completion: "0.000006" },
  codingIndex: 42,
  intelligenceIndex: null,
  sourceUrl: null,
  ...extra,
});

test("benchmarks preserve reasoning variants, source matching and the observation price", () => {
  const data = collection([
    benchmark({}),
    benchmark({
      displayName: "Model (low)",
      matchStatus: "unmatched",
      pricing: { prompt: "0.000001", completion: "0.000003" },
    }),
  ]);
  const view = benchmarkView(data);
  assert.equal(view.points.length, 2);
  assert.deepEqual(
    view.points.map((row) => row.px),
    [2, 1],
  );
  assert.deepEqual(
    view.points.map((row) => row.variantLabel),
    ["Model (Reasoning)", "Model (low)"],
  );
  assert.equal(new Set(view.points.map((row) => row.key)).size, 2);
  assert.equal(view.points[1].matchStatus, "unmatched");
  assert.equal(view.points[1].sourceAt, "2026-09-09T00:00:00Z");
  assert.match(view.points[0].sourceUrl, /\/benchmarks\?limit=100$/);
  assert.equal(
    benchmarkView(data, { metric: "intelligenceIndex" }).points.length,
    0,
  );
});

test("missing prices and scores remain omitted while an actual zero price remains plotted", () => {
  const view = benchmarkView(
    collection([
      benchmark({ pricing: { prompt: null } }),
      benchmark({ codingIndex: null }),
      benchmark({ pricing: { prompt: "" } }),
      benchmark({ pricing: { prompt: "0" }, codingIndex: 0 }),
    ]),
  );
  assert.equal(view.total, 4);
  assert.equal(view.omitted, 3);
  assert.equal(view.points.length, 1);
  assert.equal(view.points[0].px, 0);
  assert.equal(view.points[0].py, 0);
});

test("different arenas, evaluation tasks and search configurations never share one benchmark group", () => {
  const design = collection([
    benchmark({
      source: "design-arena",
      arena: "models",
      category: "website",
      elo: 1200,
    }),
    benchmark({
      source: "design-arena",
      arena: "models",
      category: "3d",
      elo: 900,
    }),
  ]);
  const initial = benchmarkView(design, { source: "design-arena" });
  assert.equal(initial.groups.length, 2);
  assert.equal(initial.points.length, 1);
  assert.equal(initial.points[0].py, 1200);
  const evaluations = collection([
    benchmark({
      source: "openrouter",
      benchmarkType: "gpqa",
      primaryMetric: null,
      searchEngine: "a",
      searchSurface: null,
      accuracy: 0.8,
      avgCostPerTask: 0.2,
    }),
    benchmark({
      source: "openrouter",
      benchmarkType: "gpqa",
      primaryMetric: null,
      searchEngine: "b",
      searchSurface: null,
      accuracy: 0.9,
      avgCostPerTask: 0.3,
    }),
  ]);
  const view = benchmarkView(evaluations, { source: "openrouter" });
  assert.equal(view.groups.length, 2);
  assert.equal(view.points.length, 1);
  assert.equal(view.price, "task");
  assert.equal(view.points[0].px, 0.2);
  assert.equal(view.points[0].py, 0.8);
});

test("a two-run price comparison does not become a fabricated date-range history", () => {
  const changes = collection(
    [
      {
        modelId: "vendor/free:free",
        transition: "became_paid",
        basePromptPrice: "0",
        baseCompletionPrice: "0",
        headPromptPrice: ".000001",
        headCompletionPrice: "0.000002",
      },
    ],
    { comparison: { baseRunId: "earlier-run", headRunId: "head-run" } },
  );
  const view = changeView({ changes, deprecations: collection([]) });
  assert.equal(view.points[0].date, "2026-09-09");
  assert.match(view.points[0].dateBasis, /exact change date is not published/);
  assert.match(view.priceCoverage, /not both run dates/);
  assert.equal(view.points[0].beforeInput, 0);
  assert.equal(
    view.points[0].afterInput,
    null,
    "Malformed decimals are unknown, never coerced",
  );
  assert.equal(view.points[0].afterOutput, 2);
  const empty = changeView({
    changes: collection([], {
      comparison: { baseRunId: "old", headRunId: "new" },
    }),
  });
  assert.match(empty.priceSummary, /latest two compared OpenRouter runs/);
  assert.equal(empty.points.length, 0);
  assert.match(
    changeView({
      changes: {
        ...collection([], {
          comparison: { baseRunId: "old", headRunId: "new" },
        }),
        hasMore: true,
      },
    }).priceSummary,
    /incomplete comparison slice/,
  );
  assert.match(changeView({}).priceSummary, /unavailable/);
});

test("the lifecycle timeline keeps unknown and far-future dates distinct from retirements in view", () => {
  const deprecations = collection([
    {
      modelId: "vendor/soon",
      state: "scheduled_deprecation",
      expirationDate: "2026-09-30",
      lastObservedAt: "2026-09-09T06:10:56Z",
    },
    {
      modelId: "vendor/far",
      state: "scheduled_deprecation",
      expirationDate: "2098-12-31",
      lastObservedAt: "2026-09-09T06:10:56Z",
    },
    {
      modelId: "vendor/invalid",
      state: "scheduled_deprecation",
      expirationDate: "2026-02-31",
    },
    {
      modelId: "vendor/ordinary",
      state: "no_announced_expiration",
      expirationDate: null,
    },
    {
      modelId: "vendor/unknown",
      state: "expiration_unknown",
      expirationDate: null,
    },
  ]);
  const view = changeView({ deprecations });
  assert.equal(view.points.length, 1);
  assert.equal(view.outsideRange, 1);
  assert.equal(view.undated, 1);
  assert.equal(view.noAnnouncedExpiration, 1);
  assert.match(view.points[0].dateBasis, /not confirmation/);
  assert.equal(changeView({ deprecations }, { range: "all" }).points.length, 2);
});

test("one failed source does not discard other evidence or masquerade as an empty success", async () => {
  const evidence = await loadEvidence({
    loader: async (path) => {
      if (path.startsWith("/price-changes"))
        throw Error("Price source unavailable");
      return collection([]);
    },
  });
  assert.equal(evidence.changes, null);
  assert.ok(evidence.benchmarks);
  assert.ok(evidence.deprecations);
  assert.deepEqual(evidence.errors, [
    { id: "changes", message: "Price source unavailable" },
  ]);
  assert.deepEqual(
    evidence.sources.map((row) => row.id),
    ["benchmarks", "deprecations"],
  );
});
