// Regenerates web/council/free-roster.json — the model list the public OpenRouter
// council actually runs on.
//
// WHY THIS EXISTS
// ---------------
// The roster used to be hardcoded in web/council/council.js. Free slugs get retired
// without notice, so the list rotted: on 2026-08-28 two of its six entries
// (openai/gpt-oss-20b:free, nvidia/nemotron-3-nano-30b-a3b:free) had been withdrawn
// from OpenRouter entirely, and the critic tier was two-thirds dead. A visitor got a
// broken page. Nobody is going to hand-edit this weekly, so it maintains itself.
//
// THREE GATES, AND WHY ONE IS NOT ENOUGH
// --------------------------------------
// Every gate below exists because the cheaper check upstream of it was measured and
// found insufficient on 2026-08-28:
//
//   1. CATALOGUE — open-dashboard-mcp's `dashboard_free_models` supplies candidates
//      that are genuinely free (freeKind === "concrete_free", so a "free variant of a
//      paid model" never sneaks in) and text-output. Not sufficient alone: that call
//      returned `google/lyria-3-*-preview` and `stealth/ox-alpha`, none of which
//      OpenRouter currently serves as a `:free` slug.
//
//   2. LIVE CATALOGUE — OpenRouter's own /api/v1/models, which is what the relay
//      actually routes to. A model must appear there, carry the `:free` suffix, and
//      price at zero. Not sufficient alone: `google/gemma-4-26b-a4b-it:free` is listed
//      there and answered nothing on six consecutive attempts.
//
//   3. LIVE CALL — a real streamed completion through the same relay a visitor's
//      browser uses. This is the only gate that catches the two failure modes a
//      listing cannot see: the empty-200 (a stream that terminates with no content)
//      and the silently rate-limited slug.
//
// WHY A ROLLING WINDOW RATHER THAN A SNAPSHOT
// -------------------------------------------
// Measured on 2026-08-28: probing all 18 free slugs back-to-back through one relay
// self-inflicts rate limiting, and the second pass failed almost everything that had
// just passed. `poolside/laguna-s-2.1:free` answered on one pass and returned an empty
// stream on the next, 90 seconds later. A generator that published only what answered
// in the current run would ship a roster that shrinks and grows at random, and would
// drop healthy models on a throttled afternoon.
//
// So a model's place is decided by a window, not a moment. Each run merges its probe
// results into the roster's own health record. A model stays if it has answered at
// least once within VERIFY_WINDOW_DAYS, and is dropped once it has gone that long with
// only failures. A slug withdrawn from OpenRouter fails gate 2 and leaves immediately
// regardless — the window only ever protects models that are still listed and merely
// uncooperative today.

