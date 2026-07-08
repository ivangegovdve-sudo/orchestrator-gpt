// One-shot repair: web/ai-init/glossary-data.js had its array prematurely closed
// by a stray `];` at the end of line 1, leaving ~175 dangling `, {entry}` lines
// that a real closing `]` follows. That is invalid JS, so the whole glossary
// failed to load (window.AI_INIT_GLOSSARY_DATA stayed undefined) on the live
// site AND blocked the new Library page. `];` occurs exactly once, so removing
// it re-joins the split into a single valid array. We validate before writing.
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "web/ai-init/glossary-data.js");
const orig = fs.readFileSync(file, "utf8");

const count = (orig.match(/\];/g) || []).length;
if (count !== 1) throw new Error("Expected exactly one '];' but found " + count + " — aborting to avoid corruption");

// Remove the single premature closer. `...false}];\r\n, {GPU}...` -> `...false}\r\n, {GPU}...`
const fixed = orig.replace("];", "");

// Validate: it must parse and yield a non-trivial array of entries with abbrs.
// Execute the fixed source in a sandbox where `window` is a supplied object.
const sandbox = { window: {} };
new Function("window", fixed).call(sandbox, sandbox.window);
const arr = sandbox.window.AI_INIT_GLOSSARY_DATA;
if (!Array.isArray(arr)) throw new Error("Repair did not produce an array");
if (arr.length < 400) throw new Error("Repaired array too small (" + arr.length + ") — aborting");
if (!arr[0] || !arr[0].abbr) throw new Error("First entry missing abbr — structure unexpected");

fs.writeFileSync(file, fixed);
console.log("Repaired glossary-data.js: " + arr.length + " entries, parses cleanly.");
