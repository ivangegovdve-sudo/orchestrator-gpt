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
// Foreign elements honour a self-closing slash -- "<svg/>" really is closed, and
// a <title> after it IS the document title. <template> is an HTML element, so
// the slash is ignored and "<template/>" stays open, swallowing what follows.
// Treating them alike accepted "<template/><title>fake</title>" as titled where
// a browser gives none.
const FOREIGN = new Set(["svg", "math"]);
const INERT = new Set([...FOREIGN, "template"]);

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

// Constructs the scanner does not model. Five rounds of review each turned up
// another tokenizer rule it had got wrong, which is what re-deriving an HTML
// parser by adversarial iteration looks like -- it has no natural end, and every
// miss was a SILENT false pass on the exact thing the guard exists to catch.
//
// So the guard fails closed instead. When a page uses one of these, the scanner
// stops claiming to know the answer and the test reports the page for a human to
// check. An unmodelled construct can then cost a minute of someone's attention;
// it can no longer cost a missing title on a published page.
//
// Refusals fire only while no title has been found yet -- see the check itself.
// One page in web/ does use an SVG <desc>, several hundred lines after its own
// <title>, which is exactly the case that must NOT be refused.
const UNMODELLED = {
  plaintext: "<plaintext> turns the rest of the document into text",
  foreignobject: "<foreignObject> is an HTML integration point: HTML parsing resumes inside it",
  "annotation-xml": "<annotation-xml> may be an HTML integration point depending on its encoding",
};

const scan = (html) => {
  let i = 0;
  let inert = 0;
  let title = null;
  let redirect = false;
  const unmodelled = new Set();
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) break;
    if (html.startsWith("<!--", lt)) {
      // "<!-->" and "<!--->" are complete comments -- the tokenizer closes them
      // abruptly on that ">". Searching for "-->" runs straight past both and
      // swallows the rest of the document, so a real title after one is lost.
      if (html.startsWith("<!-->", lt)) { i = lt + 5; continue; }
      if (html.startsWith("<!--->", lt)) { i = lt + 6; continue; }
      // "--!>" closes a comment too (comment-end-bang), so take whichever
      // terminator comes first rather than only looking for "-->".
      const plain = html.indexOf("-->", lt + 4);
      const bang = html.indexOf("--!>", lt + 4);
      const end = plain === -1 ? bang : bang === -1 ? plain : Math.min(plain, bang);
      i = end === -1 ? html.length : end + (end === bang ? 4 : 3);
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

    // Refusals fire only while no title has been found yet. The first title in
    // the document wins, so a construct appearing after one cannot change the
    // answer -- and web/chair-or-ladder/index.html really does carry an SVG
    // <desc>, 400 lines below its own <title>. Refusing that page would have
    // been a false alarm on the only page in the tree that trips this at all.
    if (title === null && !tag.closing) {
      if (UNMODELLED[tag.name]) {
        unmodelled.add(UNMODELLED[tag.name]);
        break;
      }
      // <desc> is an integration point only inside foreign content; as an HTML
      // element name it is meaningless and harmless.
      if (tag.name === "desc" && inert > 0) {
        unmodelled.add("<desc> inside foreign content is an HTML integration point");
        break;
      }
    }
    // Raw text is an HTML-namespace rule. Inside foreign content these are SVG
    // or MathML elements whose contents are parsed as markup, so a "</svg>"
    // written inside an SVG <script> or <style> really does break out. Skipping
    // to the end tag there made the scanner stay in foreign content when the
    // browser had already left it.
    if (RAW_TEXT.has(tag.name) && !tag.closing && inert === 0) {
      // selfClosing is deliberately NOT consulted: HTML ignores the slash on
      // <script/>, so the element stays open and everything up to </script>
      // remains raw text. Honouring it let a <title> in a script body count as
      // the document title.
      // The end tag may also carry attributes -- "</script foo>" is a parse
      // error that the tokenizer still emits as an end tag, so it has to close
      // the element here too, or a real title after it is never seen.
      const close = new RegExp(`</${tag.name}(?:[\\s/][^>]*)?>`, "i").exec(html.slice(i));
      i = close ? i + close.index + close[0].length : html.length;
      continue;
    }
    if (INERT.has(tag.name)) {
      // An unterminated <svg> leaves this above zero to EOF, which is what a
      // browser does too: everything after it is foreign content.
      if (tag.closing) inert = Math.max(0, inert - 1);
      else if (!(tag.selfClosing && FOREIGN.has(tag.name))) inert += 1;
      continue;
    }
    if (inert > 0) continue;

    if (tag.name === "title" && !tag.closing && title === null) {
      // Same rule as the raw-text end tag above: "</title foo>" is a parse error
      // the tokenizer still emits as an end tag, so it closes the element. Only
      // the raw-text branch was fixed for this at first, which left
      // "<title></title foo>" reading as titled when the browser gives none.
      const close = /<\/title(?:[\s/][^>]*)?>/i.exec(html.slice(i));
      title = (close ? html.slice(i, i + close.index) : html.slice(i)).trim();
      continue;
    }
    // A meta refresh with no content attribute does not redirect anything, so it
    // must not exempt a title-less page from the guard. The content must also
    // name a destination -- a bare "content=5" is a self-reload, not a stub.
    if (
      tag.name === "meta" &&
      /^refresh$/i.test((tag.attrs["http-equiv"] || "").trim()) &&
      // The destination must be non-empty: "content=5; url=" names nothing and
      // must not excuse a title-less page.
      /\burl\s*=\s*\S/i.test(tag.attrs.content || "")
    ) {
      redirect = true;
    }
  }
  // Character references are not decoded, so a title made only of them cannot be
  // judged: "&nbsp;" reads as six visible characters here and as an empty title
  // in a browser. Anything with other text in it is non-empty whatever the
  // entities decode to, so only the entities-and-whitespace case is unknown.
  // The semicolon is optional: a named reference may omit it when the next
  // character is not alphanumeric, so "<title>&nbsp</title>" is an empty title
  // in a browser just as "&nbsp;" is.
  if (title && /&[#a-zA-Z0-9]+;?/.test(title) && title.replace(/&[#a-zA-Z0-9]+;?/g, "").trim() === "") {
    unmodelled.add("the title is made only of character references, which this guard does not decode");
  }
  return { title: title || null, redirect, unmodelled: [...unmodelled] };
};

