// The manifest validator rejected the whole page over a tier the API is
// contractually allowed to send.
//
// On 2026-09-03 sdforest.site/web/open-dashboard/ rendered nothing but
// "Open Dashboard unavailable ... manifest source tier must be stable and
// source state must be valid". Two of eight sources -- groq_models_current
// and cerebras_models_current -- carry sourceTier "supported", which the
// producer's own published schema for this endpoint permits
// (openrouter-schemas.ts: z.enum(["stable", "supported"])). The file already
// declared the right vocabulary in SOURCE_TIERS and used it for provenance,
// then hardcoded `!== "stable"` for the manifest.
//
// The fixture is the real production payload, so this test fails for the
// reason production failed rather than for a shape I invented.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const ROUTE = path.join(ROOT, "web", "open-dashboard");
const importRoute = (file) =>
  import(pathToFileURL(path.join(ROUTE, file)).href + `?t=${Date.now()}-${Math.random()}`);
const fixture = () =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixtures", "manifest-production-2026-09-03.json"), "utf8"),
  );

test("the fixture still exercises a non-stable tier", () => {
  // Without this the suite could keep passing while silently testing nothing,
  // if the captured manifest ever drifts to all-stable.
  const tiers = new Set(fixture().sources.map((source) => source.sourceTier));
  assert.ok(tiers.has("supported"), `fixture must contain a supported-tier source, saw ${[...tiers]}`);
  assert.ok(tiers.has("stable"), "fixture should still contain a stable-tier source");
});

test("a supported-tier source does not take the whole page down", async () => {
  const { validateManifest } = await importRoute("open-dashboard-schema.js");
  const manifest = validateManifest(fixture(), "2");
  assert.equal(manifest.sources.length, 8);
  const groq = manifest.sources.find((source) => source.sourceId === "groq_models_current");
  assert.equal(groq.sourceTier, "supported");
});

test("best_effort validates too, matching SOURCE_TIERS and the archive contract", async () => {
  const { validateManifest } = await importRoute("open-dashboard-schema.js");
  const raw = fixture();
  raw.sources[0].sourceTier = "best_effort";
  assert.equal(validateManifest(raw, "2").sources[0].sourceTier, "best_effort");
});

test("an unrecognised tier is still refused -- widening is not disabling", async () => {
  const { validateManifest } = await importRoute("open-dashboard-schema.js");
  const raw = fixture();
  raw.sources[0].sourceTier = "experimental";
  assert.throws(() => validateManifest(raw, "2"), /tier/i);
});

test("a non-boolean stale is still refused", async () => {
  const { validateManifest } = await importRoute("open-dashboard-schema.js");
  const raw = fixture();
  raw.sources[0].stale = "false";
  assert.throws(() => validateManifest(raw, "2"), /stale|state/i);
});

test("the refusal names the offending source and value", async () => {
  // The production message named neither, which is why a page-wide outage
  // took a manifest diff to explain rather than a glance.
  const { validateManifest } = await importRoute("open-dashboard-schema.js");
  const raw = fixture();
  raw.sources[3].sourceTier = "experimental";
  try {
    validateManifest(raw, "2");
    assert.fail("expected the manifest to be refused");
  } catch (error) {
    assert.match(error.message, /experimental/, "message should quote the offending value");
    assert.match(error.message, new RegExp(raw.sources[3].sourceId), "message should name the source");
  }
});

test("a failed source does not by itself invalidate the manifest", async () => {
  // benchmarks_current has lastAttemptStatus "failed" and a null publishedAt
  // in the fixture. It was the obvious suspect and it was not the cause; the
  // page must render around it.
  const { validateManifest } = await importRoute("open-dashboard-schema.js");
  const manifest = validateManifest(fixture(), "2");
  const benchmarks = manifest.sources.find((source) => source.sourceId === "benchmarks_current");
  assert.equal(benchmarks.lastAttemptStatus, "failed");
  assert.equal(benchmarks.publishedAt, null);
  assert.equal(benchmarks.stale, true);
});
