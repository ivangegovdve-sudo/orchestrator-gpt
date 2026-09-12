import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMediaCatalogue,
  mediaPricingStatus,
  mediaPriceSeries,
} from "../media-data.js";
import {
  isAllowedPublicSource,
  publicMetadataFetch,
  projectSnapshot,
  sailDocumentCatalogue,
} from "./refresh-media.mjs";

const stamp = "2026-09-10T00:00:00.000Z";
const point = (unit, amount, condition = null) => ({
  id: `sample:${unit}:${amount}`,
  amount,
  unit,
  condition,
  source: { url: "https://fal.ai/pricing", readAt: stamp },
  provenance: "published",
});
const model = (id, points, mediaKind = "video") => ({
  provider: "fal",
  id,
  displayName: id,
  mediaKind,
  nativeType: "text-to-video",
  pricePoints: points,
  pricingState: points.length ? "published" : "unknown",
  provenance: {
    sourceUrl: "https://api.fal.ai/v1/models",
    observedAt: stamp,
    sourceIndex: 0,
  },
});

test("all native kinds are retained instead of silently applying a media-only filter", () => {
  const models = normalizeMediaCatalogue({
    models: [
      model("text", [], "text"),
      model("other", [], "other"),
      model("unclassified", [], "unknown"),
    ],
  });
  assert.equal(models.length, 3);
  assert.deepEqual(models[0].outputModalities, ["text"]);
  assert.deepEqual(models[2].outputModalities, []);
});

test("Sail document drift preserves documented IDs and withholds unverified prices", () => {
  const result = sailDocumentCatalogue(
    '<tbody data-model="vendor/model"><tr aria-label="ASAP pricing: input $1, cached $0.5, output $2 per 1M tokens."></tr></tbody>',
    stamp,
  );
  assert.equal(result.models[0].id, "vendor/model");
  assert.deepEqual(result.models[0].pricePoints, []);
  assert.equal(result.provider.status, "partial");
  assert.equal(
    result.provider.requestParameters.pricingAcquisitionStatus,
    "document_verification_failed",
  );
});

test("zero legacy token rates and absent media rates never become free media", () => {
  assert.equal(
    mediaPricingStatus({
      mediaKind: "video",
      inputPrice: 0,
      outputPrice: 0,
      isFree: true,
      pricePoints: [],
    }),
    "unknown",
  );
  assert.equal(
    mediaPricingStatus(
      model("token-only", [point("token_in", "0"), point("token_out", "0")]),
    ),
    "unknown",
  );
  assert.equal(
    mediaPricingStatus(model("paid", [point("video_second", "0.07")])),
    "paid",
  );
  assert.equal(
    mediaPricingStatus(model("explicit-zero", [point("video_second", "0")])),
    "zero_output_rate",
  );
});

test("native video and per-second points never share an axis or lose conditions", () => {
  const condition = { kind: "tier", name: "reference-output", threshold: "5" };
  const models = normalizeMediaCatalogue({
    models: [
      model("seconds", [point("video_second", "0.07", condition)]),
      model("whole-video", [point("video", "0.2")]),
    ],
  });
  const rows = mediaPriceSeries(models, {
    kind: "video",
    unit: "video_second",
  });
  assert.deepEqual(
    rows.map((row) => row.modelId),
    ["seconds"],
  );
  assert.deepEqual(rows[0].condition, condition);
  assert.equal(rows[0].amount, "0.07");
  assert.deepEqual(
    mediaPriceSeries(models, { kind: "image", unit: "video_second" }),
    [],
  );
});

test("native identity ambiguity is removed; invalid and unknown values never turn zero", () => {
  const models = normalizeMediaCatalogue({
    models: [
      model("duplicate", []),
      model("duplicate", [point("video_second", "1")]),
      model("missing", []),
      model("bad", [point("video_second", "-1"), point("video_second", "NaN")]),
    ],
  });
  assert.deepEqual(
    models.map((row) => row.id),
    ["missing", "bad"],
  );
  assert.deepEqual(models[1].pricePoints, []);
  assert.equal(models[1].pricingState, "unknown");
});

test("refresh blocks authenticated, mutation, inference, and redirected source surfaces", async () => {
  assert.equal(isAllowedPublicSource("https://api.fal.ai/v1/models"), true);
  assert.equal(
    isAllowedPublicSource("https://api.fal.ai/v1/models/pricing"),
    false,
  );
  assert.equal(isAllowedPublicSource("https://fal.run/model"), false);
  assert.equal(
    isAllowedPublicSource("https://user:password@fal.ai/pricing"),
    false,
  );
  const calls = [];
  const safeFetch = publicMetadataFetch(async (...args) => {
    calls.push(args);
    return {};
  });
  await assert.rejects(
    safeFetch("https://fal.ai/pricing", {
      headers: { Authorization: "test-fixture" },
    }),
    /PUBLIC_METADATA_ONLY/,
  );
  await assert.rejects(
    safeFetch("https://fal.ai/pricing", { method: "POST" }),
    /PUBLIC_METADATA_ONLY/,
  );
  await safeFetch("https://fal.ai/pricing");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].redirect, "error");
  assert.equal(calls[0][1].credentials, "omit");
});

test("snapshot keeps output reference notes and source dates while excluding raw payloads", () => {
  const image = model("image-one", [point("image", "0.03")], "image");
  image.nativePricing = {
    value: "0.03",
    unit: "image",
    unexpectedBlob: "must-not-export",
  };
  const snapshot = projectSnapshot(
    [
      {
        models: [image],
        provider: {
          provider: "fal",
          status: "available",
          sourceUrl: "https://api.fal.ai/v1/models",
          observedAt: stamp,
          population: { completeness: "full" },
          requestParameters: {},
        },
      },
    ],
    stamp,
  );
  assert.equal(snapshot.models[0].fetchedAt, stamp);
  assert.match(snapshot.models[0].sourceNotes[0], /1-megapixel/);
  assert.equal(JSON.stringify(snapshot).includes("must-not-export"), false);
  assert.equal(snapshot.models[0].pricingNote, null);
});