import { spawn } from "node:child_process";
import { readFile, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROSTER_PATH = path.join(HERE, "..", "web", "council", "free-roster.json");

export const RELAY = "https://chloe.blumenkraft.cloud/council/relay";
export const OPENROUTER_CATALOGUE = "https://openrouter.ai/api/v1/models";
export const MCP_PACKAGE = "open-dashboard-mcp@0.4.0";

// A model must have answered at least once inside this window to keep its seat.
export const VERIFY_WINDOW_DAYS = 7;
// Attempts per model per run, spaced by PROBE_SPACING_MS. Three clears a transient 429
// without turning the run itself into the rate-limit event.
export const PROBE_ATTEMPTS = 3;
export const PROBE_SPACING_MS = 2500;
export const PROBE_TIMEOUT_MS = 45_000;
// A slug retiring sooner than this is not worth putting in front of a visitor.
export const MIN_DAYS_BEFORE_EXPIRY = 14;
// How many models this run may probe. Verification competes with real visitors for the
// same shared free-tier budget on the same relay: measured on 2026-08-28, a session that
// made roughly 200 probe calls left models that had answered in about a second refusing
// in under 300ms, and a council run in that state lost two of its three seats. Checking
// all 17 candidates every day would be a self-inflicted outage on a page that gets few
// visitors but should work for the ones it gets.
//
// A seat only needs one success per VERIFY_WINDOW_DAYS, so there is no reason to re-probe
// a model that answered this morning. Each run spends its budget on the models whose
// evidence is oldest, which cycles the whole catalogue through verification every couple
// of days — comfortably inside the window — at a third of the traffic.
export const PROBE_BUDGET_PER_RUN = 8;
// Tier sizes mirror the fallback chains council.js already expects.
export const TIER_SIZE = 3;
export const TIERS = ["proposer", "critic", "synthesis"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Gate 1: the MCP catalogue ────────────────────────────────────────────────
// Spoken to over stdio JSON-RPC rather than through an SDK. This repo ships no
// dependencies and has no lockfile — `npm ci` would fail outright — so pulling
// @modelcontextprotocol/client in for one call would be a real cost. The stdio framing
// is newline-delimited JSON-RPC 2.0 and fits in the function below.
export function mcpClient(command, args, { env = {}, timeoutMs = 60_000 } = {}) {
  const child = spawn(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
  const pending = new Map();
  const stderr = [];
  let buffer = "";
  let nextId = 1;

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let message;
      try { message = JSON.parse(trimmed); } catch { continue; }
      if (message.id != null && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    }
  });
  // The server writes diagnostics to stderr. Captured rather than echoed so a failure
  // can quote them, and never merged into stdout, which carries the protocol.
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString()));

  const send = (payload) => child.stdin.write(`${JSON.stringify(payload)}\n`);
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${MCP_PACKAGE} timed out on ${method}. stderr: ${stderr.join("").slice(-400)}`));
    }, timeoutMs);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
    });
    send({ jsonrpc: "2.0", id, method, params });
  });

  return {
    call,
    notify: (method, params) => send({ jsonrpc: "2.0", method, params }),
    close: () => child.kill(),
  };
}

export async function catalogueFromMcp({ spawnClient = mcpClient } = {}) {
  const client = spawnClient("npx", ["-y", MCP_PACKAGE]);
  try {
    await client.call("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "sdforest-council-roster", version: "1.0.0" },
    });
    client.notify("notifications/initialized", {});
    const result = await client.call("tools/call", {
      name: "dashboard_free_models",
      arguments: { outputModality: "text", limit: 200 },
    });
    const structured = result.structuredContent
      ?? JSON.parse(result.content?.find((part) => part.type === "text")?.text ?? "{}");
    const candidates = structured?.liveCandidates?.data ?? [];
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error("dashboard_free_models returned no live candidates");
    }
    return {
      candidates,
      // Surfaced, not swallowed. The dashboard was itself `stale: true` on 2026-08-28,
      // and a roster built from stale evidence should say so in its own record.
      stale: structured?.stale === true,
      status: structured?.status ?? "unknown",
      warnings: Array.isArray(structured?.warnings) ? structured.warnings : [],
    };
  } finally {
    client.close();
  }
}

// ── Gate 2: OpenRouter's live catalogue ──────────────────────────────────────
export async function liveFreeCatalogue({ fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(OPENROUTER_CATALOGUE, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`OpenRouter catalogue returned HTTP ${response.status}`);
  const body = await response.json();
  const models = Array.isArray(body?.data) ? body.data : [];
  if (models.length === 0) throw new Error("OpenRouter catalogue returned no models");
  const free = new Map();
  for (const model of models) {
    // Belt and braces on the money question. The `:free` suffix is what council.js
    // enforces at call time; a zero prompt AND completion price is the independent
    // confirmation, so a suffix that stops meaning free cannot carry a paid model in.
    if (typeof model?.id !== "string" || !model.id.endsWith(":free")) continue;
    if (Number(model?.pricing?.prompt) !== 0) continue;
    if (Number(model?.pricing?.completion) !== 0) continue;
    free.set(model.id, model);
  }
  return free;
}

// ── Gate 3: a real call through the visitor's own relay ──────────────────────
// Deliberately probes the relay rather than OpenRouter directly. The relay is the layer
// the browser talks to and the layer that enforces free-only server-side; a model that
// answers OpenRouter but not the relay is broken for the visitor, which is the only
// sense of "works" that matters here.
export async function probeModel(model, { fetchImpl = globalThis.fetch, relay = RELAY } = {}) {
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(relay, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: 64,
        temperature: 0.3,
        messages: [{ role: "user", content: "Reply with exactly: COUNCIL OK" }],
      }),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}`, ms: Date.now() - startedAt };
    }
    // A retired or throttled slug comes back as a JSON error body under HTTP 200
    // instead of an SSE stream. council.js handles this at runtime; the probe has to
    // read it the same way or it would score a refusal as a silent success.
    if ((response.headers.get("content-type") || "").includes("application/json")) {
      const detail = await response.json().catch(() => null);
      return {
        ok: false,
        reason: "relay-refused",
        detail: String(detail?.error?.message ?? "").slice(0, 200),
        ms: Date.now() - startedAt,
      };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let buffer = "";
    let terminated = false;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") { terminated = true; continue; }
        try { text += JSON.parse(payload).choices?.[0]?.delta?.content ?? ""; } catch { /* partial frame */ }
      }
    }
    const chars = text.trim().length;
    // Non-empty content is the whole test. `poolside/laguna-s-2.1:free` terminates
    // cleanly with zero characters when it spends its budget on reasoning — a clean
    // stream is not an answer.
    if (chars === 0) {
      return { ok: false, reason: terminated ? "empty-200" : "empty-stream", ms: Date.now() - startedAt };
    }
    return { ok: true, ms: Date.now() - startedAt, chars };
  } catch (error) {
    return { ok: false, reason: error?.name === "TimeoutError" ? "timeout" : "transport", ms: Date.now() - startedAt };
  }
}