const pages = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Only node_modules is skipped, and only because a stray install inside
      // web/ would otherwise be walked. vercel-public, .git and NotelyVoice-main
      // were also listed here and are all at the REPO ROOT, outside this walk
      // root -- dead entries that implied coverage gaps in web/ that do not
      // exist. web/ holds 63 html files with or without the filter.
      if (entry.name === "node_modules") continue;
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
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const { title, redirect, unmodelled } = scan(fs.readFileSync(file, "utf8"));
    // Reported before the title check, and regardless of it: if the page uses
    // markup outside the modelled subset, whatever the scanner found is not
    // trustworthy either way.
    if (unmodelled.length > 0) {
      problems.push(`${rel} -- open it in a browser and check its title by hand: ${unmodelled.join("; ")}`);
      continue;
    }
    if (redirect) continue;
    if (!title) problems.push(`${rel} -- no document <title>`);
  }
  assert.deepEqual(problems, [], `\n  ${problems.join("\n  ")}\n`);
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
  [`<!-- c --!><title>Real</title>`, "Real", "--!> closes a comment too"],
  [`<head><script>var x=1;</script/><title>Real</title></head><body>y</body>`, "Real", "end tag with a slash still closes"],
  [`<head><title>Real</title/></head><body>y</body>`, "Real", "same, on the title end tag"],
  [`<head><template><svg><title>t</title></svg></template><title>Real</title></head><body>x</body>`, "Real", "svg nested inside template"],
  [`<!DOCTYPE html [ <!ENTITY x "y"> ]><title>Real</title>`, "Real", "doctype with an internal subset containing >"],
  [`<!DOCTYPE html PUBLIC "> <title>fake</title> "><body>real</body>`, "fake", "a > inside a quoted PUBLIC identifier DOES end the doctype -- measured, not assumed"],
  [`<svg><script>var x = "</svg>"</script><title> </title></svg><title>Real</title>`, null, "raw text is an HTML rule: an SVG <script> does not hide a </svg>, so the whitespace title wins and the later one is ignored"],
  [`<svg><script>var y=1;</script></svg><title>Real</title>`, "Real", "an ordinary SVG script does not disturb the depth"],
  [`<svg><style>a{content:"</svg>"}</style><title>icon</title></svg>`, "icon", "same for an SVG <style>: the </svg> in it really does break out"],
  [`<head><template/><title>fake</title></head><body>x</body>`, null, "<template/> is an HTML element: the slash is ignored and it stays open"],
  [`<head><template></template><title>Real</title></head><body>x</body>`, "Real", "a properly closed template does not swallow what follows"],
  [`<body><math/><title>m</title></body>`, "m", "<math/> IS foreign content, so the slash does close it"],
];

