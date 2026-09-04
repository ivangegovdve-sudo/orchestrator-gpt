const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

// PR #489 deleted the <title> from web/open-dashboard/mcp/index.html and shipped
// web/open-dashboard/matrix/index.html without one. That page is the npm
// homepage of a published package, and npm metadata cannot be edited after
// publication. Both reviewers were asked specifically what its 269 deletions
// removed; both answered "nothing load-bearing". They checked provenance lines
// and failure branches -- the things this estate has been burned by -- and none
// of us thought to check <title>. It was caught by LOADING the page, an hour
// after merge.
//
// A missing title is silent in review and immediately visible to a user, which
// is the worst pair. This reads the SOURCE rather than vercel-public/ on
// purpose: the sibling budget test reads build output and is consequently
// flaky, and a guard that depends on a build being fresh fails for the wrong
// reason.

// ---------------------------------------------------------------------------
// A minimal HTML scanner.
//
// The first version of this guard matched <title> with one regex over the whole
// document. The second stripped <svg> subtrees and anchored to <head>. A
// reviewer broke the second with six documents, and all six reproduced: a
// <title> sitting after a nested </svg>, a <head> inside an HTML comment, a
// <title> inside a string in a <script>, an unterminated <svg>, an
// http-equiv=refresh living in some other element's attribute value, and
// <title data-label=">">.
//
// Every one had an obvious individual patch, and the patches did not compose,
// because "is this the document title" is a question about the parse tree and
// not about the source text. So this scans tags instead: it respects quoted
// attribute values, skips comments and raw-text elements, and tracks depth
// through foreign content (<svg>, <math>) and <template>.
//
// It is deliberately NOT a full HTML parser -- no implied tags, no error
// recovery -- and it does not need to be. It answers exactly two questions
// about first-party pages authored in this repo: does this document have a
// non-empty title, and is it a redirect stub.
// ---------------------------------------------------------------------------

const RAW_TEXT = new Set(["script", "style", "textarea"]);
const INERT = new Set(["svg", "math", "template"]);

// Reads a tag beginning at `at`, which must point at "<". Returns null when
// that "<" does not start one, so stray angle brackets in text are ignored.
const readTag = (html, at) => {
  const opener = /^<(\/?)([a-zA-Z][^\s/>]*)/.exec(html.slice(at, at + 64));
  if (!opener) return null;
  const tag = { name: opener[2].toLowerCase(), closing: opener[1] === "/", selfClosing: false, attrs: {} };
  let i = at + opener[0].length;
  while (i < html.length) {
    while (i < html.length && /\s/.test(html[i])) i += 1;
    if (html[i] === ">") { i += 1; break; }
    if (html[i] === "/" && html[i + 1] === ">") { tag.selfClosing = true; i += 2; break; }
    const name = /^[^\s=/>]+/.exec(html.slice(i));
    if (!name) { i += 1; continue; }
    i += name[0].length;
    while (i < html.length && /\s/.test(html[i])) i += 1;
    let value = "";
    if (html[i] === "=") {
      i += 1;
      while (i < html.length && /\s/.test(html[i])) i += 1;
      const quote = html[i];
      if (quote === '"' || quote === "'") {
        // The quoted value may contain ">", which is what defeated the regex.
        const end = html.indexOf(quote, i + 1);
        value = end === -1 ? html.slice(i + 1) : html.slice(i + 1, end);
        i = end === -1 ? html.length : end + 1;
      } else {
        const bare = /^[^\s>]*/.exec(html.slice(i));
        value = bare[0];
        i += bare[0].length;
      }
    }
    tag.attrs[name[0].toLowerCase()] = value;
  }
  tag.end = i;
  return tag;
};

const scan = (html) => {
  let i = 0;
  let inert = 0;
  let title = null;
  let redirect = false;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) break;
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
      const end = html.indexOf(">", lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    const tag = readTag(html, lt);
    if (!tag) { i = lt + 1; continue; }
    i = tag.end;

    if (RAW_TEXT.has(tag.name) && !tag.closing && !tag.selfClosing) {
      const close = new RegExp(`</${tag.name}\\s*>`, "i").exec(html.slice(i));
      i = close ? i + close.index + close[0].length : html.length;
      continue;
    }
    if (INERT.has(tag.name)) {
      // An unterminated <svg> leaves this above zero to EOF, which is what a
      // browser does too: everything after it is foreign content.
      if (tag.closing) inert = Math.max(0, inert - 1);
      else if (!tag.selfClosing) inert += 1;
      continue;
    }
    if (inert > 0) continue;

    if (tag.name === "title" && !tag.closing && title === null) {
      const close = /<\/title\s*>/i.exec(html.slice(i));
      title = (close ? html.slice(i, i + close.index) : html.slice(i)).trim();
      continue;
    }
    if (tag.name === "meta" && /^refresh$/i.test((tag.attrs["http-equiv"] || "").trim())) {
      redirect = true;
    }
  }
  return { title: title || null, redirect };
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

test("every web page has a non-empty document <title>", () => {
  // Stops the assertion below passing vacuously if the walk breaks or web/ moves.
  assert.ok(pages.length > 40, `expected to walk the site's pages, found ${pages.length}`);
  const problems = [];
  for (const file of pages) {
    const { title, redirect } = scan(fs.readFileSync(file, "utf8"));
    if (redirect) continue;
    if (!title) problems.push(path.relative(ROOT, file).replace(/\\/g, "/"));
  }
  assert.deepEqual(problems, [], `pages missing a document <title>:\n  ${problems.join("\n  ")}`);
});

test("the published MCP homepage keeps its title and its path", () => {
  // open-dashboard-mcp@0.6.1 was published with homepage
  // https://sdforest.site/web/open-dashboard/mcp/ and npm metadata cannot be
  // edited after publication. This guards the SOURCE path only -- it cannot see
  // a redirect or a build change that moves the DEPLOYED path, which both
  // reviewers noted. That gap is covered by loading the URL after deploy, which
  // is now part of the merge routine rather than something a unit test claims.
  const mcp = path.join(ROOT, "web", "open-dashboard", "mcp", "index.html");
  assert.ok(fs.existsSync(mcp), "web/open-dashboard/mcp/index.html is the npm homepage and must not move");
  assert.ok(scan(fs.readFileSync(mcp, "utf8")).title, "the npm homepage must have a non-empty document <title>");
});

module.exports = { scan };