export async function probeWithRetries(model, options = {}) {
  const { attempts = PROBE_ATTEMPTS, spacingMs = PROBE_SPACING_MS, sleepImpl = sleep } = options;
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await probeModel(model, options);
    if (last.ok) return { ...last, attempts: attempt };
    if (attempt < attempts) await sleepImpl(spacingMs);
  }
  return { ...last, attempts };
}

// ── Health window ────────────────────────────────────────────────────────────
export function mergeHealth(previousHealth, model, probe, nowIso) {
  const previous = previousHealth?.[model] ?? {};
  return {
    lastCheckedAt: nowIso,
    lastOkAt: probe.ok ? nowIso : (previous.lastOkAt ?? null),
    lastReason: probe.ok ? null : (probe.reason ?? "unknown"),
    lastLatencyMs: probe.ok ? probe.ms : (previous.lastLatencyMs ?? null),
    consecutiveFailures: probe.ok ? 0 : Number(previous.consecutiveFailures ?? 0) + 1,
  };
}

export function isWithinWindow(lastOkAt, nowIso, windowDays = VERIFY_WINDOW_DAYS) {
  if (!lastOkAt) return false;
  const lastOk = Date.parse(lastOkAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(lastOk) || !Number.isFinite(now)) return false;
  return now - lastOk <= windowDays * 86_400_000;
}

export function daysUntil(expirationDate, nowIso) {
  if (!expirationDate) return Infinity;
  const expiry = Date.parse(`${expirationDate}T00:00:00Z`);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(expiry) || !Number.isFinite(now)) return Infinity;
  return (expiry - now) / 86_400_000;
}

// ── Tier assignment ──────────────────────────────────────────────────────────
// Ranked by context length purely as a stable, public, non-arbitrary ordering — there
// is no quality benchmark here worth pretending to. Tiers are then dealt round-robin
// by provider so a single provider's outage cannot take out a whole tier, which is
// precisely what killed the critic tier when both its NVIDIA and OpenAI slugs retired.
export function assignTiers(verified, { tierSize = TIER_SIZE, tiers = TIERS } = {}) {
  const providerOf = (id) => id.split("/")[0];
  const ranked = [...verified].sort((a, b) => {
    const context = Number(b.contextLength ?? 0) - Number(a.contextLength ?? 0);
    return context !== 0 ? context : a.id.localeCompare(b.id);
  });
  if (ranked.length === 0) return Object.fromEntries(tiers.map((tier) => [tier, []]));

  const rosters = {};
  for (const [index, tier] of tiers.entries()) {
    // Rotating the starting point per tier stops every tier leading with the same model
    // without affecting the diversity rule below.
    const offset = index % ranked.length;
    const rotated = [...ranked.slice(offset), ...ranked.slice(0, offset)];

    // Diversity is enforced per tier, not merely encouraged by a globally interleaved
    // ordering. An earlier version interleaved providers once and then had each tier
    // stride through that list, which reads as diverse and is not: with three NVIDIA
    // models and one Cohere, the proposer tier drew all three NVIDIA seats — precisely
    // the single-provider tier this is supposed to prevent.
    const seats = [];
    const seatProviders = new Set();
    for (const model of rotated) {
      if (seats.length >= tierSize) break;
      if (seatProviders.has(providerOf(model.id))) continue;
      seats.push(model.id);
      seatProviders.add(providerOf(model.id));
    }
    // Only once every distinct provider already holds a seat may a provider take a
    // second one. With N providers and N < tierSize a repeat is unavoidable, and a
    // short tier would be worse than a slightly concentrated one.
    for (const model of rotated) {
      if (seats.length >= tierSize) break;
      if (!seats.includes(model.id)) seats.push(model.id);
    }
    rosters[tier] = seats;
  }
  return rosters;
}

