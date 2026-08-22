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
 *   0. glossary/verified-terms.json   — definitions checked against a primary/authoritative source,
 *                                       each carrying the citation it was verified against
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
/** Reviewable record of everything the build refused to publish. Regenerated each build. */
const QUARANTINE_OUT = path.join(ROOT, "glossary", "QUARANTINE.md");
/**
 * Terms the estate defines differently from the primary source. Regenerated each build.
 *
 * The one-off report of 2026-08-16 found these by hand (GGUF expanded to a phrase that does
 * not exist and credited to the wrong project; CUDA to an expansion NVIDIA dropped; OAuth to
 * a backronym). Nothing regenerated it, so the next wrong expansion would go unnoticed the
 * same way the first ones did.
 *
 * It does not need a separate pass. The merge below already resolves precedence, and where a
 * cited primary source outranks a curated or mined entry for the same term, the losing text
 * IS the estate's own wrong definition — it was simply being discarded. This records it.
 */
const MISUSE_OUT = path.join(ROOT, "glossary", "MISUSE.md");

/** Files whose entries are unreviewed LLM output with demonstrated fabrications.
 *  2026-07-19 invented "BROCKMAN" (a hiring-assessment method) and "CAVERN" (a data
 *  repository); both are hallucinations, and it also swept in CVV from a payment email
 *  and an art-teaching site. Entries from these files are kept but flagged `review:true`
 *  and hidden from the default list until a human clears them. */
const REVIEW_REQUIRED_FILES = new Set(["2026-07-19-terms.md"]);

/** Trailing conversational filler some weekly runs committed verbatim. */
const CHATTER = /^(please let me know|let me know if|hope this helps|feel free to)/i;

// ── DEFAULT-DENY VALIDATION OF GENERATED SOURCES ──────────────────────────────
// `librarian_weekly` is "compose (librarian gateway) -> commit glossary/<date>-terms.md". An LLM
// writes free-form markdown straight into this repo with no schema, and the build publishes
// whatever parses out of it. Six runs have produced four distinct failure modes: fabricated terms
// (07-19), a provider error committed as the file body (08-02), model chatter committed verbatim
// (07-20), and a run report instead of terms (08-16).
//
// REVIEW_REQUIRED_FILES defends against exactly one of those, and only because a human found it
// first. That is default-allow: every NEW way the generator fails publishes by default. The
// 08-16 run report reached main and did not publish only because its headings were "#" rather
// than "##" — luck of formatting, not a control.
//
// So generated sources are validated structurally here instead. A better prompt cannot fix this;
// a model asked to write prose will sometimes write prose. The boundary is the place to catch it.

/** Prose a generator emits when narrating its own run rather than defining a term. */
const RUN_REPORT = /(^|\n)\s*(verification:|added:|git reports|the request says|updated \/|no missing or extra|markdown validation)/i;

/** Absolute paths, hosts, addresses and credential names that must never reach a public page.
 *  Applied to GENERATED sources only (weekly, mined) — those read from Ivan's private mail and
 *  fleet notes. Hand-authored sources are exempt on purpose: a legitimate security definition
 *  may need to name a cloud metadata address, and silently dropping it would be its own bug. */
const PRIVATE_INFRA = [
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/,                       // IPv4
  /\/(etc|opt|home|var|root|usr\/local)\//,            // absolute unix paths
  /\b[A-Za-z]:[\\/](?:projects|output|Users)\b/i,      // absolute windows paths
  /\b[\w.-]+\.(?:cloud|internal|local|lan)\b/i,        // internal-looking hostnames
  /\b[A-Z][A-Z0-9]*_(?:API_KEY|KEY|TOKEN|SECRET|PASSWORD)\b/,
  /\b(?:localhost|127\.0\.0\.1)(?::\d+)?\b/i,
  /:\d{4,5}\b(?!\s*(?:BC|AD))/,                        // host:port
];

function privateInfraHit(text) {
  const s = String(text || "");
  return PRIVATE_INFRA.find((re) => re.test(s)) || null;
}

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

