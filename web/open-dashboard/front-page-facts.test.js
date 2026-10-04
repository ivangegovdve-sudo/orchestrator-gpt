import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  hostObservationLine,
  liveCatalogueFacts,
  modelHeadlineCount,
  priceHeadlineCount,
  sourceHealth,
  sourceHealthLine,
} from "./front-page-facts.js";

const model = (index, priced = false) => ({
  provider: "openrouter",
  id: `model-${index}`,
  pricePoints: priced ? [{ amount: "1" }] : [],
});

test("front-page counts follow the live catalogue and never pin 5,000+ below its evidence", () => {
  const catalogue = {
    models: Array.from({ length: 5_000 }, (_, index) => model(index, index < 2_700)),
  };
  const facts = liveCatalogueFacts(catalogue);
  assert.deepEqual(facts, { available: true, modelCount: 5_000, priceCount: 2_700 });
  assert.equal(modelHeadlineCount(facts.modelCount, facts.available), "5,000+");
  assert.equal(priceHeadlineCount(facts.priceCount, facts.available), "2,700");
  assert.equal(modelHeadlineCount(4_999, true), "4,999");
});

test("front-page counts distinguish an empty live result from an unavailable catalogue", () => {
  const empty = liveCatalogueFacts({ models: [] });
  assert.equal(modelHeadlineCount(empty.modelCount, empty.available), "0");
  assert.equal(priceHeadlineCount(empty.priceCount, empty.available), "0");
  const unavailable = liveCatalogueFacts(null);
  assert.equal(modelHeadlineCount(unavailable.modelCount, unavailable.available), "unavailable");
  assert.equal(priceHeadlineCount(unavailable.priceCount, unavailable.available), "unavailable");
});

test("source health keeps partial, stale, and unavailable sources explicit", () => {
  const catalogue = {
    providers: [
      { provider: "openrouter", status: "available" },
      { provider: "fal", status: "partial" },
      { provider: "sail", status: "partial", error: "PRICING_STALE" },
      { provider: "qwencloud", status: "unavailable" },
      { provider: "unknown", status: "mystery" },
    ],
  };
  const labels = { openrouter: "OpenRouter", fal: "fal", sail: "Sail", qwencloud: "QwenCloud" };
  assert.deepEqual(sourceHealth(catalogue, (id) => labels[id] || id), {
    total: 5,
    live: 3,
    notes: ["fal partial", "Sail stale", "QwenCloud unavailable", "unknown unavailable"],
  });
  assert.equal(
    sourceHealthLine(catalogue, (id) => labels[id] || id),
    "3 of 5 sources live — fal partial, Sail stale, QwenCloud unavailable, unknown unavailable",
  );
});

test("the dated three-host observation carries source, latency, Higgsfield, and error evidence per host", async () => {
  const observation = JSON.parse(
    await readFile(new URL("./host-observations.json", import.meta.url), "utf8"),
  );
  assert.equal(observation.hosts.length, 3);
  assert.match(hostObservationLine(observation), /^Prior 3-host observation: Oct 4, 2026\.$/);
  for (const host of observation.hosts) {
    assert.ok(Number.isFinite(Date.parse(host.observedAt)));
    assert.ok(host.modelCount >= 5_000);
    assert.ok(host.pricedModelCount >= 2_700);
    assert.ok(host.latencyMs.publicCatalogue > 0);
    assert.equal(host.sourceSummary.directSourceCount, 16);
    assert.equal(host.sourceSummary.liveSourceCount, 15);
    assert.deepEqual(host.sourceSummary.partialSources, ["fal"]);
    assert.deepEqual(host.sourceSummary.staleSources, ["sail"]);
    assert.deepEqual(host.sourceSummary.failedSources, []);
    assert.equal(host.higgsfield.status, "available");
    assert.equal(host.higgsfield.priceRowCount, 108);
    assert.equal(host.higgsfield.planRecordCount, 16);
    assert.deepEqual(host.errors, []);
  }
});
