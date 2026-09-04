const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

// PR #489 deleted the <title> from web/open-dashboard/mcp/index.html and shipped
// web/open-dashboard/matrix/index.html without one. Both reviewers were asked
// specifically what its 269 deletions removed; both answered "nothing
// load-bearing". They checked provenance lines and failure branches -- the
// things this estate has been burned by -- and none of us thought to check
// <title>. It was caught by LOADING the page, an hour after merge, on the page
// that is the npm homepage of a published package.
//
// A missing title is silent in review and immediately visible to a user, which
// is the worst pair. This reads the SOURCE rather than vercel-public/ on
// purpose: the existing budget test reads build output and is consequently
// flaky, and a guard that depends on a build being fresh is a guard that fails
// for the wrong reason.
const pages = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "vercel-public", ".git", "NotelyVoice-main"].includes(entry.name)) continue;
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      pages.push(full);
    }
  }
};
walk(path.join(ROOT, "web"));

test("every web page has a non-empty <title>", () => {
  const missing = [];
  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    // A redirect stub is a <meta http-equiv="refresh"> shell with no content of
    // its own; it is exempt because it is never read, only followed.
    if (/http-equiv=["']refresh["']/i.test(html)) continue;
    const match = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (!match || match[1].trim().length === 0) {
      missing.push(path.relative(ROOT, file).replace(/\\/g, "/"));
    }
  }
  assert.deepEqual(missing, [], `pages with a missing or empty <title>:\n  ${missing.join("\n  ")}`);
});

test("the published MCP homepage keeps its title and its path", () => {
  // open-dashboard-mcp@0.6.1 was published with homepage
  // https://sdforest.site/web/open-dashboard/mcp/ and npm metadata cannot be
  // edited after publication. If this file moves or loses its title, the link
  // on the package page degrades for everyone who follows it.
  const mcp = path.join(ROOT, "web", "open-dashboard", "mcp", "index.html");
  assert.ok(fs.existsSync(mcp), "web/open-dashboard/mcp/index.html is the npm homepage and must not move");
  const html = fs.readFileSync(mcp, "utf8");
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  assert.ok(match && match[1].trim().length > 0, "the npm homepage must have a non-empty title");
});
