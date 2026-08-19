#!/usr/bin/env python3
"""Propose glossary terms from the estate's corpora. Never writes definitions.

WHY THIS EXISTS, AND WHY IT DOES LESS THAN YOU MIGHT EXPECT
-----------------------------------------------------------
`librarian_weekly` already tries to do the whole job: an LLM reads the corpora and
commits `glossary/<date>-terms.md` with definitions in it. Six runs produced four
distinct failure modes -- fabricated terms (2026-07-19 invented BROCKMAN and CAVERN),
a provider error committed as the file body (2026-08-02), model chatter committed
verbatim (2026-07-20), and a run report instead of terms (2026-08-16). Two of six
runs published nothing usable and one published hallucinations.

The cause is structural, not a prompt problem. Asking a model to discover a term and
define it in one pass gives it no way to fail loudly: if it cannot find what a term
means, the fluent thing to do is write a plausible definition, and a plausible
definition is indistinguishable from a real one until someone checks the source.

So this script splits the job at the seam where confidence and verifiability diverge:

    DISCOVERY  (mechanical, automatable, this script)
        Which terms appear in the corpora, often, that the glossary does not have?
        A frequency count cannot hallucinate.

    DEFINITION (judgement, NOT automatable, deliberately left out)
        What does the term mean, and which primary source says so?
        This requires finding the RFC / spec / paper / vendor reference and reading it.

`glossary/verified-terms.json` states the rule this enforces: "the estate is the
DISCOVERY source, never the AUTHORITY source". This script is the discovery half made
explicit. It emits a worklist with `source` and `sourceUrl` left EMPTY on purpose --
the build publishes from verified-terms.json, so an unfilled skeleton cannot reach the
site by accident. Nothing here writes to a published file.

MEASURED PRECISION, PER CORPUS (2026-08-19)
--------------------------------------------
Precision here means: of the terms proposed, how many are worth writing an entry for.
Both figures are counted by hand from a real run, not estimated.

  SESSIONS  4,826 distilled sessions, --min-count 4 --top 30  ->  ~43%
            Kept: ADC, PAT, NATS, PID, ADB, APK, R2, HEAD, n8n, pre-commit,
            cherry-pick, private-key, llama-3.
            Noise: estate project names (agent-repos, fleet-skills, graphify-out,
            pi-agent) and shouted words (PREVIOUS, RESPONSE).

  EMAIL     16,062 messages, --min-count 8 --top 40  ->  ~10-15%
            Kept: CEO, LLC, GMT, PEP-8, GPT-5.
            Noise: newsletter capitals, URL path fragments (cdn-cgi, github-learn),
            region codes, tracking hashes.

**The email corpus is the weaker discovery source, and that is worth knowing before
wiring it into anything recurring.** It is ~84% marketing newsletters and GitHub CI
notifications, so most of what is frequent in it is not vocabulary. It stays opt-in
via --email-host rather than on by default. Vendor announcements do carry genuinely
new terminology, but at this signal-to-noise a human skim of the top 40 is the
honest way to use it.

Three filter generations were needed to get here, each fixing something measured:
 1. ~7%  -- first version. Title-Case words (`Nothing`, `Women`, `Telegram`) and
           estate names dominated.
 2. ~27% -- rejected Title-Case singles outright, matched estate stems by prefix.
 3. ~43% -- added units, region codes, hyphenated English, tracking-id and CSS
           filters, document-frequency counting, and the shouted-word test below.

The residual noise is estate project names, which are orthographically identical to
real technical terms. No shape rule separates `fleet-skills` from `yt-dlp`. Going
further needs semantic judgement -- the half of the job this script does not do.

What the script is actually worth: it reduces two corpora to a few dozen ranked,
deduplicated proposals. The reduction is the automatable part. The verification is not.

USAGE
    python scripts/glossary-candidates.py                       # default corpora
    python scripts/glossary-candidates.py --min-count 8 --top 40
    python scripts/glossary-candidates.py --out glossary/candidates-2026-08-19.json

The email corpus lives on another host and is read over SSH when --email-host is
given; without it the script uses the session corpus alone and says so in the report.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ── Sources of terms already known, so we never propose a duplicate ────────────
BUNDLE = ROOT / "web" / "library" / "glossary" / "glossary-bundle.json"
VERIFIED = ROOT / "glossary" / "verified-terms.json"

DEFAULT_SESSION_DB = Path(r"D:\output\session_kb\session_kb.db")
DEFAULT_EMAIL_DB = "/home/opc/email_db/emails.db"

# ── Exclusion classes, carried over from GLOSSARY-EXCLUSIONS-2026-08-16 ────────
# Each of these was a category of junk that reached the published page once already.
# They are encoded here so the same class cannot be rediscovered by hand every week.

#: Prose written in capitals. The extractor cannot tell an acronym from an
#: emphasised English word, and roughly 200 of these ranked highly on frequency.
PROSE_CAPS = {
    "WHERE", "HIGH", "GOOD", "BEFORE", "CURRENT", "EXACTLY", "REQUIRED", "ACTUAL",
    "ADDED", "NOT", "AND", "THE", "BUT", "ALL", "ANY", "NEW", "OLD", "YES", "NO",
    "ONLY", "NEVER", "ALWAYS", "MUST", "SHOULD", "TODO", "FIXME", "NOTE", "WARNING",
    "ERROR", "FAILED", "PASSED", "OK", "DONE", "FIX", "WHY", "HOW", "WHAT", "WHEN",
    "TRUE", "FALSE", "NULL", "NONE", "REAL", "FULL", "MORE", "LESS", "THIS", "THAT",
    "STILL", "NOW", "THEN", "ALSO", "ONE", "TWO", "EACH", "BOTH", "EVERY", "SAME",
}

#: Ambiguous two-letter tokens with several unrelated expansions the estate never
#: disambiguates. An entry that guesses which was meant is worse than no entry.
AMBIGUOUS_SHORT = {"MA", "SE", "CL", "SD", "CN", "DD", "CC", "II", "AB", "AA", "AC", "AD", "AE"}

#: Brand and product names. A glossary of jargon is not a directory of companies.
#: Names that genuinely ARE the technical term (CUDA, vLLM, gRPC, ONNX, FTS5) are
#: not listed here and remain eligible.
BRANDS = {
    "GITHUB", "YOUTUBE", "LINKEDIN", "TIKTOK", "WHATSAPP", "NVIDIA", "JETBRAINS",
    "ELEVENLABS", "DEEPSEEK", "RUNPOD", "OPENAI", "ANTHROPIC", "GOOGLE", "MICROSOFT",
    "AMAZON", "META", "APPLE", "SLACK", "DISCORD", "NOTION", "FIGMA", "VERCEL",
    "SUPABASE", "CLOUDFLARE", "STRIPE", "SPOTIFY", "NETFLIX", "REDDIT", "TWITTER",
}

#: Harness, fleet and LifeOS internals. Public glossary, private infrastructure.
ESTATE_INTERNAL = {
    "TELOS", "LIFEOS", "PULSE", "HERMES", "CHLOE", "IRIS", "ANDERSON", "SHERIFF",
    "BANKER", "ARTIST", "LIBRARIAN", "DISPATCH", "COWORK", "KVM2", "ORACLE",
    "MEMORY", "SKILL", "HOOK", "AGENT", "SESSION", "FABLE", "GITNEXUS",
}

#: JSON keys and code identifiers -- artefacts of scanning transcripts and source.
CAMEL_OR_SNAKE = re.compile(r"(?:[a-z][A-Z])|(?:^[a-z]+_)|(?:_[a-z]+$)")

#: Estate-internal name STEMS. Matched as prefixes, because the corpus is full of
#: `hermes-home`, `iris-hermes`, `chloe-memory`, `anderson-`, `librarian-` and so on.
#: An exact-match set misses every one of those; a first measured run proposed 13 of
#: them inside the top 60.
INTERNAL_STEMS = (
    "hermes", "chloe", "iris", "anderson", "sheriff", "banker", "artist", "librarian",
    "soul-", "sdforest", "lifeos", "telos", "pulse", "dispatch", "cowork", "kvm",
    "morning-news", "hypertrophy", "health-os", "womens", "anchor-", "openrouter-",
    "gitnexus", "mempalace", "printing-press", "dopellm", "anycloudllm",
)

#: File extensions and version fragments that survive tokenisation (`ps1`, `v1`, `v2`).
FILE_OR_VERSION = re.compile(r"^(?:v\d+|ps1|sh|py|js|cjs|mjs|ts|md|json|yaml|yml|exe|dll|mp3|mp4|png|jpg|pdf)$", re.I)

#: Ordinary English that happens to be hyphenated. The hyphen rule below exists to
#: catch `sqlite-vec` and `yt-dlp`; it also catches every compound adjective in the
#: language, which is the single largest noise class after proper nouns.
HYPHENATED_ENGLISH = {
    "end-to-end", "read-only", "step-by-step", "pre-existing", "real-time", "sign-in",
    "cross-model", "mid-sentence", "two-hop", "one-off", "up-to-date", "well-known",
    "so-called", "long-running", "short-lived", "built-in", "opt-in", "opt-out",
    "follow-up", "trade-off", "work-around", "hand-authored", "case-insensitive",
    "case-sensitive", "self-hosted", "single-machine", "per-user", "per-page",
    "left-hand", "right-hand", "high-level", "low-level", "first-class", "second-guess",
    "real-world", "third-party", "long-term", "short-term", "in-app", "scale-down",
    "scale-up", "e-mail", "web-version", "use-policy", "open-source", "code-review",
    "ai-powered", "ai-generated", "ai-native", "ai-driven", "ai-first", "ai-assisted",
    "on-premise", "off-the-shelf", "out-of-the-box", "day-to-day", "state-of-the-art",
}

#: Tracking identifiers and content hashes from marketing email. Long hex or
#: mixed alphanumeric runs with no vowel pattern -- `d619a6cb8250`, `egrmw9`.
TRACKING_ID = re.compile(r"^(?=.*\d)[0-9a-f]{6,}$", re.I)

#: Units and measures. Frequent, and never glossary terms in their own right.
UNITS = {"GB", "MB", "KB", "TB", "KIB", "MIB", "GIB", "TIB", "MS", "NS", "HZ", "GHZ", "PX", "PT"}

#: Two-letter region codes read as acronyms by any shape-based filter.
REGION_CODES = {"EU", "US", "UK", "BG", "DE", "FR", "CN", "JP", "IN", "CA", "AU", "NL"}

#: Anything shaped like private infrastructure never becomes a candidate. This is
#: the same list the bundle builder applies to generated sources; applied here too
#: so a leak cannot even reach a worklist a human might paste from.
PRIVATE_INFRA = [
    re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    re.compile(r"/(?:etc|opt|home|var|root|usr/local)/"),
    re.compile(r"\b[A-Za-z]:[\\/](?:projects|output|Users)\b", re.I),
    re.compile(r"\b[\w.-]+\.(?:cloud|internal|local|lan)\b", re.I),
    re.compile(r"\b[A-Z][A-Z0-9]*_(?:API_KEY|KEY|TOKEN|SECRET|PASSWORD)\b"),
    re.compile(r"\b(?:localhost|127\.0\.0\.1)(?::\d+)?\b", re.I),
]

#: Candidate shape: 2-12 chars, letters/digits/hyphen, at least one letter. Matches
#: both classic acronyms (IDF, HNSW) and named techniques (sqlite-vec, BM25).
CANDIDATE = re.compile(r"\b[A-Za-z][A-Za-z0-9-]{1,11}\b")


def private_infra_hit(text: str) -> bool:
    return any(p.search(text) for p in PRIVATE_INFRA)


def known_terms() -> set[str]:
    """Every term already published or already awaiting publication."""
    known: set[str] = set()
    for path, key in ((BUNDLE, "terms"), (VERIFIED, "terms")):
        if not path.exists():
            continue
        doc = json.loads(path.read_text(encoding="utf-8"))
        for entry in doc.get(key, []):
            known.add(entry["term"].strip().lower())
    return known


def is_plausible_term(tok: str) -> bool:
    """Cheap structural filter. Deliberately conservative -- a rejected candidate
    costs nothing, while a junk candidate costs a human's attention every week.

    The hard case is that a sentence-initial capitalised word is orthographically
    identical to an acronym. `Nothing`, `However`, `Manager` and `Women` all reached
    the top 60 of a first measured run for that reason, alongside proper nouns like
    `Telegram` and `Cerebras`. There is no way to separate them on shape, so
    Title-Case single words are not accepted at all: real Title-Case glossary terms
    ("Late chunking") come from human curation, not from mining, and losing them here
    costs nothing because a human is writing the entry either way.

    What survives is the shape a term actually has: an all-caps acronym, or a name
    carrying a digit or hyphen (BM25, FTS5, sqlite-vec, GPT-4).
    """
    upper = tok.upper()
    lower = tok.lower()

    if len(tok) < 2 or tok.isdigit():
        return False
    if upper in PROSE_CAPS or upper in AMBIGUOUS_SHORT:
        return False
    if upper in BRANDS or upper in ESTATE_INTERNAL:
        return False
    if upper in UNITS or upper in REGION_CODES:
        return False
    if lower in HYPHENATED_ENGLISH or TRACKING_ID.match(tok):
        return False
    if CAMEL_OR_SNAKE.search(tok) or FILE_OR_VERSION.match(tok):
        return False
    if any(lower.startswith(stem) for stem in INTERNAL_STEMS):
        return False
    # Tokenisation fragments: a trailing or leading hyphen means the token was cut
    # out of a longer compound (`anderson-`, `anchor-`).
    if tok.startswith("-") or tok.endswith("-"):
        return False

    has_digit = any(c.isdigit() for c in tok)
    has_hyphen = "-" in tok

    # (a) all-caps acronym of a believable length
    if tok.isupper() and 2 <= len(tok) <= 8:
        return True
    # (b) a name carrying a digit or hyphen -- BM25, FTS5, sqlite-vec, GPT-4
    if (has_digit or has_hyphen) and not tok.istitle():
        return True
    # Everything else -- Title-Case words, ordinary lowercase words -- is rejected.
    return False


def harvest_sessions(db: Path, limit_rows: int | None = None) -> Counter:
    """Count candidate terms across distilled session artefacts.

    Reads the DISTILLED text (questions, summaries, resolutions, corrections), not
    raw transcripts -- the distilled rows are the estate's own judgement about what
    mattered, so a term frequent there is frequent in work that got done.

    Counts DOCUMENT frequency: how many distinct sessions mention the term, not how
    many times it occurs. A term repeated forty times inside one long session is one
    session's worth of evidence, and counting it forty times says otherwise.
    """
    per_session: dict[str, set[str]] = {}
    uri = f"file:{db.as_posix()}?mode=ro"
    with sqlite3.connect(uri, uri=True) as conn:
        sql = "SELECT session_id, text FROM nuggets"
        if limit_rows:
            sql += f" LIMIT {int(limit_rows)}"
        for session_id, text in conn.execute(sql):
            if not text or private_infra_hit(text):
                continue
            bucket = per_session.setdefault(session_id, set())
            for tok in CANDIDATE.findall(text):
                if is_plausible_term(tok):
                    bucket.add(tok)
    counts: Counter = Counter()
    for toks in per_session.values():
        counts.update(toks)
    return counts


def harvest_emails(host: str, db_path: str, key: str | None) -> Counter:
    """Count candidate terms in the email corpus, on the remote host.

    The counting runs REMOTELY and only aggregate counts cross the network, so no
    message body is transferred. Vendor announcements and deprecation notices are
    where new terminology shows up before it reaches anyone's code.

    TWO THINGS THIS HAS TO GET RIGHT, both learned by measuring:

    1. STRIP THE HTML FIRST. Email bodies are HTML documents. A first run returned
       `font-size` (93,195), `line-height` (57,579), `sans-serif`, `padding-top` and
       hex colours like `FFFFFF` -- CSS from marketing templates, at roughly zero
       precision. `<style>` and `<script>` blocks are removed wholesale, then tags,
       then anything that looks like a CSS property or a hex colour.

    2. COUNT DOCUMENT FREQUENCY, NOT OCCURRENCES. One newsletter template repeated
       across 5,000 messages otherwise outranks a term used once in each of 200
       genuinely different emails. Counting distinct messages is the same lesson IDF
       encodes, applied to the harvester itself.
    """
    remote = f"""
