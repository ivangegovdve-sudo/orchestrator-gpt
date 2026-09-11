import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  NPM_DOWNLOADS_URL,
  fetchNpmDownloadFacts,
  formatNpmDownloadRange,
  parseNpmDownloadPoint,
  readNpmDownloadState,
} from "./npm-downloads.js";
import { mountNpmDownloads } from "./setup.js";

const pageUrl = new URL("./mcp/index.html", import.meta.url);

test("the MCP page reserves a live NPM download state", async () => {
  const page = await readFile(pageUrl, "utf8");

  assert.match(page, /data-npm-downloads/);
  assert.match(page, /data-npm-downloads-value/);
  assert.match(page, /data-npm-downloads-note/);
  assert.match(page, /Checking npm downloads/);
  assert.doesNotMatch(page, /807 npm downloads/);
});

test("NPM point data is accepted only when its package and complete date range are valid", () => {
  const facts = parseNpmDownloadPoint({
    downloads: 807,
    start: "2026-09-03",
    end: "2026-09-09",
    package: "open-dashboard-mcp",
  });

  assert.deepEqual(facts, {
    downloads: 807,
    start: "2026-09-03",
    end: "2026-09-09",
    package: "open-dashboard-mcp",
    sourceUrl: NPM_DOWNLOADS_URL,
  });
  assert.equal(formatNpmDownloadRange(facts), "3–9 September 2026");

  for (const invalid of [
    { downloads: 807, start: "2026-09-03", end: "2026-09-09", package: "other" },
    { downloads: 1.5, start: "2026-09-03", end: "2026-09-09", package: "open-dashboard-mcp" },
    { downloads: 807, start: "2026-9-03", end: "2026-09-09", package: "open-dashboard-mcp" },
    { downloads: 807, start: "2026-09-10", end: "2026-09-09", package: "open-dashboard-mcp" },
  ])
    assert.equal(parseNpmDownloadPoint(invalid), null);
});

test("failed or malformed NPM reads stay unavailable instead of using a snapshot", async () => {
  await assert.rejects(
    fetchNpmDownloadFacts(async () => ({ ok: false, status: 503 })),
    /NPM downloads returned 503/,
  );
  await assert.rejects(
    fetchNpmDownloadFacts(async () => ({
      ok: true,
      json: async () => ({ downloads: 807, start: "2026-09-03", end: "2026-09-09" }),
    })),
    /did not match expected point schema/,
  );
  assert.equal(
    (await readNpmDownloadState(async () => ({ ok: false, status: 503 }))).status,
    "unavailable",
  );
  assert.equal(
    (
      await readNpmDownloadState(async () => {
        throw new Error("network down");
      })
    ).status,
    "error",
  );
});

function downloadRoot() {
  const value = { textContent: "" };
  const note = { textContent: "" };
  const container = {
    dataset: {},
    querySelector(selector) {
      return selector === "[data-npm-downloads-value]" ? value : note;
    },
  };
  return {
    container,
    value,
    note,
    querySelector(selector) {
      return selector === "[data-npm-downloads]" ? container : null;
    },
  };
}

test("the download mount renders live success and named failure states", async () => {
  const available = downloadRoot();
  await mountNpmDownloads(available, async () => ({
    ok: true,
    json: async () => ({
      package: "open-dashboard-mcp",
      downloads: 12,
      start: "2026-09-03",
      end: "2026-09-09",
    }),
  }));
  assert.equal(available.container.dataset.npmDownloadsState, "available");
  assert.equal(available.value.textContent, "12 npm downloads");
  assert.match(available.note.textContent, /3–9 September 2026/);

  const unavailable = downloadRoot();
  await mountNpmDownloads(unavailable, async () => ({ ok: false, status: 503 }));
  assert.equal(unavailable.container.dataset.npmDownloadsState, "unavailable");
  assert.equal(unavailable.value.textContent, "NPM downloads unavailable");

  const malformed = downloadRoot();
  await mountNpmDownloads(malformed, async () => ({
    ok: true,
    json: async () => ({ package: "open-dashboard-mcp", downloads: "12" }),
  }));
  assert.equal(malformed.container.dataset.npmDownloadsState, "error");
  assert.equal(malformed.value.textContent, "NPM downloads could not be read");
});
