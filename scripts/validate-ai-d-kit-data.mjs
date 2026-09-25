// Validates the two AI-d kit data files against the schema the renderers enforce.
//
// WHY THIS IMPORTS THE RENDERER'S OWN RULES
// -----------------------------------------
// The checks here are not a second opinion about the schema — they are the renderer's
// own `offerProblems` / `entryProblems`, imported from the modules the browser loads.
// A validator with its own copy of the rules is a validator that eventually disagrees
// with the page, and when that happens the file that passed CI is the one that renders
// wrong. There is one definition of a valid row and both readers share it.
//
// WHAT IT DELIBERATELY DOES NOT CHECK
// -----------------------------------
// It does not open offer URLs or judge whether an offer is real. That is a human
// opening a page and writing down what they saw, recorded in `verification.observed`.
// This only guarantees that every row is well-formed and carries a verification record
// and a date — that the container is sound. A row can pass here and still be a lie, and
// the page handles that by refusing to show anything as live without a VERIFIED record.
//
// USAGE
//   node scripts/validate-ai-d-kit-data.mjs                 # both files at their real paths
//   node scripts/validate-ai-d-kit-data.mjs --offers <path> # check one file somewhere else
//   node scripts/validate-ai-d-kit-data.mjs --entries <path>
//
// Exit 0 = every row is well-formed. Exit 1 = at least one problem, all of them listed.
// Exit 2 = the validator could not run (missing file, unreadable JSON, bad arguments).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { offerDocumentProblems, offerRows, classifyOffer, STALE_AFTER_DAYS } from '../web/shared/ai-kit-offers.mjs';
import { entryDocumentProblems, entryRows } from '../web/shared/ai-kit-troubleshooting.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const OFFERS_PATH = 'web/pools/ai-d-kit/free-stuff-in-promotions/offers.json';
export const ENTRIES_PATH = 'web/pools/ai-d-kit/troubleshooting/entries.json';

async function readJson(filePath) {
  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`cannot read ${filePath}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    // A JSON syntax error is reported as a validator failure to run, not as a list of
    // row problems, because a file that will not parse has no rows to talk about.
    throw new Error(`${filePath} is not valid JSON: ${error.message}`);
  }
}

/** Validate a parsed offers payload. Returns { problems, summary }. */
export function checkOffers(payload, { now = new Date() } = {}) {
  const problems = offerDocumentProblems(payload);
  const rows = offerRows(payload) ?? [];
  const counts = { live: 0, expired: 0, unverified: 0, invalid: 0 };
  for (const offer of rows) counts[classifyOffer(offer, { now }).bucket] += 1;
  return {
    problems,
    summary: `${rows.length} row(s): ${counts.live} live, ${counts.unverified} unverified, ${counts.expired} expired, ${counts.invalid} unusable (stale threshold ${STALE_AFTER_DAYS} days, UTC)`,
  };
}

/** Validate a parsed entries payload. Returns { problems, summary }. */
export function checkEntries(payload) {
  const problems = entryDocumentProblems(payload);
  const rows = entryRows(payload) ?? [];
  const workarounds = rows.filter((entry) => entry?.isWorkaround === true).length;
  return {
    problems,
    summary: `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}: ${workarounds} marked as workarounds`,
  };
}

function parseArgs(argv) {
  const targets = [];
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag !== '--offers' && flag !== '--entries') throw new Error(`unknown argument ${flag}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`${flag} needs a file path`);
    targets.push({ kind: flag.slice(2), file: value });
    index += 1;
  }
  if (targets.length > 0) return targets;
  return [
    { kind: 'offers', file: path.join(ROOT, OFFERS_PATH) },
    { kind: 'entries', file: path.join(ROOT, ENTRIES_PATH) },
  ];
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('validate-ai-d-kit-data.mjs');
if (invokedDirectly) {
  let targets;
  try {
    targets = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}`);
    console.error('usage: node scripts/validate-ai-d-kit-data.mjs [--offers <path>] [--entries <path>]');
    process.exit(2);
  }

  let failed = false;
  for (const { kind, file } of targets) {
    let payload;
    try {
      payload = await readJson(file);
    } catch (error) {
      console.error(`${kind}: could not be validated — ${error.message}`);
      process.exit(2);
    }
    const { problems, summary } = kind === 'offers' ? checkOffers(payload) : checkEntries(payload);
    const shown = path.relative(ROOT, file) || file;
    if (problems.length > 0) {
      failed = true;
      console.error(`REJECTED ${shown} — ${problems.length} problem(s):`);
      for (const problem of problems) console.error(`  - ${problem}`);
    } else {
      console.log(`OK ${shown} — ${summary}`);
    }
  }
  if (failed) {
    console.error('\nFix the rows above and run this again. Nothing malformed should reach the page.');
    process.exit(1);
  }
}
