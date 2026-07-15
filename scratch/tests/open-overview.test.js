const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const ROUTE = path.join(ROOT, "web", "open-overview");
const read = (...parts) => fs.readFileSync(path.join(ROUTE, ...parts), "utf8");
const importRoute = (file) => import(pathToFileURL(path.join(ROUTE, file)).href + `?t=${Date.now()}-${Math.random()}`);

test("three canonical routes are isolated and immutable-home remains clean", () => {
  for (const [file, route] of [["index.html", "overview"], ["openrouter/index.html", "openrouter"], ["github/index.html", "github"]]) {
    const html = read(...file.split("/"));
    assert.match(html, new RegExp(`data-open-overview-route="${route}"`));
    assert.match(html, /href="\/web\/open-overview\/open-overview\.css"/);
    assert.match(html, /src="\/web\/open-overview\/open-overview\.js"/);
    assert.match(html, /id="oo-view-root"/);
    assert.doesNotMatch(html, /forest-three\.js/);
  }
  const result = spawnSync("git", ["diff", "--exit-code", "origin/main", "--", "index.html", "web/shared/"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("strict public contracts preserve exact values and reject unknown keys", async () => {
  const schema = await importRoute("open-overview-schema.js");
  assert.equal(schema.compactIntegerString("90071992547409931234"), "90.0Q");
  assert.equal(schema.exactDecimalString("0.000000123400"), "0.000000123400");
  assert.equal(schema.safePublicUrl("http://127.0.0.1/x"), null);
  assert.equal(schema.safePublicUrl("https://github.com/openai/openai-node").hostname, "github.com");
  assert.throws(() => schema.validateManifest({ schemaVersion: "2.0", publishedAt: null, routes: [], sources: [], provenance: [], window: { start: null, end: null, timezone: "unknown", inclusive: null, basis: "unknown" }, invented: true }, "2"), /schema|field/i);
});

test("matrix cell model distinguishes observed zero from unknown", async () => {
  const charts = await importRoute("open-overview-charts.js");
  assert.deepEqual(charts.matrixCellModel({ state: "observed", totalTokens: "0", rankWithinPeriod: 1, evidenceUrl: "https://openrouter.ai/" }), { state: "observed", label: "0", exact: "0", rank: 1, reason: null, evidenceUrl: "https://openrouter.ai/" });
  assert.deepEqual(charts.matrixCellModel({ state: "unknown", reason: "not_observed" }), { state: "unknown", label: "?", exact: null, rank: null, reason: "not_observed", evidenceUrl: null });
});

test("URL state is bounded to reviewed routes", async () => {
  const app = await importRoute("open-overview.js");
  assert.deepEqual(app.parseOpenRouterState("https://site.test/?view=bogus&app=secret"), { view: "usage", appId: null, freeMode: "popularity" });
  assert.deepEqual(app.parseGithubState("https://site.test/?category=bogus&metric=bogus&window=365"), { category: "ai-harnesses", metric: "adoption", windowDays: 7 });
});

test("Three.js is route-local, dynamic, deterministic and bounded", async () => {
  const main = read("open-overview.js");
  const threeSource = read("open-overview-three.js");
  assert.doesNotMatch(main, /from\s+["']\.\/open-overview-three\.js["']/);
  assert.match(main, /import\(["']\.\/open-overview-three\.js["']\)/);
  assert.match(threeSource, /\/web\/vendor\/three\/three\.module\.min\.js/);
  const three = await importRoute("open-overview-three.js");
  assert.deepEqual(three.deterministicLayout("repository:1", 2, 10, "repository"), three.deterministicLayout("repository:1", 2, 10, "repository"));
});

test("route assets expose no secret or private-message field names", () => {
  const forbidden = /OPENROUTER_API_KEY|GITHUB_TOKEN|DATABASE_URL|CRON_SECRET|sender|subject|snippet|threadId|accessCode/i;
  for (const file of ["config.json", "open-overview.js", "open-overview-api.js", "open-overview-schema.js", "open-overview-charts.js", "open-overview-three.js"]) assert.doesNotMatch(read(file), forbidden, file);
});
