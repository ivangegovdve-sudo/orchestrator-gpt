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

// Elements the parser reads as raw text: their contents are never markup, so a
// <title> inside one is not the document title. noscript belongs here because
// these are real pages loaded with scripting ON. (DOMParser parses with
// scripting off and therefore treats <noscript> as markup -- checked both ways
// in a browser, and the scripting-on answer is the one that matches how anyone
// actually loads these pages.)
const RAW_TEXT = new Set([
  "script", "style", "textarea", "iframe", "noembed", "noframes", "xmp", "noscript",
]);
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
      // "<!-->" and "<!--->" are complete comments -- the tokenizer closes them
      // abruptly on that ">". Searching for "-->" runs straight past both and
      // swallows the rest of the document, so a real title after one is lost.
      if (html.startsWith("<!-->", lt)) { i = lt + 5; continue; }
      if (html.startsWith("<!--->", lt)) { i = lt + 6; continue; }
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<![CDATA[", lt)) {
      // Legal only inside foreign content, and it runs to "]]>" -- not to the
      // first ">". Ending it at the first ">" left the rest of the CDATA text to
      // be scanned as markup, so a "</svg>" sitting in that text closed a
      // subtree that was never open and exposed the icon title after it.
      const end = html.indexOf("]]>", lt + 9);
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

    if (RAW_TEXT.has(tag.name) && !tag.closing) {
      // selfClosing is deliberately NOT consulted: HTML ignores the slash on
      // <script/>, so the element stays open and everything up to </script>
      // remains raw text. Honouring it let a <title> in a script body count as
      // the document title.
      // The end tag may also carry attributes -- "</script foo>" is a parse
      // error that the tokenizer still emits as an end tag, so it has to close
      // the element here too, or a real title after it is never seen.
      const close = new RegExp(`</${tag.name}(?:\\s[^>]*)?>`, "i").exec(html.slice(i));
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
      // Same rule as the raw-text end tag above: "</title foo>" is a parse error
      // the tokenizer still emits as an end tag, so it closes the element. Only
      // the raw-text branch was fixed for this at first, which left
      // "<title></title foo>" reading as titled when the browser gives none.
      const close = /<\/title(?:\s[^>]*)?>/i.exec(html.slice(i));
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

// ---------------------------------------------------------------------------
// The scanner exists because three earlier revisions of this guard were each
// broken by a document nobody thought of, so its agreement with a real parser is
// the property worth protecting -- not any individual case above.
//
// Every expected value below was MEASURED, not reasoned about: each document was
// loaded into a same-origin srcdoc iframe in Chrome and document.title read back
// (2026-09-05). srcdoc rather than DOMParser on purpose -- DOMParser parses with
// scripting disabled, which makes <noscript> contents markup instead of raw
// text, and these are real pages loaded with scripting on.
//
// If a case here ever fails, re-measure in a browser before changing the
// expectation. The browser is right and this file is wrong.
// ---------------------------------------------------------------------------
const PARSER_CASES = [
  [`<html><head><title>Real</title></head><body>x</body></html>`, "Real", "plain"],
  [`<html><head></head><body>x</body></html>`, null, "no title"],
  [`<head><title>   </title></head><body>x</body>`, null, "whitespace-only title"],
  [`<meta charset="utf-8"><title>Fleet Board</title><style>a{}</style><body><p>x</p>`, "Fleet Board", "headless fragment, as web/board/index.html is"],
  [`<html><head><meta charset="utf-8"></head><body><svg><title>Back</title></svg></body></html>`, null, "svg icon only"],
  [`<html><head><title>Real</title></head><body><svg><title>Icon</title></svg></body></html>`, "Real", "real title alongside an icon"],
  [`<html><head><svg><title>Icon</title></svg><title>Real</title></head><body></body></html>`, "Real", "icon before the real title"],
  [`<body><svg><title>a</title></svg><svg><title>b</title></svg></body>`, null, "two icons"],
  [`<svg><svg></svg><title>icon label</title></svg><body>real</body>`, null, "nested svg, title after the inner close"],
  [`<svg><svg><title>x</title></svg></svg><body>real</body>`, null, "nested svg, title inside the inner"],
  [`<head><svg><title>icon</title></head><body>real</body>`, null, "unterminated svg swallows the rest"],
  [`<!doctype html><html><head></head><body><svg/><title>icon</title></body></html>`, "icon", "svg self-closed: foreign content DOES honour the slash"],
  [`<body><svg></svg><title>icon</title></body>`, "icon", "svg closed, so the title is the document's"],
  [`<html><!-- <head><title>stale fake</title></head> --><head></head><body>real</body></html>`, null, "head inside a comment"],
  [`<head><!-- <title>commented</title> --></head><body>x</body>`, null, "title inside a comment"],
  [`<!--><title>Real</title>`, "Real", "abrupt-closed empty comment"],
  [`<!---><title>Real</title>`, "Real", "abrupt-closed comment with one dash"],
  [`<!x><title>Real</title>`, "Real", "bogus comment"],
  [`<body><svg><!-- </svg> --><title>icon</title></svg></body>`, null, "comment inside foreign content"],
  [`<head><script>const x = "<title>fake</title>";</script></head><body>real</body>`, null, "title inside a script string"],
  [`<script/>Hello <title>fake</title></script><body>real</body>`, null, "script self-closed: HTML ignores the slash"],
  [`<html><head><script>var s="x";</script foo><title>Real title</title></head></html>`, "Real title", "end tag carrying an attribute still closes"],
  [`<html><head><script>var s="x";</script ><title>Real title</title></head></html>`, "Real title", "end tag with trailing space"],
  [`<head><script><template><title>x</title></script><title>Real</title></head><body>y</body>`, "Real", "markup inside a script body is text"],
  [`<head><style>a[x="<title>s</title>"]{}</style></head><body>y</body>`, null, "title-shaped selector inside style"],
  [`<body><textarea><title>ta</title></textarea></body>`, null, "title inside textarea"],
  [`<body><iframe><title>if</title></iframe></body>`, null, "title inside iframe"],
  [`<head><noscript><title>ns</title></noscript></head><body>x</body>`, null, "title inside noscript, scripting on"],
  [`<svg><![CDATA[> </svg><title>icon</title>]]></svg><body>real</body>`, null, "CDATA hiding a </svg>"],
  [`<svg><![CDATA[x]]></svg><title>Real</title>`, "Real", "benign CDATA"],
  [`<head><title data-label=">">Real title</title></head><body>x</body>`, "Real title", "> inside a title attribute"],
  [`<head><title data-label="<">Real title</title></head><body>x</body>`, "Real title", "< inside a title attribute"],
  [`<head><meta a<b=c><title>Real</title></head><body>x</body>`, "Real", "< inside an attribute name"],
  [`<head><meta name="x content=y><title>Real</title></head><body>z</body>`, null, "unterminated attribute quote eats the document"],
  [`<head><title/></head><body>x</body>`, "</head><body>x</body>", "title is RCDATA, so the slash is ignored and the rest becomes its text"],
  [`<head><title>Real</title ></head><body>x</body>`, "Real", "end tag with a space before >"],
  [`<title></title foo>`, null, "title end tag carrying an attribute still closes"],
  [`<head><title>Real</title foo></head><body>x</body>`, "Real", "same, with real text"],
  [`<head><title></title foo><p>z</head><body>x</body>`, null, "same, empty, with junk after"],
  [`<head><template><title>tpl</title></template></head><body>x</body>`, null, "title inside template"],
  [`<body><math><title>m</title></math></body>`, null, "title inside math"],
  [`<body></svg><title>Real</title></body>`, "Real", "stray </svg> must not desynchronise the depth"],
  [`<body></><title>Real</title></body>`, "Real", "</> is not an end tag"],
  [`<${"a".repeat(80)}><title>Real</title>`, "Real", "tag name longer than the opener slice"],
  [`<head><title>0</title></head><body>x</body>`, "0", `"0" is a title, and must not be eaten as falsy`],
  [`<HTML><HEAD><TITLE>Upper</TITLE></HEAD><BODY>x</BODY></HTML>`, "Upper", "uppercase tags"],
  [`<body><p>x</p><title>Late</title></body>`, "Late", "a title after <body> is still the document title"],
  [`<head><title>First</title><title>Second</title></head><body>x</body>`, "First", "the first title wins"],
];

test("the scanner agrees with a real browser parser on every measured case", () => {
  const disagreements = [];
  for (const [html, expected, why] of PARSER_CASES) {
    const actual = scan(html).title;
    if (actual !== expected) {
      disagreements.push(`${why}\n    document: ${html}\n    scanner:  ${JSON.stringify(actual)}\n    browser:  ${JSON.stringify(expected)}`);
    }
  }
  assert.deepEqual(disagreements, [], `scanner diverged from the browser on:\n  ${disagreements.join("\n  ")}`);
});

module.exports = { scan };