// ── The free-only invariant ──────────────────────────────────────────────────
// The last line of defence before anything is written. council.js throws on a non-free
// slug at call time; this makes sure such a slug never reaches the file to begin with.
export function assertFreeOnly(rosters, freeCatalogue) {
  for (const [tier, models] of Object.entries(rosters)) {
    for (const model of models) {
      if (!model.endsWith(":free")) {
        throw new Error(`Refusing to publish a non-free slug in ${tier}: ${model}`);
      }
      const listed = freeCatalogue.get(model);
      if (!listed) {
        throw new Error(`Refusing to publish an unlisted slug in ${tier}: ${model}`);
      }
      if (Number(listed.pricing?.prompt) !== 0 || Number(listed.pricing?.completion) !== 0) {
        throw new Error(`Refusing to publish a priced slug in ${tier}: ${model}`);
      }
    }
  }
  return true;
}

export async function readExistingRoster(rosterPath = ROSTER_PATH) {
  try {
    return JSON.parse(await readFile(rosterPath, "utf8"));
  } catch {
    return null;
  }
}

export async function buildRoster({
  now = new Date(),
  fetchImpl = globalThis.fetch,
  rosterPath = ROSTER_PATH,
  catalogue = catalogueFromMcp,
  probe = probeWithRetries,
  sleepImpl = sleep,
  log = console.error,
} = {}) {
  const nowIso = now.toISOString();
  const existing = await readExistingRoster(rosterPath);
  const previousHealth = existing?.health ?? {};

  const [mcp, freeCatalogue] = await Promise.all([catalogue(), liveFreeCatalogue({ fetchImpl })]);
  log(`MCP: ${mcp.candidates.length} candidates (status=${mcp.status}, stale=${mcp.stale})`);
  log(`OpenRouter: ${freeCatalogue.size} live :free slugs`);

  const rejected = [];
  const eligible = [];
  for (const candidate of mcp.candidates) {
    const id = candidate.id;
    if (candidate.freeKind !== "concrete_free" || candidate.isFree !== true) {
      rejected.push({ id, gate: "catalogue", reason: `freeKind=${candidate.freeKind}` });
      continue;
    }
    const listed = freeCatalogue.get(id);
    if (!listed) {
      rejected.push({ id, gate: "openrouter", reason: "not a live :free slug" });
      continue;
    }
    const daysLeft = daysUntil(listed.expiration_date ?? candidate.expirationDate ?? null, nowIso);
    if (daysLeft < MIN_DAYS_BEFORE_EXPIRY) {
      rejected.push({ id, gate: "lifecycle", reason: `retires in ${Math.round(daysLeft)}d` });
      continue;
    }
    eligible.push({ id, contextLength: listed.context_length ?? candidate.contextLength ?? 0 });
  }
  log(`Eligible after catalogue gates: ${eligible.length}`);

  // Spend the run's probe budget where the evidence is weakest: models never verified
  // first, then those whose last success is oldest. A model skipped this run is not
  // penalised — it keeps whatever standing its health record already earned.
  const staleness = (id) => {
    const lastOkAt = previousHealth[id]?.lastOkAt;
    return lastOkAt ? Date.parse(lastOkAt) : -Infinity;
  };
  const byEvidenceAge = [...eligible].sort((a, b) => staleness(a.id) - staleness(b.id));
  const toProbe = new Set(byEvidenceAge.slice(0, PROBE_BUDGET_PER_RUN).map((model) => model.id));
  const skipped = eligible.length - toProbe.size;
  if (skipped > 0) {
    // Never silently. A run that checked 8 of 17 must not read as a run that checked 17.
    log(`Probing ${toProbe.size} of ${eligible.length} (budget ${PROBE_BUDGET_PER_RUN}); ${skipped} carried on existing evidence.`);
  }

  const health = { ...previousHealth };
  const verified = [];
  let probesSpent = 0;
  for (const model of eligible) {
    if (toProbe.has(model.id)) {
      const result = await probe(model.id, { fetchImpl, sleepImpl });
      health[model.id] = mergeHealth(previousHealth, model.id, result, nowIso);
      probesSpent += 1;
      log(`  ${result.ok ? "OK  " : "FAIL"} ${model.id} (${result.attempts} attempt(s), ${result.ms}ms${result.ok ? "" : `, ${result.reason}`})`);
      if (isWithinWindow(health[model.id].lastOkAt, nowIso)) {
        verified.push({ ...model, health: health[model.id], freshlyVerified: result.ok });
      } else {
        rejected.push({ id: model.id, gate: "probe", reason: result.reason ?? "no success in window" });
      }
      // Spacing between models as well as between attempts. Probing the whole set
      // back-to-back is what triggered the throttling this window exists to absorb.
      if (probesSpent < toProbe.size) await sleepImpl(PROBE_SPACING_MS);
      continue;
    }

    // Not probed this run. Its seat still depends on having answered inside the window,
    // so a carried model that goes quiet for VERIFY_WINDOW_DAYS still drops out — the
    // budget delays re-verification, it does not exempt anything from it.
    const carried = previousHealth[model.id];
    if (carried && isWithinWindow(carried.lastOkAt, nowIso)) {
      health[model.id] = carried;
      verified.push({ ...model, health: carried, freshlyVerified: false });
    } else {
      rejected.push({ id: model.id, gate: "probe", reason: "not probed this run and no success in window" });
    }
  }

  // Health entries for models that have left the catalogue entirely are dropped rather
  // than kept forever — a withdrawn slug is not coming back under the same id.
  for (const id of Object.keys(health)) {
    if (!eligible.some((model) => model.id === id)) delete health[id];
  }

  if (verified.length === 0) {
    throw new Error("No free model passed verification — refusing to publish an empty roster");
  }

  const rosters = assignTiers(verified);
  assertFreeOnly(rosters, freeCatalogue);

  // `verifiedAt` is the newest moment a published model actually answered — NOT the
  // moment this run happened. The distinction matters: on a fully rate-limited day
  // every probe fails while the rolling window keeps the roster intact, and stamping
  // `verifiedAt` with the run time would reset the page's staleness clock without a
  // single live confirmation behind it. The page would then claim "verified today" on
  // the strength of nothing. Because this is a maximum over real successes, a run that
  // confirms nothing leaves the timestamp where it was and the displayed age keeps
  // growing, which is the honest outcome.
  const successTimes = verified
    .map((model) => Date.parse(model.health.lastOkAt))
    .filter((value) => Number.isFinite(value));
  const verifiedAt = new Date(Math.max(...successTimes)).toISOString();
  const freshlyVerified = verified.filter((model) => model.freshlyVerified).length;
  log(`Published ${verified.length} model(s); ${freshlyVerified} confirmed live in this run.`);
  if (freshlyVerified === 0) {
    log("WARNING: no model answered in this run — every seat is riding the health window.");
  }

  const roster = {
    schemaVersion: "1",
    verifiedAt,
    // When this run executed, whether or not anything answered. Kept separate from
    // verifiedAt so "the job is alive" and "a model actually replied" stay distinguishable.
    generatedAt: nowIso,
    // How many published models answered in this run rather than riding the window.
    freshlyVerified,
    generator: "scripts/refresh-free-roster.mjs",
    relay: RELAY,
    source: {
      mcp: MCP_PACKAGE,
      dashboardStatus: mcp.status,
      dashboardStale: mcp.stale,
      dashboardWarnings: mcp.warnings,
    },
    verifyWindowDays: VERIFY_WINDOW_DAYS,
    // What this run actually checked, so "8 of 17" never reads as "17 of 17".
    probed: probesSpent,
    probeBudget: PROBE_BUDGET_PER_RUN,
    eligible: eligible.length,
    rosters,
    verified: verified
      .map((model) => ({
        id: model.id,
        contextLength: String(model.contextLength),
        lastOkAt: model.health.lastOkAt,
        lastLatencyMs: model.health.lastLatencyMs,
        freshlyVerified: model.freshlyVerified,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    rejected: rejected.sort((a, b) => a.id.localeCompare(b.id)),
    health,
  };

  const directory = path.dirname(rosterPath);
  const temporary = path.join(directory, `.free-roster.json.tmp-${process.pid}`);
  await writeFile(temporary, `${JSON.stringify(roster, null, 2)}\n`, "utf8");
  try { await rename(temporary, rosterPath); } finally { await rm(temporary, { force: true }); }
  return roster;
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  buildRoster()
    .then((roster) => {
      console.error(`Wrote ${ROSTER_PATH}`);
      console.error(`  verified: ${roster.verified.length}  rejected: ${roster.rejected.length}`);
      for (const tier of TIERS) console.error(`  ${tier}: ${roster.rosters[tier].join(", ")}`);
    })
    .catch((error) => {
      console.error(`refresh-free-roster failed: ${error.message}`);
      process.exitCode = 1;
    });
}
