import test from "node:test";
import assert from "node:assert/strict";
import {
  countValue,
  projectUrl,
  normalizeRepositories,
  filterProjects,
  rankingRows,
  loadProjectCategory,
} from "./projects.js";

const repo = {
  repositoryId: "12",
  fullName: "example/agent",
  url: "https://github.com/example/agent",
  primaryCategory: "mcp",
  stars: "100",
  forks: "2",
  language: "TypeScript",
  roles: ["server"],
};
test("missing or malformed repository counts never become zero", () => {
  for (const value of [
    null,
    undefined,
    "",
    " ",
    "NaN",
    "-1",
    "1.5",
    "9007199254740993",
  ])
    assert.equal(countValue(value), null);
  assert.equal(countValue("0"), 0);
  assert.equal(countValue("-5", true), -5);
  const rows = normalizeRepositories([
    {
      category: "mcp",
      data: [{ ...repo, stars: null }],
      coverage: { resolvedAsOf: "2026-09-09" },
    },
  ]);
  assert.equal(rows[0].stars, null);
  assert.equal(rows[0].forks, 2);
});
test("exact repository identity merges category membership and retains newest observations", () => {
  const rows = normalizeRepositories([
    { category: "mcp", data: [repo], coverage: { resolvedAsOf: "2026-09-08" } },
    {
      category: "ai-skills",
      data: [{ ...repo, stars: "120", forks: null }],
      coverage: { resolvedAsOf: "2026-09-09" },
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stars, 120);
  assert.equal(rows[0].forks, null);
  assert.deepEqual(rows[0].categories, ["mcp", "ai-skills"]);
  assert.equal(
    filterProjects(rows, {
      category: "ai-skills",
      language: "TypeScript",
      query: "server",
    }).length,
    1,
  );
  assert.equal(
    filterProjects(rows, { category: "mcp", language: "Python" }).length,
    0,
  );
});
test("momentum uses exact evidence identity and preserves absent deltas", () => {
  const response = {
    ranking: { metric: "momentum" },
    data: [
      { repositoryId: "1", score: null },
      { repositoryId: "2", score: "0.8" },
    ],
    metricEvidence: [{ repositoryId: "1", starDelta: "-3", forkDelta: "0" }],
  };
  const rows = rankingRows(response);
  assert.equal(rows[0].value, -3);
  assert.equal(rows[1].value, null);
  assert.equal(
    rankingRows({ ...response, ranking: { metric: "adoption" } })[0].value,
    null,
  );
});
test("repository outbound links cannot become arbitrary hosts or executable URLs", () => {
  assert.equal(
    projectUrl("https://github.com/example/repo/"),
    "https://github.com/example/repo",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://github.com.evil.test/example/repo",
    "https://user:pass@github.com/example/repo",
    "https://github.com/example/repo/issues/1",
  ])
    assert.equal(projectUrl(url), null);
});
test("category pagination stops repeated cursors and rejects mixed snapshots", async () => {
  let requests = 0;
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      schemaVersion: "2.0",
      watermark: "same",
      data: [repo],
      page: { nextCursor: "repeat" },
      coverage: {},
    }),
  });
  const result = await loadProjectCategory("mcp", async (...args) => {
    requests++;
    return fetchImpl(...args);
  });
  assert.equal(requests, 2);
  assert.equal(result.complete, false);
  let page = 0;
  await assert.rejects(
    loadProjectCategory("mcp", async () => ({
      ok: true,
      json: async () => ({
        schemaVersion: "2.0",
        watermark: String(page++),
        data: [repo],
        page: { nextCursor: "next" },
        coverage: {},
      }),
    })),
    /changed during pagination/,
  );
});
