import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareAtlas,
  buildAtlasLayout,
  nearestAtlasPoint,
  atlasPriceLabel,
  atlasStepIndex,
} from "./atlas.js";

const model = (id, input, context, extra = {}) => ({
  id,
  key: `test:${id}`,
  name: id,
  provider: "test",
  kind: "catalogue",
  modalities: ["text"],
  input,
  output: 2,
  context,
  ...extra,
});

test("stepping from an unplotted selection enters the first or last plotted model", () => {
  assert.equal(atlasStepIndex(-1, 1, 5), 0);
  assert.equal(atlasStepIndex(-1, -1, 5), 4);
  assert.equal(atlasStepIndex(0, 1, 5), 1);
  assert.equal(atlasStepIndex(4, -1, 5), 3);
  assert.equal(atlasStepIndex(0, -1, 5), 0);
  assert.equal(atlasStepIndex(4, 1, 5), 4);
  assert.equal(atlasStepIndex(-1, 1, 0), -1);
  assert.equal(atlasStepIndex(-1, -1, 1), 0);
});

test("unknown prices, unknown context, and native media do not acquire false coordinates", () => {
  const data = prepareAtlas([
    model("priced", "0.25", 128000),
    model("zero-input", 0, 32000),
    model("missing-price", null, 32000),
    model("blank-price", "", 32000),
    model("missing-context", 2, null),
    model("zero-context", 2, 0),
    model("negative-price", -1, 32000),
    model("media", 0, 32000, { kind: "media", modalities: ["image"] }),
  ]);
  assert.equal(data.total, 8);
  assert.equal(data.plotted, 2);
  assert.equal(data.zeroInput, 1);
  assert.equal(data.excluded, 6);
  assert.equal(data.nativeMedia, 1);
  assert.deepEqual(
    data.points.map((p) => p.id),
    ["zero-input", "priced"],
  );
});

test("zero input is an explicit lane, never fed through a logarithm", () => {
  const data = prepareAtlas([
    model("zero", 0, 32000),
    model("low", 0.01, 32000),
    model("high", 10, 32000),
  ]);
  const scene = buildAtlasLayout(data, 800, 440);
  const zero = scene.points.find((p) => p.model.id === "zero");
  assert.equal(zero.x, scene.zeroX);
  assert.ok(zero.x < scene.paidLeft);
  assert.ok(
    scene.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  );
});

test("equal cost ratios have equal screen intervals and more context moves upward", () => {
  const data = prepareAtlas([
    model("a", 0.1, 1000),
    model("b", 1, 10000),
    model("c", 10, 100000),
  ]);
  const { points } = buildAtlasLayout(data, 800, 440);
  assert.ok(
    Math.abs(points[1].x - points[0].x - (points[2].x - points[1].x)) < 1e-8,
  );
  assert.ok(points[0].y > points[1].y && points[1].y > points[2].y);
});

test("exact duplicate coordinates are retained without invented jitter or dropped identities", () => {
  const data = prepareAtlas([model("b", 1, 128000), model("a", 1, 128000)]);
  const scene = buildAtlasLayout(data, 800, 440);
  assert.equal(scene.points.length, 2);
  assert.equal(scene.points[0].x, scene.points[1].x);
  assert.equal(scene.points[0].y, scene.points[1].y);
  assert.equal(scene.points[0].model.id, "a");
  assert.equal(
    nearestAtlasPoint(scene, scene.points[0].x, scene.points[0].y),
    0,
  );
});

test("spatial picking obeys a bounded hit radius and ignores distant blank space", () => {
  const scene = buildAtlasLayout(
    prepareAtlas([model("a", 1, 128000)]),
    800,
    440,
  );
  const point = scene.points[0];
  assert.equal(nearestAtlasPoint(scene, point.x + 19, point.y, 22), 0);
  assert.equal(nearestAtlasPoint(scene, point.x + 23, point.y, 22), -1);
  assert.equal(nearestAtlasPoint(scene, 0, 0, 22), -1);
});

test("mobile recalculates tick density and preserves the entire data domain", () => {
  const data = prepareAtlas([
    model("low", 0.00001, 1000),
    model("high", 10000, 1000000),
  ]);
  const desktop = buildAtlasLayout(data, 800, 440),
    mobile = buildAtlasLayout(data, 280, 380);
  assert.ok(mobile.xTicks.length < desktop.xTicks.length);
  for (const scene of [desktop, mobile])
    for (const point of scene.points) {
      assert.ok(point.x >= scene.plot.left && point.x <= scene.plot.right);
      assert.ok(point.y >= scene.plot.top && point.y <= scene.plot.bottom);
    }
});

test("empty and zero-input-only collections remain finite and honest", () => {
  const empty = buildAtlasLayout(prepareAtlas([]), 280, 380);
  assert.equal(empty.points.length, 0);
  assert.ok(empty.xTicks.every((t) => Number.isFinite(t.position)));
  const free = buildAtlasLayout(
    prepareAtlas([model("free", 0, 32000)]),
    280,
    380,
  );
  assert.ok(Number.isFinite(free.points[0].x));
  assert.equal(free.points[0].x, free.zeroX);
});

test("small positive rates are never formatted as a false zero", () => {
  assert.equal(atlasPriceLabel(0), "$0");
  assert.equal(atlasPriceLabel(null), "Unknown");
  assert.notEqual(atlasPriceLabel(0.00000005), "$0");
  assert.equal(atlasPriceLabel(0.00000005), "$5e-8");
});

test("log ticks stay at powers of ten, retain domain ends, and respect mobile density", () => {
  const data = prepareAtlas([
    model("low", 0.001, 100),
    model("high", 1000, 10000000),
  ]);
  for (const width of [280, 800]) {
    const scene = buildAtlasLayout(data, width, 440);
    assert.ok(scene.xTicks.length <= (width < 480 ? 3 : 5));
    assert.ok(scene.yTicks.length <= (width < 480 ? 4 : 5));
    for (const tick of [...scene.xTicks, ...scene.yTicks])
      assert.ok(
        Math.abs(Math.log10(tick.value) - Math.round(Math.log10(tick.value))) <
          1e-10,
      );
    assert.equal(scene.xTicks[0].value, 0.001);
    assert.equal(scene.xTicks.at(-1).value, 1000);
    assert.equal(scene.yTicks.at(-1).value, 10000000);
  }
});

test("large price ticks use compact readable currency labels", () => {
  assert.equal(atlasPriceLabel(0.01), "$0.01");
  assert.equal(atlasPriceLabel(1), "$1");
  assert.equal(atlasPriceLabel(100), "$100");
  assert.equal(atlasPriceLabel(1000), "$1k");
  assert.equal(atlasPriceLabel(1000000), "$1M");
});