/**
 * Compare two expansions for MEANING, not for typography.
 *
 * "HyperText Transfer Protocol" and "Hypertext Transfer Protocol" are the same expansion
 * written twice; reporting that pair as a misuse would bury the real findings under casing
 * noise, and a report nobody trusts gets ignored — which is how the first wrong expansions
 * survived. Folds case, punctuation, hyphens and spacing; keeps word content, because that
 * is where "GGML Unified Format" differs from the real thing.
 */
const normExpansion = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const keyOf = (s) => norm(s).toLowerCase();

function readIf(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

// ── 0. verified dataset — highest precedence ──────────────────────────────────
// These entries were checked against the RFC, the spec, the paper or the vendor's own
// reference, and each carries the citation. They outrank every other source on purpose:
// where a curated or mined entry disagrees with a cited primary source, the source wins.
function verifiedEntryIsValid(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  const requiredText = [entry.term, entry.desc, entry.source];
  if (requiredText.some((value) => typeof value !== "string" || !value.trim())) return false;
  if (typeof entry.sourceUrl !== "string" || !entry.sourceUrl.trim()) return false;
  try {
    const sourceUrl = new URL(entry.sourceUrl.trim());
    const protocolAllowed = sourceUrl.protocol === "http:" || sourceUrl.protocol === "https:";
    const hostnameLabels = sourceUrl.hostname.split(".");
    const hostnameValid = Boolean(sourceUrl.hostname)
      && hostnameLabels.every((label) => label && !label.startsWith("-") && !label.endsWith("-"));
    return protocolAllowed && hostnameValid;
  } catch {
    return false;
  }
}

function loadVerified() {
  const raw = readIf(path.join(ROOT, "glossary", "verified-terms.json"));
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return (parsed.terms || []).map((e, index) => {
    if (!verifiedEntryIsValid(e)) {
      throw new Error(`verified-terms.json entry ${index + 1} is invalid`);
    }
    return {
      term: norm(e.term),
      expansion: norm(e.expansion),
      desc: norm(e.desc),
      category: norm(e.category) || "Uncategorized",
      tags: [],
      related: [],
      kind: "definition",
      origin: "verified",
      review: false,
      // Public-facing provenance. A glossary entry a reader cannot trace is a claim, not a definition.
      source: norm(e.source),
      sourceUrl: norm(e.sourceUrl),
      misread: norm(e.misread),
    };
  });
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
    return { entries: [], failed: true, reason: "provider error committed as the file body" };
  }

  // 2026-08-16 committed the generator's own run report — "Added: 40 supplied abbreviation
  // terms…", "Verification: …", "Note: the request says '490,' but the supplied list contains
  // 40" — plus two absolute server paths, and no term definitions at all.
  if (RUN_REPORT.test(text)) {
    return { entries: [], failed: true, reason: "run report / narration, not term definitions" };
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

  // A run that parses to nothing is a failed run, whatever the reason. Previously only the two
  // recognised shapes above were reported and any other empty file passed silently.
  if (!entries.length) {
    return { entries, failed: true, reason: "parsed to zero terms" };
  }
  return { entries, failed: false, reason: null };
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
    const { entries: e, failed, reason } = parseWeekly(f, fs.readFileSync(path.join(dir, f), "utf8"));
    if (failed) failedFiles.push({ file: f, reason });
    perFile[f] = failed ? "FAILED_RUN" : e.length;
    entries.push(...e);
  }
  return { entries, failedFiles, perFile };
}

// ── 3. the Gmail-mined master list ─────────────────────────────────────────────
// USAGE SNIPPETS ARE NOT PUBLISHED. The miner recorded, for every term it had no definition
// for, a fixed-width character window cut out of the surrounding email or memory text. Those are
// not definitions and never were — they are mid-sentence fragments that happen to contain the
// term, so "AB" was documented by a music-marketing subject line and "AA" by a fragment of the
// phrase "WCAG AA". Worse, because the corpus is Ivan's private mail and fleet notes, dozens of
// them carried absolute filesystem paths, host names, ports and internal usernames onto a public
// page — and glossary-bundle.json is world-readable, so hiding them client-side would not have
// helped. They are dropped at parse time and counted, never emitted.
const USAGE_MARKER = /^_(usage|seen in email):_/i;

