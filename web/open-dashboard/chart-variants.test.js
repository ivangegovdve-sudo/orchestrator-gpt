import test from "node:test";
import assert from "node:assert/strict";
import {
  modelBreakdown,
  appBreakdown,
  historyStackData,
  rankHistoryData,
} from "./chart-variants.js";

const model = (provider, id, modalities = ["text"]) => ({
  provider,
  id,
  key: `${provider}:${id}`,
  name: id,
  modalities,
});
test("catalogue composition counts distinct provider identities and exclusive modality combinations", () => {
  const rows = [
    model("a", "same"),
    model("b", "same", ["image", "text"]),
    model("a", "other", []),
    model("a", "same"),
  ];
  const providers = modelBreakdown(rows);
  assert.equal(providers.total, "3");
  assert.equal(providers.duplicateCount, 1);
  assert.deepEqual(
    providers.groups.map((g) => [g.id, g.value]),
    [
      ["a", "2"],
      ["b", "1"],
    ],
  );
  const modalities = modelBreakdown(rows, { groupBy: "modality" });
  assert.equal(
    modalities.groups.reduce((n, g) => n + Number(g.value), 0),
    3,
  );
  assert.ok(
    modalities.groups.some(
      (g) => g.id === "image+text" && g.members.length === 1,
    ),
  );
  assert.ok(
    modalities.groups.some((g) => g.id === "unknown" && g.value === "1"),
  );
  assert.match(modalities.denominatorLabel, /provider-specific/);
});
test("Other retains every group and uses the same denominator", () => {
  const rows = Array.from({ length: 12 }, (_, i) => model(`p${i}`, `id${i}`));
  const view = modelBreakdown(rows, { maxSlices: 7 });
  assert.equal(view.slices.length, 7);
  assert.equal(
    view.slices.reduce((n, s) => n + BigInt(s.value), 0n),
    BigInt(view.total),
  );
  const other = view.slices.find((s) => s.isOther);
  assert.equal(other.memberGroups.length, 6);
  assert.equal(other.members.length, 6);
  assert.equal(
    new Set(view.slices.flatMap((s) => s.members.map((m) => m.key))).size,
    12,
  );
  assert.ok(
    Math.abs(view.slices.reduce((n, s) => n + s.percent, 0) - 100) < 0.001,
  );
});
test("app shares use exact known selected-app totals, never global market share or missing zero", () => {
  const rows = [
    { appId: "a", appName: "A", totalTokens: "9007199254740993" },
    { appId: "b", appName: "B", totalTokens: "7" },
    { appId: "c", appName: "Missing", totalTokens: null },
    { appId: "d", appName: "Zero", totalTokens: "0" },
  ];
  const view = appBreakdown(rows);
  assert.equal(view.total, "9007199254741000");
  assert.equal(view.omitted, 1);
  assert.equal(view.groups.find((g) => g.id === "d").value, "0");
  assert.match(view.denominatorLabel, /selected apps/);
  assert.equal(appBreakdown(rows.slice(1, 2)).total, "7");
  assert.equal(
    appBreakdown([{ ...rows[0], totalTokens: 9007199254740992 }]).groups.length,
    0,
  );
});
test("ambiguous duplicate app records are excluded rather than double counted", () => {
  const result = appBreakdown([
    { appId: "x", appName: "X", totalTokens: "1" },
    { appId: "x", appName: "X", totalTokens: "2" },
  ]);
  assert.equal(result.total, "0");
  assert.equal(result.groups.length, 0);
  assert.equal(result.omitted, 2);
});
test("known zero totals do not manufacture percentages for an empty denominator", () => {
  const result = appBreakdown([
    { appId: "z", appName: "Known zero", totalTokens: "0" },
  ]);
  assert.equal(result.total, "0");
  assert.equal(result.groups[0].value, "0");
  assert.equal(result.groups[0].percent, null);
});
const row = (id, value, extra = {}) => ({
  id,
  label: id,
  value,
  remainder: null,
  ...extra,
});
const day = (date, rows, complete = true) => ({ date, rows, complete });
test("daily stacks retain exact source totals and count published remainder only once", () => {
  const result = historyStackData(
    [
      day("2026-09-01", [
        row("a", "9007199254740993"),
        row("b", "4"),
        row("other", "3", { remainder: "3" }),
      ]),
    ],
    { maxSeries: 2 },
  );
  const d = result.buckets[0];
  assert.equal(d.total, "9007199254741000");
  assert.equal(
    d.segments.reduce((n, s) => n + BigInt(s.value), 0n),
    BigInt(d.total),
  );
  const other = d.segments.find((s) => s.isOther);
  assert.equal(other.value, "7");
  assert.deepEqual(other.memberIds, ["b", "other"]);
  assert.equal(other.hasSourceRemainder, true);
});
test("daily stacks preserve missing and incomplete dates as gaps", () => {
  const result = historyStackData([
    day("2026-09-01", [row("a", "0")]),
    day("2026-09-03", [row("a", "20")], false),
    day("2026-09-04", [row("a", null)]),
  ]);
  assert.deepEqual(
    result.buckets.map((d) => d.total),
    ["0", null, null, null],
  );
  assert.deepEqual(
    result.buckets.map((d) => d.complete),
    [true, false, false, false],
  );
  assert.equal(result.buckets[1].segments.length, 0);
  assert.equal(result.buckets[3].gapReason, "unknown_total");
});
test("selected model missing on a complete day is not synthesized as zero", () => {
  const result = historyStackData(
    [day("2026-09-01", [row("a", "5")]), day("2026-09-02", [row("b", "7")])],
    { chosen: "a" },
  );
  assert.equal(result.buckets[0].total, "5");
  assert.equal(result.buckets[1].total, null);
  assert.equal(result.buckets[1].gapReason, "model_not_observed");
});
test("stack order and colors stay stable when source ranks reorder between days", () => {
  const result = historyStackData(
    [
      day("2026-09-01", [row("a", "5"), row("b", "3")]),
      day("2026-09-02", [row("b", "9"), row("a", "2")]),
    ],
    { maxSeries: 3 },
  );
  assert.deepEqual(
    result.buckets[0].segments.map((s) => s.id),
    ["b", "a"],
  );
  assert.deepEqual(
    result.buckets[1].segments.map((s) => s.id),
    ["b", "a"],
  );
  assert.deepEqual(
    result.buckets[0].segments.map((s) => s.color),
    result.buckets[1].segments.map((s) => s.color),
  );
});
test("main stack series follow exact aggregate observed tokens, not frequency or source remainder", () => {
  const result = historyStackData(
    [
      day("2026-09-01", [
        row("frequent", "1"),
        row("b", "9007199254740992"),
        row("other", "99999999999999999999", {
          remainder: "99999999999999999999",
        }),
      ]),
      day("2026-09-02", [row("frequent", "1"), row("a", "9007199254740993")]),
      day(
        "2026-09-03",
        [row("frequent", "1"), row("unpublished", "999999999999999999999")],
        false,
      ),
      day("2026-09-04", [row("frequent", "1"), row("c", "9007199254740992")]),
    ],
    { maxSeries: 3 },
  );
  assert.deepEqual(
    result.series.filter((s) => !s.isOther).map((s) => s.id),
    ["a", "b"],
  );
  assert.equal(result.buckets[2].total, null);
  for (const bucket of result.buckets.filter((b) => b.total !== null)) {
    assert.equal(
      bucket.segments.reduce((sum, s) => sum + BigInt(s.value), 0n),
      BigInt(bucket.total),
    );
    assert.equal(
      bucket.segments.flatMap((s) => s.members).length,
      bucket.observations.length,
    );
  }
  assert.ok(
    result.buckets[0].segments.find((s) => s.isOther).hasSourceRemainder,
  );
  assert.ok(
    result.buckets[3].segments.find((s) => s.isOther).memberIds.includes("c"),
  );
});
test("duplicate days and duplicate model observations cannot become valid daily totals", () => {
  const duplicated = historyStackData([
    day("2026-09-01", [row("a", "1")]),
    day("2026-09-01", [row("a", "1")]),
  ]);
  assert.equal(duplicated.buckets[0].complete, false);
  const rows = historyStackData([
    day("2026-09-01", [row("a", "1"), row("a", "2")]),
  ]);
  assert.equal(rows.buckets[0].total, null);
  assert.equal(rows.buckets[0].gapReason, "ambiguous_rows");
});
test("rank history isolates category scopes and plots rank rather than token or popularity values", () => {
  const input = [
    day("2026-09-01", [
      row("repo", "0.95", { scope: "a", rank: 1 }),
      row("repo", "0.25", { scope: "b", rank: 4 }),
    ]),
    day("2026-09-03", [row("repo", "0.15", { scope: "a", rank: 3 })]),
  ];
  const result = rankHistoryData(input, { chosen: "repo", scope: "a" });
  assert.deepEqual(
    result.scopes.map((s) => s.id),
    ["a", "b"],
  );
  assert.equal(result.scope, "a");
  assert.deepEqual(
    result.series[0].points.map((p) => p.rank),
    [1, null, 3],
  );
  assert.equal(result.series[0].points[0].value, "1");
  assert.equal(result.series[0].points[0].sourceValue, "0.95");
  assert.equal(
    rankHistoryData(input, { chosen: "repo", scope: "b" }).series[0].points[0]
      .rank,
    4,
  );
});
test("rank unknowns, incomplete dates and ambiguous rows are gaps, never last place or zero", () => {
  const result = rankHistoryData(
    [
      day("2026-09-01", [row("a", "5", { rank: 2 })]),
      day("2026-09-02", [row("a", "6", { rank: 0 })]),
      day("2026-09-03", [row("a", "6", { rank: 1 })], false),
      day("2026-09-04", [
        row("a", "8", { rank: 1 }),
        row("a", "9", { rank: 2 }),
      ]),
    ],
    { chosen: "a" },
  );
  assert.deepEqual(
    result.series[0].points.map((p) => p.rank),
    [2, null, null, null],
  );
  assert.equal(result.gapDays, 3);
  assert.equal(result.series[0].points[3].reason, "ambiguous_rank");
});
