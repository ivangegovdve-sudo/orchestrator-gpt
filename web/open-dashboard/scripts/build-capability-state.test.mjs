import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const target = new URL("../capability-state.json", import.meta.url);

test("capability export keeps live rows and selection blockers explicit", async () => {
  const state = JSON.parse(await readFile(target, "utf8"));
  assert.equal(state.status, "ok");
  assert.equal(state.schemaVersion, "1.0");
  assert.equal(state.scope.definition, "one row per available live model slug");
  assert.ok(state.rows.length > 0);
  assert.ok(state.rows.every((row) => row.catalogueAvailability?.value === "available"));
  assert.ok(state.rows.every((row) => row.costPerGeneration?.state === "unknown" || row.costPerGeneration?.state === "known"));
  assert.ok(state.rows.every((row) => row.reachability?.state === "unknown" || row.reachability?.state === "live" || row.reachability?.state === "rate_limited"));
  assert.ok(Array.isArray(state.providers) && state.providers.some((provider) => provider.id === "nous" && provider.directAdapter === true));
  assert.equal(state.queries.publicCouncil.rule, "literal_cheapest_paid");
  assert.equal(state.queries.innerObserver.rule, "cheapest_functional");
  assert.equal(state.workload.sampleSize, 0);
});
