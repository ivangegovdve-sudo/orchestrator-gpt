/**
 * Build the public, machine-readable capability state from the dated live-model
 * snapshot.  This export deliberately preserves UNKNOWN for facts the catalogue
 * cannot prove; catalogue rates are never copied into costPerGeneration.
 */
import { readFile, writeFile } from "node:fs/promises";
const snapshotPath = new URL("../public-catalogue.json", import.meta.url);
const targetPath = new URL("../capability-state.json", import.meta.url);
const sourceEndpoint = "https://openrouter-github-dashboard.vercel.app/api/public/v2/live-models";

const observedAtFor = (row, fallback) =>
  typeof row?.lastConfirmedAt === "string" ? row.lastConfirmedAt : fallback;
const unknown = (reason, observedAt, source = sourceEndpoint) => ({
  state: "unknown",
  value: null,
  observedAt,
  source,
  reason,
});
const known = (value, observedAt, source = sourceEndpoint) => ({
  state: "known",
  value,
  observedAt,
  source,
  reason: null,
});

function pricePoints(row, observedAt) {
  const pricing = row?.pricing;
  if (!pricing || typeof pricing !== "object") return null;
  const points = [];
  for (const [name, unit] of [
    ["promptUsdPerToken", "token_in"],
    ["completionUsdPerToken", "token_out"],
  ]) {
    const amount = pricing[name];
    if (typeof amount !== "string" || !/^\d+(?:\.\d+)?$/.test(amount)) continue;
    points.push({
      id: `${row.provider}:${row.id}:${unit}`,
      amount,
      unit,
      condition: null,
      source: { url: sourceEndpoint, readAt: observedAt },
      provenance: "published",
    });
  }
  return points.length ? points : null;
}

function selection(missingFields) {
  return {
    state: "unknown",
    reason: "Required evidence is missing or expired.",
    missingFields: [...new Set(missingFields)],
  };
}
function compareDecimal(left, right) {
  const [leftWhole = "0", leftFraction = ""] = String(left).split(".", 2);
  const [rightWhole = "0", rightFraction = ""] = String(right).split(".", 2);
  const a = leftWhole.replace(/^0+(?=\d)/, "");
  const b = rightWhole.replace(/^0+(?=\d)/, "");
  if (a.length !== b.length) return a.length < b.length ? -1 : 1;
  if (a !== b) return a < b ? -1 : 1;
  const scale = Math.max(leftFraction.length, rightFraction.length);
  const af = leftFraction.padEnd(scale, "0");
  const bf = rightFraction.padEnd(scale, "0");
  return af === bf ? 0 : af < bf ? -1 : 1;
}

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
if (snapshot?.snapshot !== true || !Array.isArray(snapshot.data))
  throw new Error("The public catalogue snapshot is not a dated live-model snapshot.");
const generatedAt = typeof snapshot.fetchedAt === "string"
  ? snapshot.fetchedAt
  : new Date().toISOString();
