"use strict";
// Fleet status — proxies https://chloe.blumenkraft.cloud/fleet-health
// Soul-server probes all agents internally (Oracle firewall blocks direct port access from Vercel CDN).
// No auth required on the /fleet-health endpoint.
// Cache: 30s at edge.

const FLEET_HEALTH_URL = "https://chloe.blumenkraft.cloud/fleet-health";
const TIMEOUT_MS = 10000;

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(FLEET_HEALTH_URL, { signal: controller.signal });
    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream returned ${upstream.status}` });
    }
    const data = await upstream.json();
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=10");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: "fleet-health unreachable", detail: e.message });
  } finally {
    clearTimeout(timer);
  }
};