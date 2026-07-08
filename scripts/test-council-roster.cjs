// Unit test for the council backend's per-request roster override + rounds clamp,
// exercising the ACTUAL code lifted from api/council.js (not a re-implementation).
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "api/council.js"), "utf8");

function extract(startMarker, endMarker) {
  const s = src.indexOf(startMarker);
  const e = src.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error("marker not found: " + startMarker);
  return src.slice(s, e + endMarker.length);
}

// Pull the exact definitions we depend on.
const rosterDef = extract("const ROSTER = {", "};");
const isFreeDef = extract("function isFreeSlug(model) {", "}");
const sanitizeDef = extract("function sanitizeRoster(raw) {", "\n}"); // ends at the function's closing brace on its own line

const sandbox = new Function(
  "PAID_FALLBACK_ENABLED",
  rosterDef + "\n" + isFreeDef + "\n" + sanitizeDef + "\n" +
  "return { ROSTER: ROSTER, sanitizeRoster: sanitizeRoster, isFreeSlug: isFreeSlug };"
);
const { ROSTER, sanitizeRoster } = sandbox(false);

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; } else { fail++; console.error("FAIL: " + name); } }

// 1. Absent/empty override → {} (handler then uses ROSTER unchanged).
check("empty roster -> {}", Object.keys(sanitizeRoster(undefined)).length === 0);
check("null roster -> {}", Object.keys(sanitizeRoster(null)).length === 0);
check("no valid stages -> {}", Object.keys(sanitizeRoster({ bogus: ["x:free"] })).length === 0);

// 2. Non-:free slugs are dropped (free-only lockdown, PAID_FALLBACK off).
const paid = sanitizeRoster({ proposer_r1: ["openai/gpt-4o", "google/gemma-4-31b-it:free"] });
check("paid slug dropped", paid.proposer_r1.indexOf("openai/gpt-4o") === -1);
check("free slug kept", paid.proposer_r1.indexOf("google/gemma-4-31b-it:free") === 0);

// 3. Default fallback chain is always appended (deduped).
check("fallback appended", ROSTER.proposer_r1.every(function (s) { return paid.proposer_r1.indexOf(s) !== -1; }));
const dup = sanitizeRoster({ judge: ["openai/gpt-oss-20b:free"] }); // already first default
check("no duplicate slug", dup.judge.filter(function (s) { return s === "openai/gpt-oss-20b:free"; }).length === 1);

// 4. Unknown stage keys ignored; only known stages emitted.
const mixed = sanitizeRoster({ critic: ["qwen/qwen3-235b-a22b:free"], nonsense: ["a:free"] });
check("unknown stage ignored", mixed.nonsense === undefined && Array.isArray(mixed.critic));

// 5. Overlong / empty slugs skipped; cap at 8 user picks.
const many = sanitizeRoster({ synthesizer: Array.from({ length: 20 }, function (_, i) { return "m" + i + ":free"; }).concat(["", "  "]) });
check("caps user picks at 8 (+ fallback)", many.synthesizer.filter(function (s) { return /^m\d+:free$/.test(s); }).length === 8);

// 6. Rounds clamp semantics (mirrors the handler line).
function clampRounds(rounds) { return Math.max(1, Math.min(5, parseInt(rounds, 10) || 2)); }
check("rounds 0 -> 2 (default)", clampRounds(0) === 2);
check("rounds 1 -> 1", clampRounds(1) === 1);
check("rounds 5 -> 5", clampRounds(5) === 5);
check("rounds 9 -> 5", clampRounds(9) === 5);
check("rounds NaN -> 2", clampRounds("x") === 2);

console.log((fail === 0 ? "ALL PASS" : "SOME FAIL") + " — " + pass + " passed, " + fail + " failed.");
process.exit(fail === 0 ? 0 : 1);
