import test from "node:test";
import assert from "node:assert/strict";
import {
  collectPublicCatalogue,
  PUBLIC_CATALOGUE_URL,
} from "./refresh-public-catalogue.mjs";

const stamp = "2026-09-17T00:00:00.000Z";
const response = (payload) => ({ ok: true, json: async () => payload });

test("public catalogue refresh follows cursors and deduplicates exact provider ids", async () => {
  const calls = [];
  const pages = [
    {
      schemaVersion: "2.0",
      data: [
        { provider: "openrouter", id: "same" },
        { provider: "groq", id: "groq-only" },
      ],
      cursor: "next",
      provenance: [{ sourceId: "models_current", fetchedAt: stamp }],
    },
    {
      schemaVersion: "2.0",
      data: [
        { provider: "openrouter", id: "same" },
        { provider: "cerebras", id: "cerebras-only" },
      ],
      cursor: null,
      provenance: [{ sourceId: "groq_models_current", fetchedAt: stamp }],
    },
  ];
  const snapshot = await collectPublicCatalogue(
    async (url) => {
      calls.push(url);
      return response(pages[calls.length - 1]);
    },
    { now: () => new Date(stamp) },
  );
  assert.deepEqual(calls, [
    `${PUBLIC_CATALOGUE_URL}?limit=500`,
    `${PUBLIC_CATALOGUE_URL}?limit=500&cursor=next`,
  ]);
  assert.equal(snapshot.snapshot, true);
  assert.equal(snapshot.hasMore, false);
  assert.equal(snapshot.fetchedAt, stamp);
  assert.deepEqual(
    snapshot.data.map((row) => `${row.provider}:${row.id}`),
    ["openrouter:same", "groq:groq-only", "cerebras:cerebras-only"],
  );
  assert.equal(snapshot.population.pagesRead, 2);
});

test("public catalogue refresh refuses a repeated cursor", async () => {
  const page = {
    schemaVersion: "2.0",
    data: [{ provider: "openrouter", id: "one" }],
    cursor: "same",
  };
  await assert.rejects(
    collectPublicCatalogue(async () => response(page)),
    /PUBLIC_CATALOGUE_CURSOR_REPEATED/,
  );
});

test("public catalogue refresh refuses a non-v2 response", async () => {
  await assert.rejects(
    collectPublicCatalogue(async () => response({ schemaVersion: "1.0", data: [] })),
    /PUBLIC_CATALOGUE_SCHEMA_UNSUPPORTED/,
  );
});
