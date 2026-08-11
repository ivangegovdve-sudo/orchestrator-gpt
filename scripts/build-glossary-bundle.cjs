"use strict";
/**
 * Builds the static glossary bundle served by /web/library/glossary/.
 *
 * WHY THIS EXISTS
 * The glossary page used to call a semantic-search API on KVM2 (library-api :8765).
 * That service is retired, and its corpus had frozen at 353 terms because nothing ever
 * rebuilt it — Ivan's weekly term additions went into markdown that fed nothing.
 * This script closes that gap by regenerating the bundle from the markdown ON EVERY BUILD,
 * so new weekly terms publish themselves on the next deploy. A hand-built JSON would
 * recreate exactly the failure it replaces.
 *
 * SOURCES, highest precedence first:
 *   1. web/ai-init/glossary-data.js   — 527 curated entries: good categories + relation graph
 *   2. glossary/<date>-terms.md       — weekly mined additions (newest content)
 *   3. glossary/ai-terms-glossary.md  — 912 terms mined from the Gmail corpus 2026-07-10
 *
 * Run standalone:  node scripts/build-glossary-bundle.cjs
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "web", "library", "glossary", "glossary-bundle.json");

/** Files whose entries are unreviewed LLM output with demonstrated fabrications.
 *  2026-07-19 invented "BROCKMAN" (a hiring-assessment method) and "CAVERN" (a data
 *  repository); both are hallucinations, and it also swept in CVV from a payment email
 *  and an art-teaching site. Entries from these files are kept but flagged `review:true`
 *  and hidden from the default list until a human clears them. */
const REVIEW_REQUIRED_FILES = new Set(["2026-07-19-terms.md"]);

/** Trailing conversational filler some weekly runs committed verbatim. */
const CHATTER = /^(please let me know|let me know if|hope this helps|feel free to)/i;

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const keyOf = (s) => norm(s).toLowerCase();

function readIf(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

// ── 1. curated dataset (also the source of the category taxonomy) ──────────────
function loadCurated() {
  const raw = readIf(path.join(ROOT, "web", "ai-init", "glossary-data.js"));
  if (!raw) return [];
  const a = raw.indexOf("[");
  const b = raw.lastIndexOf("]");
  if (a < 0 || b < 0) throw new Error("glossary-data.js: could not locate the JSON array");
  return JSON.parse(raw.slice(a, b + 1)).map((e) => ({
    term: norm(e.abbr),
    expansion: norm(e.expansion),
    desc: norm(e.desc),
    category: norm(e.category) || "Uncategorized",
    tags: Array.isArray(e.tags) ? e.tags : [],
    related: Array.isArray(e.related) ? e.related : [],
    kind: norm(e.desc) ? "definition" : "stub",
    origin: "curated",
    review: false,
  }));
}

// ── 2. weekly files ────────────────────────────────────────────────────────────
// FOUR different shapes have been committed over the five runs. They are parsed by
// splitting on heading level rather than by lookahead regexes — JavaScript has no \z,
// and an earlier lookahead version silently dropped every file's LAST term.
//   A  "### **Term**" + "#### Definition" + "#### Explanation"      (2026-07-20)
//   B  "## Term"      + "Definition: …"   + "Explanation: …"        (2026-08-10)
//   C  "* **TERM**: definition" + "\t+ elaboration"                 (2026-07-19)
//   D  "## Term"      + a bare paragraph, no labels                 (2026-08-03)

/** Split markdown into [{heading, body}] at the given heading level. */
function sectionsOf(text, hashes) {
  const re = new RegExp("^" + hashes + " +(.+?)\\s*$", "gm");
  const out = [];
  const marks = [...text.matchAll(re)];
  marks.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    out.push({ heading: m[1].replace(/\*\*/g, "").trim(), body: text.slice(start, end) });
  });
  return out;
}

/** Container headings that group terms rather than naming one. */
const CONTAINER = /^(abbreviations|platforms|added terms|new additions)\:?$/i;

/** Sub-headings that group bullets ("Terms with 0 previous additions:", "New additions:")
 *  rather than naming a term. Anything ending in a colon is a grouping label, not a term. */
const GROUPING = /(^terms with|^definitions for|^new additions|:\s*$)/i;