const packageFacts = JSON.parse(await readFile(new URL("../package-facts.json", import.meta.url), "utf8").catch(() => "{}"));
const pages = Array.isArray(snapshot.pages) ? snapshot.pages : [];
const sourceStale = pages.some((page) => page?.stale === true);
const rows = snapshot.data
  .filter((row) => row?.availability === "available")
  .sort((a, b) => String(a.provider).localeCompare(String(b.provider)) || String(a.id).localeCompare(String(b.id)))
  .map((row) => {
    const observedAt = observedAtFor(row, generatedAt);
    const points = pricePoints(row, observedAt);
    const context = typeof row.contextLength === "string" && /^\d+$/.test(row.contextLength)
      ? known(row.contextLength, observedAt)
      : unknown("The live-model source did not publish a context window.", observedAt);
    const modalities = Array.isArray(row.outputModalities)
      ? known(row.outputModalities, observedAt)
      : unknown("The live-model source did not publish output modalities.", observedAt);
    const cataloguePrice = points
      ? known(points, observedAt)
      : unknown("The catalogue did not publish a complete token price for this row.", observedAt);
    const costs = Array.isArray(row.generationCosts) ? row.generationCosts : [];
    const measuredCosts = costs.filter((cost) => cost?.costState === "MEASURED" && typeof cost.costUsd === "string");
    // A generation-cost record is only usable here when it contains an actual
    // measured charge. Published estimates, catalogue prices, and zero-delta
    // reads stay UNKNOWN instead of becoming a selection input.
    const costPerGeneration = measuredCosts.length
      ? known(measuredCosts, observedAt, "/api/public/v2/generation-costs")
      : unknown("No usage record with an actual per-generation charge was published for this slug.", observedAt);
    const successfulProbe = measuredCosts.find((cost) => cost.httpStatus === 200) ?? null;
    const limitedProbe = costs.find((cost) => cost.httpStatus === 429 || cost.errorBucket === "rate_limit") ?? null;
    const reachability = successfulProbe || limitedProbe
      ? successfulProbe
        ? { state: "live", httpStatus: successfulProbe.httpStatus, errorBucket: null, observedAt: successfulProbe.observedAt, source: successfulProbe.sourceUrl || "/api/public/v2/generation-costs", reason: null }
        : { state: "rate_limited", httpStatus: limitedProbe.httpStatus, errorBucket: limitedProbe.errorBucket || "rate_limit", observedAt: limitedProbe.observedAt, source: limitedProbe.sourceUrl || "/api/public/v2/generation-costs", reason: "The last inference probe was rate limited." }
      : { state: "unknown", httpStatus: null, errorBucket: null, observedAt: null, source: null, reason: "Catalogue presence is not an inference probe; no per-slug HTTP result is published." };
    const commonMissing = ["costPerGeneration", "reachability"];
    const measuredFree = measuredCosts.length > 0 && measuredCosts.every((cost) => cost.costUsd === "0");
    const publicMissing = measuredFree ? ["paid_model"] : measuredCosts.length && reachability.state === "live" ? [] : commonMissing;
    const functionalMissing = [
      ...commonMissing,
      "toolCalling",
      "functionality.resolves",
      "functionality.structuredOutputOk",
      "functionality.p50Latency",
      "functionality.p95Latency",
      "functionality.lastFunctionallyTested",
      "functionality.semanticQuality",
    ];
    return {
      key: `${row.provider}:${row.id}`,
      provider: row.provider,
      id: row.id,
      displayName: row.displayName ?? null,
      catalogueAvailability: known("available", observedAt),
      toolCalling: unknown("No tool-calling capability was published for this slug.", observedAt),
      contextWindow: context,
      modalities,
      modelFamily: unknown("No model-family or base-weights lineage was published for this slug.", observedAt),
      cataloguePrice,
      costPerGeneration,
      routedProvider: unknown("No routed provider observation was published for this slug.", observedAt),
      reachability,
      functionality: {
        resolves: unknown("No functional resolution probe has been run for this slug.", observedAt),
        structuredOutputOk: unknown("No structured-output probe has been run for this slug.", observedAt),
        p50Latency: unknown("No workload latency sample has been published for this slug.", observedAt),
        p95Latency: unknown("No workload latency sample has been published for this slug.", observedAt),
        latencyBoundMs: unknown("No latency bound has been established for this slug.", observedAt),
        lastFunctionallyTested: unknown("No functional test date has been published for this slug.", observedAt),
        semanticQuality: {
          ...unknown("An external semantic judge has not run for this slug.", observedAt),
          judgeHook: "reserved_for_external_semantic_judge",
        },
      },
      selection: {
        publicCouncil: selection(publicMissing),
        innerObserver: selection(functionalMissing),
      },
    };
  });

