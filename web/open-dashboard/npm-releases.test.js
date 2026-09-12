import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  NPM_RELEASE_CACHE_KEY,
  NPM_RELEASE_CACHE_TTL_MS,
  NPM_RELEASES_URL,
  fetchNpmReleaseFacts,
  parseNpmReleaseMetadata,
  readNpmReleaseState,
} from "./npm-releases.js";
import { mountNpmReleases } from "./setup.js";

const frontPageUrl = new URL("./index.html", import.meta.url);
const mcpPageUrl = new URL("./mcp/index.html", import.meta.url);
const NOW = Date.parse("2026-09-12T10:00:00.000Z");

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function registryResponse(overrides = {}) {
  return {
    ok: true,
    json: async () => ({
      name: "open-dashboard-mcp",
      "dist-tags": { latest: "1.1.3" },
      versions: { "1.1.2": {}, "1.1.3": {} },
      ...overrides,
    }),
  };
}

test("both public pages reserve a live npm release line without freezing either version", async () => {
  for (const url of [frontPageUrl, mcpPageUrl]) {
    const page = await readFile(url, "utf8");
    assert.match(page, /data-npm-releases/);
    assert.match(page, /data-npm-releases-value/);
    assert.match(page, /data-npm-releases-note/);
    assert.match(page, /Checking npm releases/);
    assert.doesNotMatch(page, /1\.1\.2|1\.1\.3/);
  }
});

test("the registry parser requires both the requested published release and the latest dist-tag", () => {
  assert.deepEqual(
    parseNpmReleaseMetadata({
      name: "open-dashboard-mcp",
      "dist-tags": { latest: "1.1.3" },
      versions: { "1.1.2": {}, "1.1.3": {} },
    }),
    {
      package: "open-dashboard-mcp",
      latest: "1.1.3",
      published: ["1.1.2", "1.1.3"],
      sourceUrl: NPM_RELEASES_URL,
    },
  );
  for (const invalid of [
    { name: "other", "dist-tags": { latest: "1.1.3" }, versions: { "1.1.2": {}, "1.1.3": {} } },
    { name: "open-dashboard-mcp", "dist-tags": { latest: "1.1.3" }, versions: { "1.1.3": {} } },
    { name: "open-dashboard-mcp", "dist-tags": { latest: "1.1.4" }, versions: { "1.1.2": {}, "1.1.3": {} } },
  ])
    assert.equal(parseNpmReleaseMetadata(invalid), null);
});

test("release lookup caches a valid registry result with visible age and rejects stale cache", async () => {
  const storage = memoryStorage();
  let calls = 0;
  const live = await readNpmReleaseState(
    async () => {
      calls += 1;
      return registryResponse();
    },
    { storage, now: NOW },
  );
  const cached = await readNpmReleaseState(
    async () => {
      throw new Error("cache should prevent the request");
    },
    { storage, now: NOW + 5 * 60 * 1000 },
  );
  assert.equal(live.source, "live");
  assert.deepEqual(live.facts.published, ["1.1.2", "1.1.3"]);
  assert.equal(cached.source, "cache");
  assert.equal(cached.ageMs, 5 * 60 * 1000);
  assert.equal(calls, 1);

  const expired = await readNpmReleaseState(
    async () => ({ ok: false, status: 503 }),
    { storage, now: NOW + NPM_RELEASE_CACHE_TTL_MS + 1 },
  );
  assert.equal(expired.status, "unavailable");
  assert.equal(expired.facts, undefined);
});

test("release lookup does not invent a release list when npm fails", async () => {
  await assert.rejects(
    fetchNpmReleaseFacts(async () => ({ ok: false, status: 503 })),
    /NPM registry returned 503/,
  );
  assert.equal(
    (await readNpmReleaseState(async () => ({ ok: false, status: 503 }))).status,
    "unavailable",
  );
  assert.equal(
    (await readNpmReleaseState(async () => ({ ok: true, json: async () => ({}) }))).status,
    "error",
  );
});

function releaseRoot() {
  const value = { textContent: "" };
  const note = { textContent: "" };
  const container = {
    dataset: {},
    querySelector(selector) {
      return selector === "[data-npm-releases-value]" ? value : note;
    },
  };
  return {
    container,
    value,
    note,
    querySelector(selector) {
      return selector === "[data-npm-releases]" ? container : null;
    },
  };
}

test("the release mount visibly names both published releases and current state", async () => {
  const root = releaseRoot();
  await mountNpmReleases(root, async () => registryResponse());
  assert.equal(root.container.dataset.npmReleasesState, "available");
  assert.equal(root.value.textContent, "Published on npm: 1.1.2 · 1.1.3");
  assert.match(root.note.textContent, /Current npm release: 1\.1\.3/);

  const unavailable = releaseRoot();
  await mountNpmReleases(unavailable, async () => ({ ok: false, status: 503 }));
  assert.equal(unavailable.container.dataset.npmReleasesState, "unavailable");
  assert.equal(unavailable.value.textContent, "UNAVAILABLE");
  assert.match(unavailable.note.textContent, /no release claim is shown/);
});
