// Independently validates a generated roster against OpenRouter's live catalogue.
//
// WHY THIS IS SEPARATE FROM THE GENERATOR
// ---------------------------------------
// The refresh workflow splits into an untrusted job that runs the generator (which
// executes `npx -y open-dashboard-mcp`, i.e. code downloaded at run time) and a
// write-capable job that commits the result. The split is only worth anything if the
// write-capable job checks the artifact against something the untrusted job cannot
// influence.
//
// The first version did not. It confirmed that every roster slug ended in `:free` and
// appeared in the artifact's own `verified` array — but the artifact supplies that array,
// so a forged file listing `fake/model:free` in both places passed. The validation was
// self-referential, which is to say it was not validation.
//
// This checks the roster against openrouter.ai instead: a first-party HTTPS request the
// untrusted job has no way to forge. Every published slug must be a model OpenRouter
// actually serves, carrying the `:free` suffix, priced at zero on both prompt and
// completion.
//
// WHAT THIS DELIBERATELY DOES NOT CLAIM
// -------------------------------------
// It does not re-verify that each model answers. Re-probing every published seat here
// would double the load on the shared free-tier budget that PROBE_BUDGET_PER_RUN exists
// to protect. So a forged artifact could still name a real, free, currently-unresponsive
// model — a degradation the runtime fallback chain already absorbs, not a way to smuggle
// a paid model or a nonexistent one past the boundary. The free-only guarantee and the
// existence guarantee are enforced here; liveness is trusted to the generator and caught
// at runtime.

import { readFile } from "node:fs/promises";
import process from "node:process";

export const OPENROUTER_CATALOGUE = "https://openrouter.ai/api/v1/models";
export const REQUIRED_TIERS = ["proposer", "critic", "synthesis"];

export async function fetchLiveFreeIds({ fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(OPENROUTER_CATALOGUE, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`OpenRouter catalogue returned HTTP ${response.status}`);
  const body = await response.json();
  const models = Array.isArray(body?.data) ? body.data : [];
  // An empty catalogue must fail loudly rather than silently reject every slug, which
  // would read identically to "the roster is forged".
  if (models.length === 0) throw new Error("OpenRouter catalogue returned no models");
  const free = new Map();
  for (const model of models) {
    if (typeof model?.id !== "string") continue;
    free.set(model.id, model);
  }
  return free;
}

export function validateRoster(roster, catalogue) {
  const problems = [];
  if (roster?.schemaVersion !== "1") problems.push(`unexpected schemaVersion ${roster?.schemaVersion}`);
  if (!Number.isFinite(Date.parse(roster?.verifiedAt))) problems.push("verifiedAt is not a date");
  if (!Number.isFinite(Date.parse(roster?.generatedAt))) problems.push("generatedAt is not a date");
  // verifiedAt is a past success by construction. A file claiming to have been verified
  // after the run that wrote it has been tampered with or is broken.
  if (Date.parse(roster?.verifiedAt) > Date.parse(roster?.generatedAt)) {
    problems.push("verifiedAt is later than generatedAt");
  }

  const rosters = roster?.rosters ?? {};
  // Every tier is required. A forged file could otherwise drop a tier entirely and pass
  // a check that only looked at the tiers it happened to contain.
  for (const tier of REQUIRED_TIERS) {
    const models = rosters[tier];
    if (!Array.isArray(models) || models.length === 0) {
      problems.push(`tier ${tier} is missing or empty`);
      continue;
    }
    for (const model of models) {
      if (typeof model !== "string" || !model.endsWith(":free")) {
        problems.push(`tier ${tier} carries a non-free slug: ${model}`);
        continue;
      }
      const listed = catalogue.get(model);
      if (!listed) {
        problems.push(`tier ${tier} carries ${model}, which OpenRouter does not serve`);
        continue;
      }
      if (Number(listed.pricing?.prompt) !== 0 || Number(listed.pricing?.completion) !== 0) {
        problems.push(`tier ${tier} carries ${model}, which OpenRouter prices above zero`);
      }
    }
  }
  const unexpected = Object.keys(rosters).filter((tier) => !REQUIRED_TIERS.includes(tier));
  if (unexpected.length > 0) problems.push(`unexpected tier(s): ${unexpected.join(", ")}`);

  return problems;
}

export async function validateRosterFile(rosterPath, options = {}) {
  const roster = JSON.parse(await readFile(rosterPath, "utf8"));
  const catalogue = await fetchLiveFreeIds(options);
  const problems = validateRoster(roster, catalogue);
  return { roster, problems };
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("validate-free-roster.mjs");
if (invokedDirectly) {
  const rosterPath = process.argv[2];
  if (!rosterPath) {
    console.error("usage: node scripts/validate-free-roster.mjs <path-to-free-roster.json>");
    process.exit(2);
  }
  validateRosterFile(rosterPath)
    .then(({ roster, problems }) => {
      if (problems.length > 0) {
        console.error(`Roster REJECTED — ${problems.length} problem(s):`);
        for (const problem of problems) console.error(`  - ${problem}`);
        process.exit(1);
      }
      const seats = REQUIRED_TIERS.map((tier) => `${tier}=${roster.rosters[tier].length}`).join(" ");
      console.error(`Roster accepted: every slug is a live zero-priced :free model. ${seats}`);
    })
    .catch((error) => {
      console.error(`Roster validation could not complete: ${error.message}`);
      process.exit(1);
    });
}
