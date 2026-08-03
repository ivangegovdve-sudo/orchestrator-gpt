"use strict";
// Vercel serverless proxy — SDForest code-search → graphify service on Oracle.
//
// Forwards GET /api/graphify/search?q=<term> and /api/graphify/health
// to the Oracle FastAPI service, adding CORS headers.
//
// Same pattern as api/voice.js.

const GRAPHIFY_BASE =
  process.env.GRAPHIFY_API_URL || "https://chloe.blumenkraft.cloud";

const ALLOWED_PATHS = new Set(["/graphify/search", "/graphify/health"]);

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Only GET allowed
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Route: /api/graphify/search → /graphify/search
  //        /api/graphify/health → /graphify/health
  const reqPath = req.url || "/";
  let upstreamPath = "/graphify/health";
  if (reqPath.includes("/search")) {
    const q = new URL("http://x" + reqPath).searchParams.get("q") || "";
    const limit = new URL("http://x" + reqPath).searchParams.get("limit") || "30";
    if (!q) return res.status(400).json({ error: "q is required" });
    upstreamPath = `/graphify/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`;
  }

  const upstreamUrl = `${GRAPHIFY_BASE}${upstreamPath}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      // Self-signed cert on Oracle — disable TLS verification via custom agent below
    });
    const data = await upstream.json();
    res.setHeader("Content-Type", "application/json");
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("graphify proxy error:", err.message);
    return res.status(502).json({ error: "Upstream graphify service unavailable", detail: err.message });
  }
};
