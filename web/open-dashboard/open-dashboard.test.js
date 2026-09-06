import assert from "node:assert/strict";
import test from "node:test";

import { buildSourceRows, classifySourceState, datasetStatusLabel, installDeferredLoader, summarizeSourceRows } from "./open-dashboard.js";
import { isSyntheticEvidenceRecord } from "./open-dashboard-api.js";
import { validateOpenRouterCollection } from "./open-dashboard-schema.js";

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

test("distinguishes approval pending from disabled collection", () => {
  const pending = source({ publishedRunId: null, publishedAt: null, nextScheduledAt: null });
  assert.equal(classifySourceState(pending, { status: "unavailable", reason: "approval_incomplete" }), "approval-pending");
  assert.equal(classifySourceState(pending, { status: "unavailable", reason: "collection_disabled" }), "collection-disabled");
  const view = { mode: "live", snapshotStale: false, manifest: { sources: [pending] }, responses: { matrix: { status: "unavailable", reason: "approval_incomplete", provenance: [], stale: false } }, errors: {} };
  assert.equal(datasetStatusLabel(view, "matrix"), "Approval pending");
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
