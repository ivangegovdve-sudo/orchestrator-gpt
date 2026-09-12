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

const frontPageUrl = new URL("./index.html", import.meta.url);
const pageUrl = new URL("./mcp/index.html", import.meta.url);
const NPM_DOWNLOAD_CACHE_KEY = "open-dashboard-mcp:npm-downloads:last-week:v1";
const NPM_DOWNLOAD_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function npmResponse(overrides = {}) {
  return {
    ok: true,
    json: async () => ({
      package: "open-dashboard-mcp",
      downloads: 12,
      start: "2026-09-03",
      end: "2026-09-09",
      ...overrides,
    }),
  };
}

const NOW = Date.parse("2026-09-12T10:00:00.000Z");

test("both Open Dashboard pages reserve the shared live NPM download state", async () => {
  for (const url of [frontPageUrl, pageUrl]) {
    const page = await readFile(url, "utf8");
    assert.match(page, /data-npm-downloads/);
    assert.match(page, /data-npm-downloads-value/);
    assert.match(page, /data-npm-downloads-note/);
    assert.match(page, /Checking npm downloads/);
  }

  const front = await readFile(frontPageUrl, "utf8");
  const mcp = await readFile(pageUrl, "utf8");
  assert.match(front, /<script type="module" src="\.\/setup\.js"><\/script>/);
  assert.match(front, /id="tool-count">—/);
  assert.doesNotMatch(front, /<strong>17<\/strong> optional MCP tools/);
  assert.doesNotMatch(mcp, /13 providers/);
  assert.doesNotMatch(mcp, /1\.1\.3/);
  assert.doesNotMatch(mcp, /Node\.js 20\+|Node\.js 20 or newer/);
  assert.doesNotMatch(mcp, /all 17|All 17/);
});

test("the shared download mount does not double-bind front-page shell behavior", async () => {
  const setup = await readFile(new URL("./setup.js", import.meta.url), "utf8");
  assert.match(setup, /if \(document\.querySelector\("\[data-setup\]"\)\)/);
});

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

test("NPM facts use a session cache within its TTL and expose cache age", async () => {
  const storage = memoryStorage();
  let networkCalls = 0;
  const fetchImpl = async () => {
    networkCalls += 1;
    return npmResponse();
  };

  const live = await readNpmDownloadState(fetchImpl, { storage, now: NOW });
  const cached = await readNpmDownloadState(
    async () => {
      throw new Error("the cache should prevent this request");
    },
    { storage, now: NOW + 5 * 60 * 1000 },
  );

  assert.equal(live.status, "available");
  assert.equal(live.source, "live");
  assert.equal(cached.status, "available");
  assert.equal(cached.source, "cache");
  assert.equal(cached.ageMs, 5 * 60 * 1000);
  assert.equal(cached.cachedAt, NOW);
  assert.equal(networkCalls, 1);
});

test("expired or malformed cached facts are rejected and a failed refetch stays unavailable", async () => {
  const storage = memoryStorage({
    [NPM_DOWNLOAD_CACHE_KEY]: JSON.stringify({
      version: 1,
      package: "different-package",
      downloads: 999,
      start: "2026-09-03",
      end: "2026-09-09",
      cachedAt: NOW,
    }),
  });
  let networkCalls = 0;
  const fresh = await readNpmDownloadState(
    async () => {
      networkCalls += 1;
      return npmResponse({ downloads: 42 });
    },
    { storage, now: NOW },
  );
  assert.equal(fresh.status, "available");
  assert.equal(fresh.source, "live");
  assert.equal(fresh.facts.downloads, 42);
  assert.equal(networkCalls, 1);

  const expired = await readNpmDownloadState(
    async () => ({ ok: false, status: 503 }),
    { storage, now: NOW + NPM_DOWNLOAD_CACHE_TTL_MS + 1 },
  );
  assert.equal(expired.status, "unavailable");
  assert.equal(expired.facts, undefined);
  assert.equal(expired.cachedAt, undefined);
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

test("the download mount labels a cached value with its age", async () => {
  const storage = memoryStorage();
  const live = downloadRoot();
  await mountNpmDownloads(live, async () => npmResponse(), { storage, now: NOW });

  const cached = downloadRoot();
  await mountNpmDownloads(
    cached,
    async () => {
      throw new Error("the cache should prevent this request");
    },
    { storage, now: NOW + 90 * 60 * 1000 },
  );
  assert.equal(cached.container.dataset.npmDownloadsState, "available");
  assert.equal(cached.container.dataset.npmDownloadsSource, "cache");
  assert.equal(cached.value.textContent, "12 npm downloads");
  assert.match(cached.note.textContent, /read 1 hour ago/);

  const unavailable = downloadRoot();
  await mountNpmDownloads(
    unavailable,
    async () => ({ ok: false, status: 503 }),
    { storage, now: NOW + NPM_DOWNLOAD_CACHE_TTL_MS + 1 },
  );
  assert.equal(unavailable.container.dataset.npmDownloadsState, "unavailable");
  assert.equal(unavailable.value.textContent, "NPM downloads unavailable");
});
