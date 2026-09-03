"use strict";

const fs = require("fs").promises;
const path = require("path");

const DATA_ROOT = path.join(process.cwd(), "data", "fleet");
const FLEET_HEALTH_URL = process.env.FLEET_HEALTH_URL || "https://chloe.blumenkraft.cloud/fleet-health";
const HTTP_TIMEOUT_MS = 12000;

const CANONICAL_INTENT_SOURCE = {
  copy_id: "copy-chloe-canonical",
  source: "chloe:/opt/fleet/intent-ledger.json",
  file: "intents-canonical.json",
};
const INTENT_COPY_DEFINITIONS = [
  {
    copy_id: "copy-oracle",
    source: "oracle:/opt/fleet/state/intent-ledger.db",
    file: "intent-copy-oracle.json",
    default_for_diff: "missing",
  },
  {
    copy_id: "copy-kvm2",
    source: "kvm2:/srv/fleet/intents.jsonl",
    file: "intent-copy-kvm2.json",
    default_for_diff: "missing",
  },
];

function jsonResponse(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(status).json(payload);
}

function parseJson(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

async function readDataFile(filename, fallback = null) {
  const fullPath = path.join(DATA_ROOT, filename);
  try {
    const raw = await fs.readFile(fullPath, "utf8");
    return parseJson(raw, fallback);
  } catch (err) {
    return fallback;
  }
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function ageMs(ts) {
  if (!ts) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(ts);
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Date.now() - parsed);
}

function formatAge(ms) {
  if (!Number.isFinite(ms) || ms === Number.POSITIVE_INFINITY) return "unknown";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

function staleObject(collectedAt, maxMs = 5 * 60 * 1000) {
  const age = ageMs(collectedAt);
  return {
    collected_at: toIso(collectedAt),
    age_ms: age,
    age_text: formatAge(age),
    is_stale: age > maxMs,
  };
}

function sumLastCycles(values, window) {
  if (!Array.isArray(values)) return 0;
  return values.slice(-window).reduce((acc, item) => acc + safeNumber(item), 0);
}

function humanSince(ts) {
  if (!ts) return "never";
  const age = ageMs(ts);
  if (!Number.isFinite(age)) return "unknown";
  const mins = Math.floor(age / 60000);
  if (mins < 1) return "just now";
  const hrs = Math.floor(mins / 60);
  if (hrs < 1) return `${mins}m ago`;
  const days = Math.floor(hrs / 24);
  if (days < 1) return `${hrs}h ago`;
  return `${days}d ${hrs % 24}h ago`;
}

function pipelineState(pipeline, windowCycles) {
  const eligible = safeNumber(pipeline.eligible);
  const free = safeNumber(pipeline.capacity_free);
  const dispatched = sumLastCycles(pipeline.dispatched_last_cycles, windowCycles);
  const isStuck = eligible > 0 && free > 0 && dispatched === 0;
  let status = pipeline.status || "unknown";
  if (isStuck) status = "stuck";
  return {
    name: pipeline.name,
    display_name: pipeline.display_name || pipeline.name,
    status,
    eligible,
    capacity_free: free,
    dispatched_last_cycles: pipeline.dispatched_last_cycles || [],
    dispatched_last_n_cycles: safeNumber(dispatched),
    last_successful_dispatch_at: toIso(pipeline.last_successful_dispatch_at),
    time_since_last_successful_dispatch: humanSince(toIso(pipeline.last_successful_dispatch_at)),
    failing_step: pipeline.failing_step || null,
    last_error: pipeline.last_error || null,
    source: pipeline.source || "local:pipeline-observability",
    is_stuck: isStuck,
    effective_health:
      isStuck
        ? "stuck"
        : status === "degraded"
          ? "degraded"
          : status === "ok"
            ? "ok"
            : "unknown",
    notes: isStuck
      ? `No dispatched items in last ${pipelineWindowToLabel(windowCycles)} cycles while eligible work and capacity exist.`
      : status,
  };
}

function pipelineWindowToLabel(windowCycles) {
  return `${windowCycles}`;
}

function classifyBudget(source) {
  const declared = source.declared_allowance;
  const actual = safeNumber(source.actual_consumption);
  const isUnlimited = declared === null || declared === undefined;
  if (isUnlimited) {
    return {
      state: "unlimited",
      remaining: null,
      finding: "declared-unlimited",
      flags: ["unlimited"],
      remaining_pct: null,
    };
  }
  const remaining = declared - actual;
  const remainingPct = declared > 0 ? Math.round((remaining / declared) * 100) : null;
  if (remaining < 0) return {
    state: "over",
    remaining,
    finding: "over-consumption",
    flags: ["over-consumption"],
    remaining_pct: remainingPct,
  };
  if (actual < declared * 0.2) return {
    state: "under",
    remaining,
    finding: "under-consumption",
    flags: ["under-consumption"],
    remaining_pct: remainingPct,
  };
  return {
    state: "healthy",
    remaining,
    finding: null,
    flags: [],
    remaining_pct: remainingPct,
  };
}

function bucketConfidence(events) {
  const buckets = [
    { label: "0.0-0.2", min: 0, max: 0.2, count: 0 },
    { label: "0.2-0.4", min: 0.2, max: 0.4, count: 0 },
    { label: "0.4-0.6", min: 0.4, max: 0.6, count: 0 },
    { label: "0.6-0.8", min: 0.6, max: 0.8, count: 0 },
    { label: "0.8-1.0", min: 0.8, max: 1.0, count: 0 },
  ];
  const all = Array.isArray(events) ? events : [];
  for (const item of all) {
    const conf = safeNumber(item.confidence);
    const bucket = conf >= 0.8
      ? 4
      : conf >= 0.6
        ? 3
        : conf >= 0.4
          ? 2
          : conf >= 0.2
            ? 1
            : 0;
    if (bucket >= 0 && bucket < buckets.length) buckets[bucket].count++;
  }
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return buckets.map((bucket) => ({ ...bucket, normalized: bucket.count / max }));
}

function hourlyBuckets(events, nowIso = new Date().toISOString()) {
  const now = new Date(nowIso).getTime();
  const bucketCount = 24;
  const bins = Array.from({ length: bucketCount }, () => 0);
  if (!Array.isArray(events)) return bins;

  for (const item of events) {
    const t = Date.parse(item.ts);
    if (!Number.isFinite(t)) continue;
    if (now - t > 24 * 3600 * 1000 || t > now) continue;
    const ageMinutes = Math.floor((now - t) / 60000);
    const bucket = bucketCount - 1 - Math.min(bucketCount - 1, Math.floor(ageMinutes / 60));
    if (bucket >= 0 && bucket < binCountSafe) bins[bucket]++;
  }

  return bins;
}

const binCountSafe = 24;

function wakeWordAbnormality(events, baselinePerHour = 0.4) {
  if (!Array.isArray(events)) return { is_abnormal: false, reason: null, baseline_per_hour: baselinePerHour };
  const falseTriggers = events.filter((e) => e && e.true_trigger === false);
  const falsePerHour = falseTriggers.length / 24;
  const isAbnormal = falsePerHour > baselinePerHour;
  return {
    is_abnormal: isAbnormal,
    reason: isAbnormal
      ? `False triggers ${Math.round(falsePerHour * 10) / 10}/h exceed ${baselinePerHour}/h expected window`
      : "False-trigger rate in expected band",
    false_per_hour: Math.round(falsePerHour * 10) / 10,
    baseline_per_hour: baselinePerHour,
    sample_total: falseTriggers.length,
  };
}

async function compareCopiesWithCanonical() {
  const canonical = await readDataFile(CANONICAL_INTENT_SOURCE.file, null);
  if (!canonical) return { error: "canonical intent ledger not readable" };
  const canonicalIds = new Set((canonical.entries || []).map((item) => item.id));
  const copies = [];

  for (const copy of INTENT_COPY_DEFINITIONS) {
    const data = await readDataFile(copy.file, null);
    if (!data) continue;
    const ids = new Set((data.entries || []).map((item) => item.id));
    const onlyInCopy = [...ids].filter((id) => !canonicalIds.has(id));
    const onlyInCanonical = [...canonicalIds].filter((id) => !ids.has(id));
    copies.push({
      copy_id: copy.copy_id,
      source: copy.source,
      entry_count: safeNumber(data.entry_count),
      collected_at: toIso(data.collected_at),
      sample_ids: (data.entries || []).map((item) => item.id).slice(0, 12),
      only_in_this_copy: onlyInCopy.slice(0, 6),
      canonical_missing: onlyInCanonical.slice(0, 6),
    });
  }

  return {
    canonical: {
      copy_id: CANONICAL_INTENT_SOURCE.copy_id,
      source: CANONICAL_INTENT_SOURCE.source,
      entry_count: safeNumber(canonical.entry_count),
      captured_at: toIso(canonical.captured_at),
      reason: canonical.reason || "selected as canonical",
    },
    copies,
  };
}

async function collectFleetHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(FLEET_HEALTH_URL, { signal: controller.signal });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        fetched_at: new Date().toISOString(),
        reason: `fleet-health HTTP ${res.status}`,
        raw: payload || {},
      };
    }
    return {
      ok: true,
      fetched_at: new Date().toISOString(),
      payload,
    };
  } catch (err) {
    return {
      ok: false,
      fetched_at: new Date().toISOString(),
      reason: `fleet-health request failed: ${err.message}`,
      raw: {},
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildAgentRows(rawAgents) {
  const canonical = ["iris", "sheriff", "anderson", "chloe"];
  const entries = Array.isArray(rawAgents) ? rawAgents : [];
  const byName = new Map(
    entries
      .filter((agent) => agent && typeof agent.name === "string")
      .map((agent) => [String(agent.name).toLowerCase(), agent]),
  );
  const byAlias = new Map();

  for (const agent of entries) {
    if (agent && typeof agent.alias_of === "string") {
      byAlias.set(String(agent.alias_of).toLowerCase(), String(agent.name).toLowerCase());
    }
  }

  return canonical.map((name) => {
    const direct = byName.get(name);
    const aliased = direct
      ? direct
      : byName.get(byAlias.get(name));
    if (!aliased) {
      return {
        name,
        status: "offline",
        status_text: "not reported in upstream /fleet-health",
        source: "fleet-health",
        latency_ms: null,
        port: null,
      };
    }
    return {
      name,
      status: aliased.status || "offline",
      status_text: aliased.status || "unknown",
      source: aliased.source || aliased.host || "fleet-health",
      latency_ms: safeNumber(aliased.latency_ms),
      port: safeNumber(aliased.port),
      last_seen: aliased.last_seen || aliased.lastSeen || null,
      model: aliased.model || null,
      provider: aliased.provider || null,
    };
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "OPTIONS") {
    return jsonResponse(res, 405, { error: "Method not allowed", detail: "Use GET /api/fleet/dashboard" });
  }
  if (req.method === "OPTIONS") {
    return jsonResponse(res, 204, {});
  }

  try {
    const [pipelineData, budgetData, voiceData, intentCompare, health] = await Promise.all([
      readDataFile("pipeline-observability.json", null),
      readDataFile("research-budgets.json", null),
      readDataFile("voice-telemetry.json", null),
      compareCopiesWithCanonical(),
      collectFleetHealth(),
    ]);

    const pipelineWindow = safeNumber((pipelineData && pipelineData.pipeline_window_cycles) || 9);
    const windows = Array.isArray(pipelineData && pipelineData.pipelines) ? pipelineData.pipelines : [];
    const transformedPipelines = windows.map((pipeline) => pipelineState(pipeline, pipelineWindow));
    const allStuck = transformedPipelines.filter((pipeline) => pipeline.is_stuck);
    const pipelineFreshness = staleObject(pipelineData && pipelineData.collected_at, 15 * 60 * 1000);
    const budgetFreshness = staleObject(budgetData && budgetData.collected_at, 60 * 60 * 1000);
    const voiceFreshness = staleObject(voiceData && voiceData.collected_at, 20 * 60 * 1000);

    const budgetRows = Array.isArray(budgetData && budgetData.sources)
      ? budgetData.sources.map((item) => {
          const classification = classifyBudget(item);
          return {
            id: item.id,
            name: item.name || item.id,
            declared_allowance: item.declared_allowance,
            declared_cadence: item.declared_cadence || "unknown",
            actual_consumption: safeNumber(item.actual_consumption),
            period_remaining_allowance: item.period_remaining_allowance,
            period_spent: item.period_spent || null,
            fallback_hits: safeNumber(item.fallback_hits),
            notes: item.notes || null,
            state: classification,
          };
        })
      : [];

    const totalWakeEvents = Array.isArray(voiceData?.wake_word?.last_30_days) ? voiceData.wake_word.last_30_days : [];
    const wakeBuckets = bucketConfidence(totalWakeEvents);
    const hourBuckets = hourlyBuckets(totalWakeEvents);
    const falseTriggers = totalWakeEvents.filter((event) => event && event.true_trigger === false);
    const trueTriggers = totalWakeEvents.filter((event) => event && event.true_trigger === true);
    const wakeAbnormality = wakeWordAbnormality(totalWakeEvents, 2);

    const voicePayload = {
      avatar: voiceData ? voiceData.avatar : null,
      vad: voiceData ? voiceData.vad : null,
      wake_word: voiceData ? voiceData.wake_word : null,
      last_30_days_events: totalWakeEvents,
      wake_word_distribution: wakeBuckets,
      wake_word_hourly_count_last_24h: hourBuckets,
      wake_word_abnormality: wakeAbnormality,
      freshness: voiceFreshness,
      provenance: voiceData ? { source: voiceData.source, collected_at: toIso(voiceData.collected_at) } : null,
    };

    const agents = buildAgentRows(health.ok ? health.payload.agents : []);
    const upstreamOk = health.ok;

    jsonResponse(res, 200, {
      generated_at: new Date().toISOString(),
      upstream_fleet_health: {
        ok: upstreamOk,
        fetched_at: health.fetched_at,
        reason: health.ok ? null : health.reason,
        source: health.ok ? FLEET_HEALTH_URL : null,
        payload: upstreamOk ? { status: health.payload.status || null } : null,
      },
      provenance: {
        pipelines: pipelineData ? pipelineData.source : null,
        budgets: budgetData ? budgetData.source : null,
        voice: voiceData ? voiceData.source : null,
        intents: intentCompare && intentCompare.canonical ? CANONICAL_INTENT_SOURCE : null,
        agents: upstreamOk ? "https://chloe.blumenkraft.cloud/fleet-health" : "stale cached upstream",
        generated_at: new Date().toISOString(),
      },
      freshness: {
        agents: {
          collected_at: health.ok ? upstreamOk ? health.fetched_at : null : null,
          age_text: upstreamOk ? "live" : "stale",
          age_ms: 0,
          is_stale: !upstreamOk,
        },
        pipelines: pipelineFreshness,
        budgets: budgetFreshness,
        voice: voiceFreshness,
      },
      fleet_agents: agents,
      pipelines: transformedPipelines,
      pipeline_window_cycles: pipelineWindow,
      pipeline_stuck_count: allStuck.length,
      budgets: {
        period: budgetData ? budgetData.period : null,
        rows: budgetRows,
      },
      budgets_summary: {
        over_consuming: budgetRows.filter((row) => row.state.state === "over").map((row) => row.id),
        under_consumed: budgetRows.filter((row) => row.state.state === "under").map((row) => row.id),
        unlimited: budgetRows.filter((row) => row.state.state === "unlimited").map((row) => row.id),
      },
      voice: voicePayload,
      intents: {
        canonical: intentCompare.canonical || null,
        copies: intentCompare.copies || [],
        comparison_ok: !intentCompare.error && Array.isArray(intentCompare.copies),
        comparison_error: intentCompare.error || null,
      },
    });
  } catch (err) {
    return jsonResponse(res, 502, {
      error: "Dashboard assembly failed",
      detail: err.message,
      generated_at: new Date().toISOString(),
    });
  }
};
