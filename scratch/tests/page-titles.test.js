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
// purpose: the sibling budget test reads build output and is consequently
// flaky, and a guard that depends on a build being fresh fails for the wrong
// reason.

// SVG uses <title> for its accessible name, so a naive whole-document search for
// <title> lets an icon satisfy the guard: a page could lose its real title and
// still pass. One page in web/ has an inline SVG title today
// (web/chair-or-ladder/index.html) and that class grows every time someone adds
// an accessible icon, so SVG subtrees are removed before anything is matched.
const withoutSvg = (html) => html.replace(/<svg[\s\S]*?<\/svg>/gi, "");

// Anchoring to an explicit <head> looks like the obvious next step and is wrong
// here: web/board/index.html is a bare fragment with no <html>/<head> tags at
// all, where the browser builds the head implicitly -- it has a perfectly good
// title on line 5. So an explicit head is used when present, and otherwise the
// implicit one: everything before <body>.
const headOf = (html) => {
  const clean = withoutSvg(html);
  const explicit = clean.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (explicit) return explicit[1];
  const body = clean.search(/<body[^>]*>/i);
  return body === -1 ? clean : clean.slice(0, body);
};

// Keying the redirect exemption on the string appearing anywhere would let a
// <code> example or a JS string exempt a real content page. It must be an actual
// meta tag, in the head.
const isRedirectStub = (head) => /<meta[^>]+http-equiv\s*=\s*["']?refresh["']?/i.test(head);

const titleOf = (head) => {
  const match = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
};

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

test("every web page has a non-empty <title> that is not an SVG icon label", () => {
  assert.ok(pages.length > 40, `expected to find the site's pages, walked ${pages.length}`);
  const problems = [];
  for (const file of pages) {
    const head = headOf(fs.readFileSync(file, "utf8"));
    if (isRedirectStub(head)) continue;
    if (!titleOf(head)) problems.push(path.relative(ROOT, file).replace(/\\/g, "/"));
  }
  assert.deepEqual(problems, [], `pages missing a document <title>:\n  ${problems.join("\n  ")}`);
});

test("the published MCP homepage keeps its title and its path", () => {
  // open-dashboard-mcp@0.6.1 was published with homepage
  // https://sdforest.site/web/open-dashboard/mcp/ and npm metadata cannot be
  // edited after publication. This guards the SOURCE path only -- it cannot see
  // a redirect or build change that moves the DEPLOYED path, which both
  // reviewers noted. That gap is covered by loading the URL after deploy, which
  // is now part of the merge routine rather than something a unit test claims.
  const mcp = path.join(ROOT, "web", "open-dashboard", "mcp", "index.html");
  assert.ok(fs.existsSync(mcp), "web/open-dashboard/mcp/index.html is the npm homepage and must not move");
  assert.ok(
    titleOf(headOf(fs.readFileSync(mcp, "utf8"))),
    "the npm homepage must have a non-empty document <title>",
  );
});
