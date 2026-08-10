"use strict";
// Fleet status probe — polls all hermes agents and soul-server in parallel.
//
// HERMES_API_KEY: set in Vercel dashboard (never commit).
// Called by /web/fleet/index.html on page load and on refresh.
//
// Agent probe: GET /v1/models with Bearer key → 200 = online.
// Soul-server probe: GET /health (no auth) → 200 = online.
// Timeout: 4 s per probe; all probes fire in parallel.
// Cache: 30 s at the edge via s-maxage.

const ORACLE = "144.24.59.30";
const KVM2   = "187.127.86.176";
const TIMEOUT_MS = 4000;

const AGENTS = [
  { name: "iris",      port: 8644, host: "oracle", ip: ORACLE },
  { name: "artist",    port: 8652, host: "oracle", ip: ORACLE },
  { name: "sheriff",   port: 8650, host: "oracle", ip: ORACLE },
  { name: "banker",    port: 8646, host: "oracle", ip: ORACLE },
  { name: "librarian", port: 8701, host: "oracle", ip: ORACLE },
  { name: "anderson",  port: 8648, host: "kvm2",   ip: KVM2   },
];

async function probe(url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers, signal: controller.signal });
    return { ok: r.ok, latency_ms: Date.now() - t0 };
  } catch {
    return { ok: false, latency_ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "https://sdforest.site");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const bearerKey = process.env.HERMES_API_KEY || "";
  const agentHeaders = bearerKey
    ? { Authorization: `Bearer ${bearerKey}` }
    : {};

  const [soulResult, ...agentResults] = await Promise.all([
    probe(`http://${ORACLE}:8654/health`, {}),
    ...AGENTS.map(a => probe(`http://${a.ip}:${a.port}/v1/models`, agentHeaders)),
  ]);

  const agents = AGENTS.map((a, i) => ({
    name:       a.name,
    port:       a.port,
    host:       a.host,
    status:     agentResults[i].ok ? "online" : "error",
    latency_ms: agentResults[i].latency_ms,
  }));

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=10");
  return res.status(200).json({
    agents,
    soul_server: {
      status:     soulResult.ok ? "online" : "error",
      latency_ms: soulResult.latency_ms,
    },
    updated_at: new Date().toISOString(),
  });
};
