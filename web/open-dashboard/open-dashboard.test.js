import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildSourceRows, classifySourceState, datasetStatusLabel, installDeferredLoader, summarizeSourceRows } from "./open-dashboard.js";
import { isSyntheticEvidenceRecord } from "./open-dashboard-api.js";
import * as charts from "./open-dashboard-charts.js";
import { validateOpenRouterCollection } from "./open-dashboard-schema.js";

test("does not mount an unexplained relationship canvas on the overview page", async () => {
  const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /id="oo-network-region"/);
});

const source = (overrides = {}) => ({
  sourceId: "models_current",
  sourceTier: "stable",
  cadenceSeconds: 86400,
  staleAfterSeconds: 172800,
  publishedRunId: "11111111-1111-4111-8111-111111111111",
  publishedAt: "2026-09-04T06:13:38.448Z",
  nextScheduledAt: "2026-09-05T06:13:38.448Z",
  stale: false,
  transformVersion: "test-v1",
  citationUrl: null,
  lastAttemptRunId: "22222222-2222-4222-8222-222222222222",
  lastAttemptStatus: "published",
  lastAttemptStartedAt: "2026-09-04T06:12:00.000Z",
  lastAttemptFinishedAt: "2026-09-04T06:13:00.000Z",
  lastAttemptErrorCode: null,
  lastAttemptAcquisitionComplete: true,
  lastAttemptPopulationCompleteness: "full",
  ...overrides,
});

test("classifies a missed daily refresh even before the 48-hour stale threshold", () => {
  assert.equal(classifySourceState(source(), null, { now: new Date("2026-09-05T14:33:00Z") }), "published-but-old");
  assert.equal(classifySourceState(source(), null, { now: new Date("2026-09-05T05:00:00Z") }), "current");
});

test("keeps never-published and failed evidence visible", () => {
  const failed = source({ publishedRunId: null, publishedAt: null, nextScheduledAt: null, lastAttemptStatus: "failed", lastAttemptErrorCode: "OPENROUTER_COLLECTOR_FAILED" });
  assert.equal(classifySourceState(failed, null, { now: new Date("2026-09-05T14:33:00Z") }), "never-published");
  const view = { mode: "live", snapshotStale: false, manifest: { sources: [failed] }, responses: {}, errors: {} };
  const row = buildSourceRows(view, { now: new Date("2026-09-05T14:33:00Z") })[0];
  assert.equal(row.state, "never-published");
  assert.match(row.statusNote, /last attempt failed.*OPENROUTER_COLLECTOR_FAILED/);
  assert.deepEqual(summarizeSourceRows([row]), { freshness: "unavailable", completeness: "unavailable", status: "never-published" });
});

test("surfaces consecutive failures and an old last-success timestamp", () => {
  const failed = source({
    publishedAt: "2026-09-01T06:00:00.000Z",
    lastAttemptStatus: "failed",
    lastAttemptStartedAt: "2026-09-03T06:00:00.000Z",
    lastAttemptFinishedAt: "2026-09-03T06:01:00.000Z",
    consecutiveFailureCount: "3",
    lastSuccessAt: "2026-09-01T06:00:00.000Z",
    failureEscalationThreshold: 2,
    failureEscalated: true,
  });
  const row = buildSourceRows({ mode: "live", snapshotStale: false, manifest: { sources: [failed] }, responses: {}, errors: {} }, { now: new Date("2026-09-04T06:02:00.000Z") })[0];

  assert.equal(row.state, "failed");
  assert.equal(row.freshness, "unavailable");
  assert.match(row.statusNote, /3 consecutive failures.*escalation threshold reached/);
  assert.match(row.statusNote, /last successful collection: 3 days ago/);
});

test("distinguishes approval pending from disabled collection", () => {
  const pending = source({ publishedRunId: null, publishedAt: null, nextScheduledAt: null });
  assert.equal(classifySourceState(pending, { status: "unavailable", reason: "approval_incomplete" }), "approval-pending");
  assert.equal(classifySourceState(pending, { status: "unavailable", reason: "collection_disabled" }), "collection-disabled");
  const view = { mode: "live", snapshotStale: false, manifest: { sources: [pending] }, responses: { matrix: { status: "unavailable", reason: "approval_incomplete", provenance: [], stale: false } }, errors: {} };
  assert.equal(datasetStatusLabel(view, "matrix"), "Approval pending");
});

test("surfaces named reviewed-alias drift on the public source rail", () => {
  const drifted = source({
    sourceId: "apps_ranked",
    aliasRegistryDrift: {
      status: "registry_stale",
      checkedAt: "2026-09-08T00:00:00.000Z",
      rankingAsOf: "2026-09-07T00:00:00.000Z",
      registryPublishedAt: "2026-07-15T00:00:00.000Z",
      uncovered: [{ appId: "4", appName: "Zazen", rank: 4 }],
      dropped: [{ appId: "9", appName: "Former App" }],
      uncoveredCount: 1,
      droppedCount: 1,
      errorCode: null,
    },
  });
  const view = { mode: "live", snapshotStale: false, manifest: { sources: [drifted] }, responses: {}, errors: {} };
  const row = buildSourceRows(view, { now: new Date("2026-09-04T06:02:00.000Z") })[0];
  assert.equal(row.state, "registry-stale");
  assert.equal(row.freshness, "stale");
  assert.match(row.statusNote, /reviewed app registry stale/);
  assert.match(row.statusNote, /Zazen/);
  assert.match(row.statusNote, /Former App/);
});