import sqlite3, re, json
from collections import Counter

STYLE = re.compile(r"<(style|script)[^>]*>.*?</\\1>", re.S | re.I)
TAG = re.compile(r"<[^>]+>")
ENTITY = re.compile(r"&[a-z#0-9]+;", re.I)
CSSPROP = re.compile(r"^(?:font|line|text|padding|margin|border|background|min|max|word|"
                     r"letter|white|vertical|box|display|overflow|ms-|webkit-|moz-|"
                     r"height|width|color|align|break|size|inline|block|table|list)-", re.I)
HEX = re.compile(r"^[0-9A-Fa-f]{{6,8}}$")
NOISE = re.compile(r"^(?:u[0-9a-f]{{3,}}|h[0-9]{{3,}}|ae[0-9]{{2,}}|url[0-9]+|null.*|.*[0-9]{{5,}}.*)$", re.I)
CAND = re.compile(r"\\b[A-Za-z][A-Za-z0-9-]{{1,11}}\\b")

c = sqlite3.connect("file:{db_path}?mode=ro", uri=True)
doc_freq = Counter()
casing = Counter()
for subject, body in c.execute("SELECT subject, body FROM emails"):
    seen = set()
    for text in (subject, body):
        if not text:
            continue
        text = STYLE.sub(" ", text)
        text = TAG.sub(" ", text)
        text = ENTITY.sub(" ", text)
        for tok in CAND.findall(text):
            if CSSPROP.match(tok) or HEX.match(tok) or NOISE.match(tok):
                continue
            seen.add(tok)
    doc_freq.update(seen)          # one vote per message, not per occurrence
    casing.update({{t.upper() + ("|U" if t.isupper() else "|x") for t in seen}})
