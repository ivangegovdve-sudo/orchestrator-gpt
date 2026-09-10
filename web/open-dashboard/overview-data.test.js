import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { contractEnvelope } from "../../node_modules/open-dashboard-mcp/build/contract.js";
import {
  FRONTIER_VIEWS,
  MCP_COVERAGE,
  PACKAGE_EVIDENCE,
  loadOverviewSupplemental,
  normalizeFreeFrontier,
  normalizeSourceHealth,
  normalizeTrending,
  normalizeMomentum,
  overviewHistorySeries,
  sourceSummary,
  summarizeOverview,
} from "./overview-data.js";

const envelope = (data) => ({
  data,
  cursor: null,
  stale: false,
  completeness: {
    acquisitionComplete: true,
    populationCompleteness: "requested_slice",
  },
  window: { end: "2026-09-10" },
  provenance: [],
});
function frontier(id, members = []) {
  const view = FRONTIER_VIEWS.find((row) => row.id === id);
  return envelope([
    {
      ruleVersion: "openrouter-free-pareto-v1",
      dimensions: {
        x: view.x,
        y: view.y,
        xDirection: view.xDirection,
        yDirection: view.yDirection,
      },
      members,
      excluded: [],
    },
  ]);
}
function momentum(category, data = []) {
  return {
    data,
    ranking: {
      category,
      metric: "momentum",
      windowDays: 7,
      entityLevel: "project-family",
      eligiblePopulation: 12,
      coverageExcluded: 2,
      baselineDate: "2026-09-03",
    },
    metricEvidence: [],
    page: { nextCursor: "more" },
    coverage: {
      resolvedAsOf: "2026-09-10",
      acquisitionComplete: true,
      stale: false,
    },
  };
}

