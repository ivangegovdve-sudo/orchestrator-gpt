"use strict";
// Vercel serverless proxy — SDForest code-search → graphify service on Oracle.
//
// Vercel only routes the first path segment on this project (custom outputDirectory).
// Sub-paths like /api/graphify/search 404. Route travels in query params instead:
//
//   GET /api/graphify?q=<term>&limit=<n>  → /graphify/search
//   GET /api/graphify                      → /graphify/health
//
// Same pattern as api/voice.js.

const GRAPHIFY_BASE =
  process.env.GRAPHIFY_API_URL || "https://chloe.blumenkraft.cloud";

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

  const params = new URL("http://x" + (req.url || "/")).searchParams;
  const q = params.get("q") || "";
  const limit = params.get("limit") || "30";

  // If q is provided → search; otherwise → health
  let upstreamPath;
  if (q) {
    upstreamPath = `/graphify/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`;
  } else {
    upstreamPath = "/graphify/health";
  }

  const upstreamUrl = `${GRAPHIFY_BASE}${upstreamPath}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await upstream.json();
    res.setHeader("Content-Type", "application/json");
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("graphify proxy error:", err.message);
    return res.status(502).json({ error: "Upstream graphify service unavailable", detail: err.message });
  }
};