test("keeps observed, checked-absent, unknown, and missing matrix states distinct", () => {
  assert.equal(typeof charts.matrixStateCounts, "function");
  assert.equal(typeof charts.matrixCellModel, "function");
  if (typeof charts.matrixStateCounts !== "function" || typeof charts.matrixCellModel !== "function") return;
  const cells = [
    { state: "observed", appId: "1", modelId: "a", totalTokens: "10", rankWithinPeriod: 1, evidenceUrl: "https://example.com/a" },
    { state: "unknown", reason: "not_observed", appId: "1", modelId: "b" },
    { state: "unknown", reason: "not_published", appId: "2", modelId: "a" },
  ];
  assert.deepEqual(charts.matrixStateCounts({ appIds: ["1", "2"], modelIds: ["a", "b"], cells }), { observed: 1, notObserved: 1, unknown: 1, notPublished: 1, missing: 1 });
  assert.equal(charts.matrixCellModel(cells[0]).state, "observed");
  assert.equal(charts.matrixCellModel(cells[1]).state, "not_observed");
  assert.equal(charts.matrixCellModel(cells[1]).label, "0");
  assert.equal(charts.matrixCellModel(cells[2]).state, "unknown");
  assert.equal(charts.matrixCellModel(cells[2]).variant, "not_published");
  assert.equal(charts.matrixCellModel(cells[2]).label, "N/P");
});

test("orders flow axes by exact observed totals and retains exact token strings", () => {
  assert.equal(typeof charts.appModelFlowGeometry, "function");
  if (typeof charts.appModelFlowGeometry !== "function") return;
  const response = {
    appIds: ["1", "2"],
    modelIds: ["a", "b"],
    apps: [{ appId: "1", appName: "Small" }, { appId: "2", appName: "Large" }],
    models: [{ modelId: "a", modelName: "Model A" }, { modelId: "b", modelName: "Model B" }],
    cells: [
      { state: "observed", appId: "1", modelId: "a", totalTokens: "9007199254740993000", rankWithinPeriod: 1, evidenceUrl: "https://example.com/1a" },
      { state: "observed", appId: "2", modelId: "b", totalTokens: "9007199254740994000", rankWithinPeriod: 1, evidenceUrl: "https://example.com/2b" },
      { state: "unknown", appId: "1", modelId: "b", reason: "not_observed" },
      { state: "unknown", appId: "2", modelId: "a", reason: "not_published" },
    ],
  };
  const geometry = charts.appModelFlowGeometry(response);
  assert.deepEqual(geometry.apps.map((row) => row.label), ["Large", "Small"]);
  assert.deepEqual(geometry.models.map((row) => row.label), ["Model B", "Model A"]);
  assert.equal(geometry.apps[0].totalTokens, "9007199254740994000");
  assert.equal(geometry.links[0].totalTokens, "9007199254740994000");
  assert.equal(geometry.totalTokens, "18014398509481987000");
  assert.equal(typeof geometry.links[0].widthBasisPoints, "bigint");
});

test("accepts a public OpenRouter benchmark row", () => {
  const response = validateOpenRouterCollection({
    schemaVersion: "2.0",
    data: [{ source: "openrouter", modelPermaslug: "vendor/model", displayName: "Model", matchStatus: "unmatched", pricing: { prompt: null, completion: null }, citation: "OpenRouter", sourceUrl: null, benchmarkType: "gpqa_diamond", primaryMetric: null, primaryScore: null, accuracy: null, accuracyStddev: null, avgCostPerTask: null, avgLatencyPerTaskMs: null, totalTasks: null, lastRunTimestamp: null, searchEngine: null, searchSurface: null }],
    cursor: null,
    window: { start: null, end: null, timezone: "unknown", inclusive: null, basis: "source_meta" },
    completeness: { acquisitionComplete: true, populationCompleteness: "requested_slice", missingFields: [] },
    stale: false,
    rank: null,
    provenance: [],
  }, "benchmarks");
  assert.equal(response.data[0].source, "openrouter");
});
test("starts every deferred panel when the observer is unavailable", async () => {
  const targets = Array.from({ length: 11 }, () => ({ dataset: {} }));
  let calls = 0;
  globalThis.IntersectionObserver = undefined;

  installDeferredLoader({ targets, load: async () => { calls += 1; } });

  assert.deepEqual(targets.map((target) => target.dataset.deferredState), Array(11).fill("loading"));
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.deepEqual(targets.map((target) => target.dataset.deferredState), Array(11).fill("ready"));
});

test("does not classify real Seedance provider provenance as fixture evidence", () => {
  assert.equal(isSyntheticEvidenceRecord({
    sourceId: "openrouter.providers.Ynl0ZWRhbmNlL3NlZWRhbmNlLTEtNS1wcm8",
    transformVersion: "openrouter-provider-endpoints-v1",
    citation: "https://openrouter.ai/bytedance/seedance-1.5-pro/providers",
  }), false);
  assert.equal(isSyntheticEvidenceRecord({ sourceId: "fixture.models_current" }), true);
  assert.equal(isSyntheticEvidenceRecord({ transformVersion: "deterministic-preview-snapshot-v1" }), true);
});
