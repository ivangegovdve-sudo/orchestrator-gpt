"use strict";

const fs = require("fs").promises;
const path = require("path");

const DATA_ROOT = path.join(process.cwd(), "data", "fleet");
const CANONICAL_FILE = path.join(DATA_ROOT, "intents-canonical.json");
const COMPANION_COPIES = [
  { copy_id: "copy-oracle", file: path.join(DATA_ROOT, "intent-copy-oracle.json") },
  { copy_id: "copy-kvm2", file: path.join(DATA_ROOT, "intent-copy-kvm2.json") },
];

function jsonResponse(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(status).json(body);
}

function parseJson(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function readDataFile(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseJson(raw, fallback);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function canonicalComparison(canonical, copies) {
  const canonicalEntries = Array.isArray(canonical.entries) ? canonical.entries : [];
  const canonicalIds = new Set(canonicalEntries.map((entry) => entry.id));
  return copies.map((copy) => {
    const ids = new Set(Array.isArray(copy.entries) ? copy.entries.map((entry) => entry.id) : []);
    const copyOnly = [...ids].filter((id) => !canonicalIds.has(id));
    const canonicalOnly = [...canonicalIds].filter((id) => !ids.has(id));
    return {
      copy_id: copy.copy_id,
      source: copy.source || null,
      entry_count: Number(copy.entry_count) || 0,
      collected_at: toIso(copy.collected_at),
      sample_ids: Array.isArray(copy.entries) ? copy.entries.map((entry) => entry.id).slice(0, 12) : [],
      only_in_this_copy: copyOnly.slice(0, 6),
      canonical_missing: canonicalOnly.slice(0, 6),
    };
  });
}

async function readIntentPayload() {
  const canonical = await readDataFile(CANONICAL_FILE, {
    copy_id: "copy-chloe-canonical",
    source: "chloe:/opt/fleet/intent-ledger.json",
    entry_count: 0,
    captured_at: null,
    reason: "canonical file missing",
    entries: [],
  });
  const copies = [];
  let totalEntriesObserved = Number(canonical.entry_count) || 0;
  for (const copy of COMPANION_COPIES) {
    const data = await readDataFile(copy.file, { copy_id: copy.copy_id, source: null, entry_count: 0, collected_at: null, entries: [] });
    const companion = (await readDataFile(copy.file, null)) || { copy_id: copy.copy_id };
    const merged = { ...data, ...companion, file: copy.file };
    copies.push(merged);
    totalEntriesObserved += Number(merged.entry_count) || 0;
  }

  const openCount = Array.isArray(canonical.entries)
    ? canonical.entries.filter((intent) => intent.status === "open").length
    : 0;

  const claimedCount = Array.isArray(canonical.entries)
    ? canonical.entries.filter((intent) => intent.status === "claimed").length
    : 0;

  const closedCount = Array.isArray(canonical.entries)
    ? canonical.entries.filter((intent) => intent.status === "closed").length
    : 0;

  return {
    canonical,
    open_queue: (canonical.entries || [])
      .filter((intent) => intent.status !== "closed")
      .map((intent) => ({ ...intent })),
    stats: {
      total_entries: Number(canonical.entry_count) || 0,
      open_count: openCount,
      claimed_count: claimedCount,
      closed_count: closedCount,
      updated_at: nowIso(),
      total_seen: Number(canonical.entry_count) || 0,
      copy_count: copies.length + 1,
      total_observed_entries: totalEntriesObserved,
    },
    copies: copies.map((copy) => ({ ...copy, file: undefined })),
    comparison: canonicalComparison(canonical, copies),
  };
}

function mutateIntent(item, action, actor) {
  if (!item) return;
  if (action === "claim") {
    if (item.status === "open") {
      item.status = "claimed";
      item.claimed_by = actor;
      item.claimed_at = nowIso();
      delete item.closed_by;
      delete item.closed_at;
    }
    return;
  }
  if (action === "close") {
    item.status = "closed";
    item.closed_by = actor;
    item.closed_at = nowIso();
    return;
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return jsonResponse(res, 204, {});
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Method not allowed", detail: "Use GET or POST" });
  }

  try {
    if (req.method === "GET") {
      const payload = await readIntentPayload();
      return jsonResponse(res, 200, payload);
    }

    const body = typeof req.body === "string" ? parseJson(req.body, {}) : (req.body || {});
    const action = body.action;
    const intentId = body.intent_id;
    const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim() : "fleet-operator";
    if (!["claim", "close"].includes(action)) {
      return jsonResponse(res, 400, { error: "Invalid action", detail: "Use action: claim or close" });
    }
    if (!intentId) return jsonResponse(res, 400, { error: "intent_id required" });

    const payload = await readIntentPayload();
    const canonical = await readDataFile(CANONICAL_FILE, null);
    if (!canonical || !Array.isArray(canonical.entries)) {
      return jsonResponse(res, 500, { error: "Canonical ledger unreadable" });
    }

    const idx = canonical.entries.findIndex((intent) => intent.id === intentId);
    if (idx < 0) return jsonResponse(res, 404, { error: "Intent not found", detail: `No intent ${intentId} in canonical ledger` });

    mutateIntent(canonical.entries[idx], action, actor);
    canonical.entry_count = Math.max(0, Number(canonical.entry_count) || 0);
    canonical.captured_at = nowIso();
    await writeJson(CANONICAL_FILE, canonical);

    return jsonResponse(res, 200, {
      ...payload,
      action,
      intent_id: intentId,
      updated_at: nowIso(),
      canonical: {
        copy_id: canonical.copy_id || "copy-chloe-canonical",
        source: canonical.source || "chloe:/opt/fleet/intent-ledger.json",
        reason: canonical.reason || "canonical authority",
        entry_count: canonical.entry_count,
      },
      updated_intent: canonical.entries[idx],
    });
  } catch (err) {
    return jsonResponse(res, 500, { error: "Intent action failed", detail: err.message });
  }
};