const missingFields = [...new Set(rows.flatMap((row) => [
  ...row.selection.publicCouncil.missingFields,
  ...row.selection.innerObserver.missingFields,
]))];
const providerIds = [...new Set([
  ...(Array.isArray(packageFacts.providers) ? packageFacts.providers.map((provider) => provider.id) : []),
  ...rows.map((row) => row.provider),
])].sort();
const publicCandidates = rows.filter((row) => row.selection.publicCouncil.state === "eligible");
const publicWinner = [...publicCandidates].sort((a, b) => {
  const left = a.costPerGeneration.value?.find((cost) => cost.costState === "MEASURED" && typeof cost.costUsd === "string")?.costUsd;
  const right = b.costPerGeneration.value?.find((cost) => cost.costState === "MEASURED" && typeof cost.costUsd === "string")?.costUsd;
  if (left === undefined && right === undefined) return a.key.localeCompare(b.key);
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return compareDecimal(left, right) || a.key.localeCompare(b.key);
})[0] ?? null;
const provenance = pages.flatMap((page) => Array.isArray(page?.provenance) ? page.provenance : []);
const evidence = [{
  endpoint: "/api/public/v2/live-models",
  window: pages[0]?.window ?? null,
  completeness: pages[0]?.completeness ?? null,
  stale: sourceStale,
  watermark: generatedAt,
  provenance,
  freshness: null,
}];
const state = {
  status: "ok",
  schemaVersion: "1.0",
  generatedAt,
  sourceEndpoint: "/api/public/v2/live-models",
  sourceStale,
  scope: {
    definition: "one row per available live model slug",
    completeness: snapshot.hasMore === true ? "partial_or_unknown" : "full",
    missingFields,
  },
  workload: {
    id: "selection_without_inference",
    prompt: null,
    requestedOutputTokens: null,
    inputTokens: null,
    outputTokens: null,
    sampleSize: 0,
    note: "No inference workload was run by this read; measured charges, reachability, latency, and functionality stay explicit UNKNOWN values.",
  },
  providers: providerIds.map((id) => {
    const count = rows.filter((row) => row.provider === id).length;
    return {
      id,
      directAdapter: Array.isArray(packageFacts.providers) && packageFacts.providers.some((provider) => provider.id === id),
      liveRows: count,
      state: count > 0 ? "observed" : "no_live_rows",
      note: count > 0 ? "At least one available live-model row was observed." : "No available live-model row is present in this snapshot; this does not establish an empty provider catalogue.",
    };
  }),
  rows,
  queries: {
    publicCouncil: {
      rule: "literal_cheapest_paid",
      decisionState: publicWinner ? "decidable" : "blocked",
      selected: publicWinner ? { key: publicWinner.key, provider: publicWinner.provider, id: publicWinner.id } : null,
      missingFields: publicWinner ? [] : ["costPerGeneration", "reachability"],
      consideredRows: rows.length,
      basis: "The literal cheapest paid model requires actual per-generation charges; catalogue prices are not substituted.",
    },
    innerObserver: {
      rule: "cheapest_functional",
      decisionState: "blocked",
      selected: null,
      missingFields: ["costPerGeneration", "reachability", "toolCalling", "functionality.resolves", "functionality.structuredOutputOk", "functionality.p50Latency", "functionality.p95Latency", "functionality.lastFunctionallyTested", "functionality.semanticQuality"],
      consideredRows: rows.length,
      basis: "A functional model requires every functionality gate and actual per-generation charges.",
    },
  },
  pagination: {
    pageSize: pages[0]?.data?.length ?? 500,
    pageLimit: pages.length || 1,
    pagesScanned: pages.length || 1,
    rowsScanned: snapshot.data.length,
    liveRowsReturned: rows.length,
    capped: snapshot.hasMore === true,
    nextCursor: null,
  },
  evidence,
  warnings: snapshot.hasMore === true ? ["The checked-in catalogue snapshot is partial; omitted slugs remain UNKNOWN."] : [],
};
await writeFile(targetPath, `${JSON.stringify(state, null, 2)}\n`);
console.log(`Capability state export: ${rows.length} live rows from ${new Set(rows.map((row) => row.provider)).size} providers at ${generatedAt}.`);