print(json.dumps({{"df": dict(doc_freq.most_common(6000)),
                   "casing": dict(casing.most_common(12000))}}))
"""
    cmd = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=20"]
    if key:
        cmd += ["-i", key]
    cmd += [host, "python3 -"]
    proc = subprocess.run(cmd, input=remote, capture_output=True, text=True, timeout=600)
    if proc.returncode != 0:
        raise RuntimeError(f"email harvest failed: {proc.stderr.strip()[:300]}")
    raw = json.loads(proc.stdout)
    casing = Counter(raw.get("casing", {}))
    kept = {
        k: v for k, v in raw.get("df", {}).items()
        if is_plausible_term(k) and not shouted_english(k, casing)
    }
    return Counter(kept)


def shouted_english(tok: str, casing: Counter, threshold: float = 0.25) -> bool:
    """True when an all-caps token is an ordinary word being shouted, not an acronym.

    Email is full of marketing capitals. A first run over the email corpus proposed
    WITH, YOUR, HERE, READ, BEST, APPLY, ROLE, QUICK, SPONSOR, TRENDS and OPINIONS --
    every one an English word in caps, and orthographically indistinguishable from
    NATS or ADC. A stopword list cannot keep up with this; there is always another
    word to shout.

    The corpus answers it instead. A genuine acronym is written in capitals almost
    everywhere it appears, while a shouted word also appears in ordinary case
    elsewhere in the same corpus. So compare, for one token, the number of documents
    that used it in caps against the number that used it in any case. Below the
    threshold of all-caps usage, it is a word, not an acronym.

    This needs no dictionary, and it adapts to whatever vocabulary the corpus has.
    """
    if not tok.isupper():
        return False
    upper = casing.get(f"{tok.upper()}|U", 0)
    other = casing.get(f"{tok.upper()}|x", 0)
    total = upper + other
    if total == 0:
        return False
    return (upper / total) < (1.0 - threshold)


def skeleton(term: str, sessions: int, emails: int) -> dict:
    """A verified-terms.json entry with everything a human must supply left blank.

    `source` and `sourceUrl` are empty by construction. The build treats an entry
    without them as uncited, and the point of this file is that a term arrives with
    its citation or does not arrive at all.
    """
    return {
        "term": term,
        "expansion": "",
        "desc": "",
        "category": "",
        "misread": "",
        "source": "",
        "sourceUrl": "",
        "_evidence": {"sessionHits": sessions, "emailHits": emails},
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--session-db", type=Path, default=DEFAULT_SESSION_DB)
    ap.add_argument("--email-host", default=None, help="e.g. opc@144.24.59.30 (omit to skip the email corpus)")
    ap.add_argument("--email-db", default=DEFAULT_EMAIL_DB)
    ap.add_argument("--ssh-key", default=None)
    ap.add_argument("--min-count", type=int, default=5)
    ap.add_argument("--top", type=int, default=50)
    ap.add_argument("--out", type=Path, default=None, help="write the worklist JSON here")
    args = ap.parse_args()

    notes: list[str] = []

    if not args.session_db.exists():
        print(f"session corpus not found: {args.session_db}", file=sys.stderr)
        return 2
    sessions = harvest_sessions(args.session_db)
    notes.append(f"sessions: {args.session_db} ({sum(sessions.values()):,} candidate tokens)")

    emails: Counter = Counter()
    if args.email_host:
        try:
            emails = harvest_emails(args.email_host, args.email_db, args.ssh_key)
            notes.append(f"emails: {args.email_host}:{args.email_db} ({sum(emails.values()):,} candidate tokens)")
        except Exception as exc:  # noqa: BLE001 - report and continue on one corpus
            notes.append(f"emails: SKIPPED -- {exc}")
    else:
        notes.append("emails: SKIPPED -- no --email-host given; counts are session-only")

    known = known_terms()
    notes.append(f"already known: {len(known)} terms (bundle + verified)")

    combined: Counter = Counter()
    for src in (sessions, emails):
        combined.update(src)

    proposals = []
    for term, total in combined.most_common():
        if term.lower() in known or total < args.min_count:
            continue
        proposals.append(skeleton(term, sessions.get(term, 0), emails.get(term, 0)))
        if len(proposals) >= args.top:
            break

    report = {
        "_readme": [
            "GLOSSARY CANDIDATES -- proposals only. NOT publishable as-is.",
            "",
            "Produced by scripts/glossary-candidates.py. Every entry has an empty `desc`,",
            "`source` and `sourceUrl` BY DESIGN. This file is the discovery half of the job:",
            "it says which terms are worth having, and says nothing about what they mean.",
            "",
            "To promote an entry: find the RFC, spec, paper or vendor reference; read it;",
            "write `desc` from what it says; fill `source` and `sourceUrl` with what you read;",
            "pick a `category` from the existing taxonomy; then move the entry into",
            "glossary/verified-terms.json and delete `_evidence`. Verify first, cite second,",
            "write third. An entry whose meaning cannot be traced does not get promoted.",
            "",
            "`_evidence` records how often the term appeared in each corpus. It is a reason to",
            "look the term up. It is not evidence of what the term means.",
        ],
        "generatedBy": "scripts/glossary-candidates.py",
        "corpora": notes,
        "minCount": args.min_count,
        "candidates": proposals,
    }

    text = json.dumps(report, indent=2, ensure_ascii=False)
    if args.out:
        args.out.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))
        print(f"[candidates] wrote {args.out}")
    else:
        print(text)

    for note in notes:
        print(f"[candidates] {note}", file=sys.stderr)
    print(f"[candidates] {len(proposals)} proposals (min-count {args.min_count})", file=sys.stderr)
    print("[candidates] NOTHING HERE IS PUBLISHABLE until a human fills in a cited definition.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
