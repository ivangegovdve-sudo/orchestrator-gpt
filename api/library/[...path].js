"use strict";
// Vercel serverless proxy — forwards all /api/library/* to KVM2 library API
// Avoids browser mixed-content block (HTTPS page → HTTP backend)

const KVM2_BASE = process.env.LIBRARY_API_URL || "http://187.127.86.176:8765";

module.exports = async function handler(req, res) {
  const pathSegments = req.query.path || [];
  const subpath = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments;
  const filtered = Object.entries(req.query).filter(([k]) => k !== "path");
  const qs = filtered.length ? "?" + new URLSearchParams(filtered).toString() : "";
  const target = `${KVM2_BASE}/${subpath}${qs}`;

  const headers = { "Content-Type": "application/json" };
  if (req.headers.authorization) headers["Authorization"] = req.headers.authorization;

  const fetchOpts = { method: req.method, headers };
  if (req.method === "POST" && req.body) {
    fetchOpts.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(target, fetchOpts);
    const data = await upstream.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Library API unreachable", detail: err.message });
  }
};