test("overview's 16 discovery entries and package evidence match the installed contract", () => {
  const facts = JSON.parse(
    fs.readFileSync(new URL("./package-facts.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(
    MCP_COVERAGE.map((row) => row.id).sort(),
    facts.tools.map((row) => row.name).sort(),
  );
  assert.equal(MCP_COVERAGE.length, 16);
  assert.equal(
    MCP_COVERAGE.find((row) => row.id === "dashboard_key_inventory")
      .agentWorkflow,
    true,
  );
  assert.equal(PACKAGE_EVIDENCE.version, facts.version);
  assert.deepEqual(PACKAGE_EVIDENCE.priceUnits, facts.contract.priceUnits);
  assert.deepEqual(
    PACKAGE_EVIDENCE.conditionKinds,
    facts.contract.conditionKinds,
  );
  assert.deepEqual(
    [...PACKAGE_EVIDENCE.deprecations].sort((a, b) =>
      a.field.localeCompare(b.field),
    ),
    contractEnvelope().deprecations.sort((a, b) =>
      a.field.localeCompare(b.field),
    ),
  );
  assert.equal(PACKAGE_EVIDENCE.speed.numericRates, 0);
});

test("frontier validates exact axes, retains stale/excluded evidence and rejects ambiguous identities", () => {
  const raw = frontier("context-popularity", [
    { modelId: "provider/a:free", x: "128000", y: "1" },
    { modelId: "provider/b:free", x: null, y: "2" },
    { modelId: "provider/c:free", x: "256000", y: "3" },
    { modelId: "provider/c:free", x: "512000", y: "4" },
    { modelId: "provider/d:free", x: "64000", y: "0" },
  ]);
  raw.stale = true;
  raw.data[0].excluded = [
    { modelId: "provider/e:free", reason: "missing_contextLength" },
  ];
  const view = normalizeFreeFrontier(raw, "context-popularity");
  assert.deepEqual(
    view.members.map((row) => row.modelId),
    ["provider/a:free"],
  );
  assert.equal(view.source.stale, true);
  assert.equal(view.rejected.length, 4);
  assert.equal(view.reportedMembers, 5);
  assert.equal(view.excluded[0].reason, "missing_contextLength");
  assert.throws(
    () => normalizeFreeFrontier(raw, "quality-throughput"),
    /requested axes/,
  );
});

test("collection dates remain available without inventing a source-as-of date", () => {
  const meta = sourceSummary({
    data: [],
    hasMore: false,
    pages: [
      {
        window: { end: null },
        provenance: [
          { sourceAsOf: null, fetchedAt: "2026-09-09T06:10:00Z" },
          { sourceAsOf: null, fetchedAt: "2026-09-10T06:11:00Z" },
        ],
      },
    ],
  });
  assert.equal(meta.sourceAt, null);
  assert.equal(meta.collectedFrom, "2026-09-09T06:10:00Z");
  assert.equal(meta.collectedTo, "2026-09-10T06:11:00Z");
  assert.equal(meta.fetchedAt, "2026-09-10T06:11:00Z");
});

test("source health does not assign a failed newer run's coverage to an older publication", () => {
  const raw = envelope([
    {
      sourceId: "models_current",
      publishedRunId: "published-old",
      publishedAt: "2026-09-08T00:00:00Z",
      nextScheduledAt: "2026-09-09T00:00:00Z",
      lastAttemptRunId: "failed-new",
      lastAttemptStatus: "failed",
      lastAttemptStartedAt: "2026-09-09T00:05:00Z",
      lastAttemptFinishedAt: "2026-09-09T00:06:00Z",
      lastAttemptAcquisitionComplete: true,
      lastAttemptPopulationCompleteness: "full",
      consecutiveFailureCount: "2",
      stale: true,
    },
  ]);
  const health = normalizeSourceHealth(raw, new Date("2026-09-10T00:00:00Z"));
  assert.equal(health.sources[0].population, "unknown");
  assert.equal(health.sources[0].acquisitionComplete, false);
  assert.equal(health.sources[0].missedSchedule, false);
  assert.equal(health.failed, 1);
  assert.equal(health.stale, 1);
  assert.equal(health.sources[0].failureCount, 2);
  raw.data[0].lastAttemptRunId = "published-old";
  raw.data[0].lastAttemptStatus = "published";
  raw.data[0].lastAttemptStartedAt = raw.data[0].lastAttemptFinishedAt =
    "2026-09-08T00:00:00Z";
  const valid = normalizeSourceHealth(raw, new Date("2026-09-10T00:00:00Z"));
  assert.equal(valid.sources[0].population, "full");
  assert.equal(valid.delayed, 1);
  assert.equal(normalizeSourceHealth(null).total, null);
});

test("GitHub trending preserves null star gain and its actual collection freshness", () => {
  const raw = {
    data: [
      {
        fullName: "owner/project",
        url: "https://github.com/owner/project",
        stars: 12,
        forks: 0,
        starsGained: null,
      },
      { fullName: "bad", url: "javascript:alert(1)", stars: null },
    ],
    collectedAt: "2026-09-10T00:00:00Z",
    since: "daily",
    language: null,
    source: "direct",
  };
  const result = normalizeTrending(raw, new Date("2026-09-10T06:00:00Z"));
  assert.equal(result.repositories[0].starsGained, null);
  assert.equal(result.repositories[0].forks, 0);
  assert.equal(result.reportedCount, 2);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.stale, true);
  assert.throws(() => normalizeTrending({ ...raw, since: "weekly" }), /slice/);
});

test("momentum stays category/project-family scoped and missing deltas never become zero", () => {
  const raw = momentum("mcp", [
    {
      entityId: "family",
      repositoryId: "123",
      fullName: "owner/project",
      score: null,
      rank: 1,
    },
  ]);
  const result = normalizeMomentum(raw, "mcp");
  assert.equal(result.rows[0].value, null);
  assert.equal(result.rows[0].starDelta, null);
  assert.equal(result.eligiblePopulation, 12);
  assert.equal(result.hasMore, true);
  assert.throws(() => normalizeMomentum(raw, "inference"), /slice/);
});

test("catalogue groups partition exact provider IDs without alias conflation or missing-price coercion", () => {
  const models = [
    {
      provider: "openrouter",
      id: "openai/gpt-4o",
      modalities: ["text"],
      input: 2.5,
      output: 10,
      kind: "catalogue",
    },
    {
      provider: "crazyrouter",
      id: "gpt-4o",
      modalities: ["text"],
      input: null,
      output: null,
      kind: "catalogue",
    },
    {
      provider: "fal",
      id: "video",
      modalities: ["video"],
      input: 0,
      output: 0,
      kind: "media",
      pricePoints: [],
    },
    {
      provider: "fal",
      id: "mixed",
      modalities: ["text", "image"],
      input: null,
      output: null,
      kind: "media",
    },
    {
      provider: "sail",
      id: "unknown",
      modalities: [],
      input: null,
      output: null,
      kind: "catalogue",
    },
  ];
  const summary = summarizeOverview({ models });
  assert.equal(summary.catalogue.entries, 5);
  assert.equal(summary.catalogue.tokenQuotes, 1);
  assert.equal(
    summary.catalogue.partitions.reduce((sum, row) => sum + row.count, 0),
    5,
  );
  assert.equal(
    summary.catalogue.partitions.find((row) => row.id === "mixed").count,
    1,
  );
  assert.equal(
    summary.catalogue.partitions.find((row) => row.id === "unknown").count,
    1,
  );
  assert.equal(summary.catalogue.freePrices, 0);
  assert.equal(summary.health.available, false);
  assert.equal(summarizeOverview().catalogue.available, false);
});

test("history preview keeps same-name variants and category identities separate with explicit day gaps", () => {
  const bucket = (date, rows, complete = true) => ({ date, rows, complete });
  const history = {
    data: {
      modelUsage: [
        bucket("2026-09-01", [
          { id: "model-20260801", label: "Model", rank: 1, value: "10" },
        ]),
        bucket("2026-09-03", [
          { id: "model-20260901", label: "Model", rank: 1, value: "30" },
        ]),
      ],
      githubRanks: [
        bucket("2026-09-01", [
          { id: "same", scope: "a", label: "Same", rank: 1 },
          { id: "same", scope: "b", rank: 2 },
        ]),
        bucket("2026-09-03", [
          { id: "same", scope: "b", label: "Same", rank: 1 },
        ]),
      ],
    },
  };
  const summary = summarizeOverview({ history });
  const model = overviewHistorySeries(summary.histories[0]);
  assert.equal(summary.histories[0].entities, 2);
  assert.equal(model.id, "model-20260901");
  assert.deepEqual(
    model.points.map((point) => point.exact),
    [null, null, "30"],
  );
  const github = overviewHistorySeries(summary.histories[2]);
  assert.equal(summary.histories[2].entities, 2);
  assert.equal(github.scope, "b");
  assert.deepEqual(
    github.points.map((point) => point.exact),
    ["2", null, "1"],
  );
});

test("supplemental loading is bounded, preserves independent failures and performs no account or inference reads", async () => {
  let inFlight = 0,
    max = 0;
  const paths = [];
  const requester = async (path) => {
    paths.push(path);
    inFlight++;
    max = Math.max(max, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 2));
    inFlight--;
    if (path.startsWith("/free-frontiers"))
      return frontier(
        path.includes("contextLength")
          ? "context-popularity"
          : "quality-throughput",
      );
    if (path.startsWith("/github/trending"))
      throw new Error("Trending unavailable");
    const category = new URL(`https://example.test${path}`).searchParams.get(
      "category",
    );
    return momentum(category);
  };
  const result = await loadOverviewSupplemental({ requester });
  assert.equal(paths.length, 11);
  assert.ok(max <= 4);
  assert.ok(
    paths.every((path) =>
      /^\/(free-frontiers|github\/(rankings|trending))\?/.test(path),
    ),
  );
  assert.equal(result.frontiers.length, 2);
  assert.equal(result.momentum.categories.length, 8);
  assert.equal(result.trending.status, "unavailable");
  assert.deepEqual(result.errors, [
    { id: "trending", message: "Trending unavailable" },
  ]);
});
