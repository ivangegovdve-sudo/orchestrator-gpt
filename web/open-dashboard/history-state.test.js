import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// Exercise the controller's real render branch without booting network jobs or
// chart engines. The DOM/chart boundaries only record what the controller shows.
const controller = await readFile(
  new URL("./explorer.js", import.meta.url),
  "utf8",
);
const start = controller.indexOf("function renderMainChart()");
const end = controller.indexOf("\nfunction renderAlternateControls()", start);
assert.ok(
  start >= 0 && end > start,
  "history controller render function exists",
);
const renderSource = controller.slice(start, end);

function renderHistory(history, historyDataset = "modelUsage") {
  const elements = new Map();
  const drawn = [],
    empty = [];
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        textContent: "",
        innerHTML: "Previously selected model evidence",
        replaceChildren() {},
        append() {},
      });
    return elements.get(id);
  };
  vm.runInNewContext(`${renderSource}\nrenderMainChart();`, {
    loaded: true,
    state: {
      view: "history",
      historyDataset,
      historyChart: "lines",
      historyModel: "all",
      historyScope: "",
    },
    history,
    $: element,
    disposeAtlas() {},
    renderProviderPairDetails() {},
    emptyChart(node, title, description) {
      empty.push({ title, description });
      node.innerHTML = title + description;
    },
    historyChart(node, days) {
      drawn.push(days);
      return [];
    },
    renderRankHistory(node, days) {
      drawn.push(days);
      return { availableSeries: days.length, scope: null };
    },
    inspectRank() {},
    inspectHistory() {},
  });
  return { elements, empty, drawn };
}

for (const dataset of ["modelUsage", "appRanks", "githubRanks"]) {
  test(`${dataset}: unavailable history is unknown and clears a previous inspector`, () => {
    for (const history of [
      null,
      { status: "unavailable", data: { [dataset]: [] } },
      { status: "available", data: {} },
    ]) {
      const result = renderHistory(history, dataset);
      assert.equal(result.empty.length, 1);
      assert.equal(result.drawn.length, 0);
      assert.match(
        result.elements.get("plot-summary").textContent,
        /unavailable|could not be read/i,
      );
      assert.match(result.elements.get("plot-summary").textContent, /unknown/i);
      assert.doesNotMatch(
        result.elements.get("plot-summary").textContent,
        /\b0\b/,
      );
      assert.match(
        result.elements.get("inspector").innerHTML,
        /unknown|unavailable/i,
      );
      assert.doesNotMatch(
        result.elements.get("inspector").innerHTML,
        /Previously selected/,
      );
    }
  });

  test(`${dataset}: a successful empty response remains an observed empty result`, () => {
    const days = [];
    const result = renderHistory(
      { status: "available", data: { [dataset]: days } },
      dataset,
    );
    assert.equal(result.empty.length, 0);
    assert.equal(result.drawn[0], days);
    assert.match(result.elements.get("plot-summary").textContent, /\b0\b/);
  });

  test(`${dataset}: acquired observations still reach the existing chart unchanged`, () => {
    const days = [
      { date: "2026-09-28", complete: true, rows: [] },
      { date: "2026-09-29", complete: true, rows: [] },
    ];
    const result = renderHistory(
      { status: "available", data: { [dataset]: days } },
      dataset,
    );
    assert.equal(result.empty.length, 0);
    assert.equal(result.drawn[0], days);
    assert.match(result.elements.get("plot-summary").textContent, /\b2\b/);
  });
}