// Character references are not decoded, so the scanner's title TEXT differs from
// the browser's here. Both still read as "titled", which is the only thing the
// guard decides, so this is a known and bounded gap rather than a defect -- and
// the entity-ONLY case, where the decision itself would differ, is refused
// instead (see FLAGGED_CASES).
const UNDECODED_ENTITY_CASES = [
  [`<head><title>A&amp;B</title></head><body>x</body>`, "A&amp;B", "A&B"],
  [`<head><title>&#82;eal</title></head><body>x</body>`, "&#82;eal", "Real"],
];

// These are the cases the scanner deliberately REFUSES rather than models. The
// browser's answer is recorded next to each one to show what is being given up:
// in every one of them the scanner would otherwise have been silently wrong.
const FLAGGED_CASES = [
  [`<body><plaintext><title>pt</title>`, null, "plaintext: browser has no title, scanner would say 'pt'"],
  [`<head><plaintext></head><body><title>Real</title>`, null, "plaintext: browser has no title, scanner would say 'Real'"],
  [`<body><svg><foreignObject><title>Real</title></foreignObject></svg></body>`, "Real", "foreignObject: browser titles it, scanner would say none"],
  [`<body><svg><desc><title>d</title></desc></svg></body>`, "d", "desc: browser titles it, scanner would say none"],
  [`<body><math><annotation-xml encoding="text/html"><title>ax</title></annotation-xml></math></body>`, "ax", "annotation-xml: browser titles it, scanner would say none"],
  [`<head><title>&nbsp;</title></head><body>x</body>`, null, "entity-only title: browser trims it to empty, scanner would say '&nbsp;'"],
  [`<body><svg><foreignObject><p>x</p></foreignObject><title>icon</title></svg></body>`, null, "foreignObject with no title inside: the scanner cannot tell that from one that has"],
  [`<head><title>&nbsp</title></head><body>x</body>`, null, "entity-only title WITHOUT the semicolon: a named reference may omit it, and this still trims to empty in a browser"],
  [`<head><title>&amp</title></head><body>x</body>`, "&", "refused conservatively: the browser titles this '&', but the scanner cannot tell it from the &nbsp case without decoding"],
];

test("the scanner agrees with a real browser parser on every measured case", () => {
  const disagreements = [];
  for (const [html, expected, why] of PARSER_CASES) {
    const { title, unmodelled } = scan(html);
    if (unmodelled.length > 0) {
      disagreements.push(`${why}\n    this case should be modelled, but the scanner refused it: ${unmodelled.join("; ")}`);
    } else if (title !== expected) {
      disagreements.push(`${why}\n    document: ${html}\n    scanner:  ${JSON.stringify(title)}\n    browser:  ${JSON.stringify(expected)}`);
    }
  }
  assert.deepEqual(disagreements, [], `scanner diverged from the browser on:\n  ${disagreements.join("\n  ")}\n`);
});

test("undecoded character references change the title text but never the verdict", () => {
  for (const [html, scannerText, browserText] of UNDECODED_ENTITY_CASES) {
    const { title, unmodelled } = scan(html);
    assert.deepEqual(unmodelled, [], `${html} should be answered, not refused`);
    assert.equal(title, scannerText, `scanner text changed for ${html}`);
    assert.ok(
      Boolean(title) === Boolean(browserText),
      `the titled/untitled verdict now differs from the browser for ${html}: ` +
        `scanner ${JSON.stringify(title)}, browser ${JSON.stringify(browserText)}`,
    );
  }
});

test("the scanner refuses the cases it cannot model rather than guessing", () => {
  const guessed = [];
  for (const [html, browserTitle, why] of FLAGGED_CASES) {
    const { unmodelled } = scan(html);
    if (unmodelled.length === 0) {
      guessed.push(`${why}\n    document: ${html}\n    browser:  ${JSON.stringify(browserTitle)}\n    the scanner answered instead of refusing, so this case is now silently wrong`);
    }
  }
  assert.deepEqual(guessed, [], `\n  ${guessed.join("\n  ")}\n`);
});

module.exports = { scan };