function loadMined() {
  const raw = readIf(path.join(ROOT, "glossary", "ai-terms-glossary.md"));
  if (!raw) return { entries: [], skipped: 0, usageDropped: 0 };
  const entries = [];
  let skipped = 0;
  let usageDropped = 0;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^- \*\*(.+?)\*\* — (.*)$/);
    if (!m) continue;
    const term = norm(m[1]);
    let body = norm(m[2]);
    if (USAGE_MARKER.test(body)) { usageDropped++; continue; }
    body = body.replace(/^"|"$/g, "");
    if (!term) { skipped++; continue; }
    entries.push({
      term,
      expansion: "",
      desc: norm(body),
      category: "Foundations & Concepts",
      tags: [],
      related: [],
      kind: "definition",
      origin: "mined",
      review: false,
    });
  }
  return { entries, skipped, usageDropped };
}

// ── merge: first writer wins, so precedence is the order we add ────────────────
function build() {
  const verified = loadVerified();
  const curated = loadCurated();
  const weekly = loadWeekly();
  const mined = loadMined();

  const byKey = new Map();
  // Disagreements between a cited primary source and the estate's own wording. Collected
  // during the merge because that is the only place both versions of a term coexist.
  const misuse = [];
  const add = (list) => {
    for (const e of list) {
      const k = keyOf(e.term);
      if (!k) continue;
      if (byKey.has(k)) {
        // keep the higher-precedence entry, but let a later source fill a missing desc
        const cur = byKey.get(k);
        // Only a CITED entry can convict another of being wrong. A curated entry beating a
        // mined one is precedence, not error — neither was checked against anything, so
        // recording it would fill the report with noise and bury the real findings.
        if (cur.origin === "verified" && cur.sourceUrl) {
          const a = normExpansion(cur.expansion);
          const b = normExpansion(e.expansion);
          // An EMPTY verified expansion is a finding, not a gap. Several terms are not
          // acronyms at all — GGUF is the case that started this: the estate expanded it to
          // "GGML Unified Format", a phrase that appears in no specification. Requiring both
          // sides to be non-empty would make this detector blind to exactly the error it was
          // built for, and it would have looked clean while being useless.
          // ...but only when the estate actually INVENTED words. "gRPC" expanded to "gRPC",
          // or "Transformer" to "Transformer Architecture", is the term restated, not a false
          // acronym expansion. Listing those buries GGUF-class findings under rows of nothing,
          // and a report nobody trusts is read exactly as often as no report.
          //
          // ⚠ A PLAIN PREFIX TEST IS TOO BLUNT HERE, and this was caught by mutating the real
          // data rather than by reading the code: `startsWith` silently swallowed
          // "GGUF" -> "GGUF Unified Format", which is an invented expansion one word away from
          // the historical bug this detector exists for. Any term that happens to prefix its
          // own false expansion escaped. Short terms are worst — `AA` is two characters.
          //
          // So a restatement is the term ALONE, or the term plus at most one descriptor word
          // ("Transformer Architecture"). Term plus two or more words is a phrase presented as
          // an expansion, which is the thing being looked for.
          // ⚠⚠ SECOND correction, from a cross-model review of the first one. Comparing
          // SQUASHED strings with startsWith ignores word boundaries, so any single word
          // beginning with the term's letters read as a restatement: `AA` vs "Aardvark"
          // matched, the tail "rdvark" counted as one word, and a real invented expansion
          // was suppressed. `MAC` vs "Machine" the same. The slice compounded it — the
          // prefix was established on squashed text but sliced off the unsquashed string,
          // so it could cut mid-word.
          //
          // Match on WORD boundaries instead: find the fewest leading words of the
          // expansion whose squashed form equals the squashed term. That still absorbs
          // pure respacing ("PagedAttention" -> "Paged Attention") without letting an
          // unrelated word in. Anything beyond one trailing descriptor is a phrase being
          // presented as an expansion, which is the thing being looked for.
          const squash = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const extraWords = (() => {
            const target = squash(cur.term);
            if (!target) return null;
            const words = normExpansion(e.expansion).split(/\s+/).filter(Boolean);
            let acc = "";
            for (let i = 0; i < words.length; i += 1) {
              acc += words[i];
              if (acc === target) return words.length - (i + 1);
              if (!target.startsWith(acc)) break;   // diverged; cannot become a restatement
            }
            return null;
          })();
          const restatesTerm = extraWords !== null && extraWords <= 1;
          if (b && !a && !restatesTerm) {
            misuse.push({
              term: cur.term, correct: "(no expansion — not an acronym)",
              asUsed: e.expansion, origin: e.origin,
              source: cur.source, sourceUrl: cur.sourceUrl, kind: "invented",
            });
          } else if (a && b && a !== b) {
            misuse.push({
              term: cur.term, correct: cur.expansion, asUsed: e.expansion,
              origin: e.origin, source: cur.source, sourceUrl: cur.sourceUrl,
              kind: "wrong",
            });
          }
        }
        if (!cur.desc && e.desc) { cur.desc = e.desc; cur.kind = e.kind; }
        cur.alsoIn = (cur.alsoIn || []).concat(e.origin);
        continue;
      }
      byKey.set(k, { ...e });
    }
  };
  // QUARANTINE, not filter. Entries marked `review` are fabricated or off-topic; they are
  // dropped from the bundle entirely rather than shipped and hidden client-side, because a
  // hidden entry is still a retrievable one — anyone can fetch glossary-bundle.json.
  // A glossary that invents terms is worse than one with gaps.
  //
  // Quarantine happens BEFORE the dedupe on purpose. If it ran after, a quarantined weekly
  // entry would already have claimed its key and suppressed a legitimate lower-precedence
  // entry for the same term, silently removing a real definition along with a fake one.
  // (None of today's four collide, but the ordering trap is real and cheap to avoid.)
  const quarantined = dedupeByTerm(weekly.entries.filter((e) => e.review));

  // Generated entries carrying private infrastructure are dropped regardless of which generated
  // source produced them. The mined corpus proved this was necessary (49 published entries with
  // paths, hosts, addresses and ports); the 08-16 weekly file proves the generator emits the same
  // material, so the guard belongs on the shared path rather than on one loader.
  const infraDropped = [];
  const clean = (list) =>
    list.filter((e) => {
      const hit = privateInfraHit(e.desc) || privateInfraHit(e.expansion);
      if (!hit) return true;
      infraDropped.push({ term: e.term, origin: e.origin, pattern: String(hit) });
      return false;
    });

  add(verified);
  add(curated);
  add(clean(weekly.entries.filter((e) => !e.review)));
  add(clean(mined.entries));

  const terms = [...byKey.values()].sort((a, b) =>
    a.term.localeCompare(b.term, "en", { sensitivity: "base" })
  );

  writeQuarantineReport(quarantined, weekly.failedFiles, infraDropped);
  // Same term can lose to the cited entry once per lower-precedence source, so a term
  // present in both curated and mined reported twice. Dedupe on what the row actually says.
  const seenMisuse = new Set();
  const misuseUnique = misuse.filter((m) => {
    const k = keyOf(m.term) + " " + normExpansion(m.asUsed);
    if (seenMisuse.has(k)) return false;
    seenMisuse.add(k);
    return true;
  });
  writeMisuseReport(misuseUnique);

  const stats = {
    published: terms.length,
    // The COUNT is public so the page can be honest about gaps; the NAMES are not, because
    // naming an invented term in a public file still publishes it. They live in
    // glossary/QUARANTINE.md (repo) and in the build log.
    quarantined: quarantined.length,
    // Usage snippets are no longer publishable at all — see loadMined(). Reported so the drop in
    // the published count reads as a deliberate removal rather than a source that quietly shrank.
    usageSnippetsDropped: mined.usageDropped,
    // Generated entries refused for carrying private infrastructure. The COUNT is public so the
    // page can be honest that a filter ran; the matched text is not, for obvious reasons.
    privateInfraDropped: infraDropped.length,
    // How many published entries carry a citation to the source their meaning was checked against.
    cited: terms.filter((t) => t.source).length,
    bySource: {
      verified: terms.filter((t) => t.origin === "verified").length,
      curated: terms.filter((t) => t.origin === "curated").length,
      weekly: terms.filter((t) => t.origin.startsWith("weekly:")).length,
      mined: terms.filter((t) => t.origin === "mined").length,
    },
    byKind: {
      definition: terms.filter((t) => t.kind === "definition").length,
      usage: terms.filter((t) => t.kind === "usage").length,
      stub: terms.filter((t) => t.kind === "stub").length,
    },
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

  // Report published and dropped together. Printing only the smaller number would look like
  // the source shrank, which is exactly the kind of quiet drift this pipeline already suffered.
  console.log("[glossary] wrote " + path.relative(ROOT, OUT));
  console.log("[glossary] parsed " + (stats.published + stats.quarantined) + " terms from source" +
    "  ->  PUBLISHED " + stats.published + ", DROPPED " + stats.quarantined);
  console.log("[glossary] published breakdown: verified " + stats.bySource.verified +
    " + curated " + stats.bySource.curated +
    " + weekly " + stats.bySource.weekly + " + mined " + stats.bySource.mined +
    "  (definition " + stats.byKind.definition + ", usage " + stats.byKind.usage +
    ", stub " + stats.byKind.stub + ")");
  console.log("[glossary] " + stats.cited + " entries carry a source citation");
  if (stats.usageSnippetsDropped) {
    console.log("[glossary] dropped " + stats.usageSnippetsDropped +
      " mined usage snippets (email/memory fragments, not definitions — never published)");
  }
  if (quarantined.length) {
    console.log("[glossary] WARNING dropped " + quarantined.length +
      " fabricated/off-topic entries -> " + path.relative(ROOT, QUARANTINE_OUT));
    for (const q of quarantined) {
      console.log("[glossary]   - " + q.term + "  (from " + q.origin.replace("weekly:", "") + "-terms.md)");
    }
  }
  if (infraDropped.length) {
    console.log("[glossary] WARNING refused " + infraDropped.length +
      " generated entries carrying private infrastructure -> " +
      path.relative(ROOT, QUARANTINE_OUT));
  }
  if (weekly.failedFiles.length) {
    console.log("[glossary] WARNING failed weekly runs (no terms published):");
    for (const f of weekly.failedFiles) {
      console.log("[glossary]   - " + f.file + "  (" + f.reason + ")");
    }
  }
  return stats;
}

/** Collapse duplicate terms within a single list, keeping the first. */
/**
 * Regenerate glossary/MISUSE.md — terms the estate defines differently from the source.
 *
 * Written on EVERY build, including when the list is empty, and the empty file says so
 * explicitly. A report that is only written when it has findings is indistinguishable from
 * a build that did not run, which is the failure this pipeline already had once: the weekly
 * markdown fed nothing and nobody noticed for months.
 *
 * This is repo-only. It names Ivan's own wrong definitions, so it must not become a public
 * artefact the way the mined usage snippets did.
 */
function writeMisuseReport(misuseIn) {
  let misuse = misuseIn;
  const lines = [
    "# Terms the estate defines differently from the source",
    "",
    "**Regenerated by `scripts/build-glossary-bundle.cjs` on every build. Do not edit by hand.**",
    "",
    "Each row is a term where a definition checked against a primary source disagrees with the",
    "expansion the estate had been using. The citation is what makes it a finding rather than an",
    "opinion: the `correct` column is what the linked source says, not what seemed right.",
    "",
    "Only entries carrying a `sourceUrl` can convict another of being wrong. A curated entry",
    "outranking a mined one is precedence, not error — neither was verified, so those are not",
    "listed. Casing and punctuation differences are folded and never reported.",
    "",
    "⚠ Repo-only. These are the estate's own errors and some name internal habits; this file is",
    "not published, unlike the bundle.",
    "",
  ];
  // Defence in depth. The mined and weekly tiers are ALREADY passed through clean() before
  // the merge, so nothing carrying private infrastructure should reach this array — a
  // cross-model review claimed otherwise and was wrong about that. But this file is
  // committed, the mined tier reads private mail, and the cost of checking twice is one
  // predicate, so the belt goes on next to the braces.
  misuse = misuse.filter((m) => {
    // ⚠⚠ DO NOT extend this to `source`/`sourceUrl`. It was tried, on a reviewer's
    // suggestion that excluding them was arbitrary, and it silently deleted the only
    // real finding in the report: PRIVATE_INFRA's host:port rule (`:\d{4,5}`) matches
    // "arXiv:1810" inside the BERT citation. The row was withheld and the report then
    // said "No disagreements in this build" — a clean result manufactured by
    // suppressing the signal, which is the exact failure this file exists to prevent.
    //
    // The exclusion is not arbitrary: these fields are hand-authored public citations,
    // while PRIVATE_INFRA is tuned for GENERATED text mined from private mail. Applying
    // a generated-content filter to curated citations costs findings and buys nothing.
    const hit = privateInfraHit(m.asUsed) || privateInfraHit(m.correct);
    if (hit) {
      console.log("[glossary] misuse row withheld (private infrastructure): " + m.term);
      return false;
    }
    return true;
  });
  if (!misuse.length) {
    lines.push(
      "## No disagreements in this build",
      "",
      "Every verified term's expansion matched the estate's, or the term appeared in only one",
      "source. This section is written even when empty on purpose — an absent report and a clean",
      "one must not look alike."
    );
  } else {
    lines.push(
      "## " + misuse.length + " disagreement(s)",
      "",
      "| term | correct (per source) | as the estate used it | where | source |",
      "|---|---|---|---|---|"
    );
    for (const m of misuse.slice().sort((a, b) => a.term.localeCompare(b.term))) {
      lines.push(
        "| `" + m.term + "` | " + (m.correct || "—") + " | " + (m.asUsed || "—") +
        " | " + m.origin + " | [" + (m.source || "source") + "](" + m.sourceUrl + ") |"
      );
    }
  }
  lines.push("");
  fs.writeFileSync(MISUSE_OUT, lines.join("\n"), "utf8");
}

function dedupeByTerm(list) {
  const seen = new Set();
  return list
    .filter((e) => {
      const k = keyOf(e.term);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
}

/** Writes the dropped entries to a reviewable file in the repo, so the fact that the
 *  generator produced fabrications stays visible after they leave the bundle. */
function writeQuarantineReport(quarantined, failedFiles, infraDropped) {
  const lines = [
    "# Glossary quarantine",
    "",
    "> Generated by `scripts/build-glossary-bundle.cjs` on every build. **Do not edit by hand.**",
    "",
    "Entries listed here were produced by the weekly glossary generator and are **excluded from",
    "`glossary-bundle.json` entirely** — not merely hidden by the page. They are kept here so the",
    "fact that the generator produced them stays visible to the next reader.",
    "",
    "To clear an entry: correct or delete it in its source file, then remove that file from",
    "`REVIEW_REQUIRED_FILES` in the generator. Nothing is auto-cleared.",
    "",
    "| term | source file | reason | text as generated |",
    "| --- | --- | --- | --- |",
  ];
  for (const q of quarantined) {
    const src = q.origin.replace("weekly:", "") + "-terms.md";
    const txt = (q.desc || "").replace(/\|/g, "\\|").slice(0, 160);
    lines.push(`| \`${q.term}\` | \`glossary/${src}\` | unreviewed generator output | ${txt} |`);
  }
  lines.push("");
  lines.push("## Runs that produced no terms at all");
  lines.push("");
  if (failedFiles.length) {
    for (const f of failedFiles) {
      lines.push(`- \`glossary/${f.file}\` — ${f.reason}.`);
    }
  } else {
    lines.push("_None._");
  }

  lines.push("");
  lines.push("## Generated entries refused for carrying private infrastructure");
  lines.push("");
  lines.push("The weekly and mined sources read from private mail and fleet notes. Any entry whose");
  lines.push("text matches an absolute path, host name, address, port or credential name is dropped");
  lines.push("before it can reach a public page. **The matched text is deliberately not reproduced");
  lines.push("here** — this file is in the repo, and quoting the leak would defeat the filter.");
  lines.push("");
  if (infraDropped && infraDropped.length) {
    lines.push("| term | source | pattern matched |");
    lines.push("| --- | --- | --- |");
    for (const d of infraDropped) {
      lines.push(`| \`${d.term}\` | \`${d.origin}\` | \`${d.pattern.replace(/\|/g, "\\|")}\` |`);
    }
  } else {
    lines.push("_None._");
  }
  lines.push("");
  fs.mkdirSync(path.dirname(QUARANTINE_OUT), { recursive: true });
  fs.writeFileSync(QUARANTINE_OUT, lines.join("\n"), "utf8");
}

if (require.main === module) build();
module.exports = { build };