function descFromBody(body) {
  const labeled =
    body.match(/(?:####\s*)?Definition[:\s]*\n?([\s\S]*?)(?=\n\s*(?:####\s*)?Explanation[:\s]|$)/i);
  const expl = body.match(/(?:####\s*)?Explanation[:\s]*\n?([\s\S]*)$/i);
  if (labeled || expl) {
    return [labeled && labeled[1], expl && expl[1]].filter(Boolean).join(" ");
  }
  // shape D — the body itself is the definition; drop sub-bullets and headings
  return body
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/^[#*+\-]/.test(l.trim()))
    .join(" ");
}

function parseWeekly(file, text) {
  const review = REVIEW_REQUIRED_FILES.has(file);

  // A failed run once committed the provider error as the file body. Detect and skip.
  if (/API call failed after \d+ retries/i.test(text)) {
    return { entries: [], failed: true };
  }

  const out = [];
  for (const sec of sectionsOf(text, "##")) {
    if (CONTAINER.test(sec.heading)) {
      // shape A — "### **Term**" subsections
      for (const sub of sectionsOf(sec.body, "###")) {
        if (CONTAINER.test(sub.heading) || GROUPING.test(sub.heading)) {
          for (const e of parseBullets(sub.body, file, review)) out.push(e);
          continue;
        }
        out.push(mkWeekly(sub.heading, descFromBody(sub.body), file, review));
      }
      // shape C — bullets directly under the container
      for (const e of parseBullets(sec.body, file, review)) out.push(e);
      continue;
    }
    // shapes B and D — the "##" heading is itself the term
    out.push(mkWeekly(sec.heading, descFromBody(sec.body), file, review));
  }

  // de-dupe within the file (a bullet can also be caught by its parent section)
  const seen = new Set();
  const entries = out.filter((e) => {
    if (!e.term || !e.desc) return false;
    const k = keyOf(e.term);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { entries, failed: false };
}

/** shape C: "* **TERM**: definition" optionally followed by "\t+ elaboration". */
function parseBullets(body, file, review) {
  const out = [];
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*\*\s+\*\*(.+?)\*\*\s*[:(]?\s*(.*)$/);
    if (!m) continue;
    let desc = m[2].replace(/\)$/, "");
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s*[+]/.test(lines[j])) desc += " " + lines[j].replace(/^\s*\+\s*/, "");
      else if (/^\s*\*\s+\*\*/.test(lines[j]) || /^#/.test(lines[j])) break;
    }
    out.push(mkWeekly(m[1], desc, file, review));
  }
  return out;
}

function mkWeekly(term, def, file, review) {
  const desc = norm(
    String(def || "")
      .split(/\r?\n/)
      .filter((l) => !CHATTER.test(l.trim()))
      .join(" ")
  );
  return {
    term: norm(term).replace(/\*\*/g, ""),
    expansion: "",
    desc: norm(desc),
    category: "Weekly Additions",
    tags: [],
    related: [],
    kind: "definition",
    origin: `weekly:${file.replace(/-terms\.md$/, "")}`,
    review,
  };
}

function loadWeekly() {
  const dir = path.join(ROOT, "glossary");
  if (!fs.existsSync(dir)) return { entries: [], failedFiles: [], perFile: {} };
  const files = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}-terms\.md$/.test(f)).sort();
  const entries = [];
  const failedFiles = [];
  const perFile = {};
  for (const f of files) {
    const { entries: e, failed } = parseWeekly(f, fs.readFileSync(path.join(dir, f), "utf8"));
    if (failed) failedFiles.push(f);
    perFile[f] = failed ? "FAILED_RUN" : e.length;
    entries.push(...e);
  }
  return { entries, failedFiles, perFile };
}

// ── 3. the Gmail-mined master list ─────────────────────────────────────────────
function loadMined() {
  const raw = readIf(path.join(ROOT, "glossary", "ai-terms-glossary.md"));
  if (!raw) return { entries: [], skipped: 0 };
  const entries = [];
  let skipped = 0;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^- \*\*(.+?)\*\* — (.*)$/);
    if (!m) continue;
    const term = norm(m[1]);
    let body = norm(m[2]);
    const usage = /^_(usage|seen in email):_/i.test(body);
    body = body.replace(/^_(usage|seen in email):_\s*/i, "").replace(/^"|"$/g, "");
    if (!term) { skipped++; continue; }
    entries.push({
      term,
      expansion: "",
      desc: norm(body),
      category: usage ? "Mined from email" : "Foundations & Concepts",
      tags: [],
      related: [],
      kind: usage ? "usage" : "definition",
      origin: "mined",
      review: false,
    });
  }
  return { entries, skipped };
}

// ── merge: first writer wins, so precedence is the order we add ────────────────
function build() {
  const curated = loadCurated();
  const weekly = loadWeekly();
  const mined = loadMined();

  const byKey = new Map();
  const add = (list) => {
    for (const e of list) {
      const k = keyOf(e.term);
      if (!k) continue;
      if (byKey.has(k)) {
        // keep the higher-precedence entry, but let a later source fill a missing desc
        const cur = byKey.get(k);
        if (!cur.desc && e.desc) { cur.desc = e.desc; cur.kind = e.kind; }
        cur.alsoIn = (cur.alsoIn || []).concat(e.origin);
        continue;
      }
      byKey.set(k, { ...e });
    }
  };
  add(curated);
  add(weekly.entries);
  add(mined.entries);

  const terms = [...byKey.values()].sort((a, b) =>
    a.term.localeCompare(b.term, "en", { sensitivity: "base" })
  );

  const stats = {
    total: terms.length,
    bySource: {
      curated: terms.filter((t) => t.origin === "curated").length,
      weekly: terms.filter((t) => t.origin.startsWith("weekly:")).length,
      mined: terms.filter((t) => t.origin === "mined").length,
    },
    byKind: {
      definition: terms.filter((t) => t.kind === "definition").length,
      usage: terms.filter((t) => t.kind === "usage").length,
      stub: terms.filter((t) => t.kind === "stub").length,
    },
    flaggedForReview: terms.filter((t) => t.review).length,
    sourceCounts: {
      curatedFile: curated.length,
      minedFile: mined.entries.length,
      weeklyFiles: weekly.perFile,
    },
    failedWeeklyRuns: weekly.failedFiles,
    categories: [...new Set(terms.map((t) => t.category))].sort(),
  };

  const bundle = { generatedAt: null, stats, terms };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(bundle), "utf8");

  console.log("[glossary] wrote " + path.relative(ROOT, OUT));
  console.log("[glossary] terms: " + stats.total +
    "  (curated " + stats.bySource.curated +
    " + weekly " + stats.bySource.weekly +
    " + mined " + stats.bySource.mined + ")");
  console.log("[glossary] kinds: definition " + stats.byKind.definition +
    ", usage " + stats.byKind.usage + ", stub " + stats.byKind.stub);
  console.log("[glossary] flagged for review: " + stats.flaggedForReview);
  if (weekly.failedFiles.length) {
    console.log("[glossary] WARNING failed weekly runs (no terms): " + weekly.failedFiles.join(", "));
  }
  return stats;
}

if (require.main === module) build();
module.exports = { build };
