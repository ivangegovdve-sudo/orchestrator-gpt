"use strict";
// Vercel proxy: receives /api/library/* via rewrite, forwards to KVM2 library API.
// Rewrite in vercel.json passes the sub-path as ?subpath=search/glossary etc.

const KVM2_BASE = "http://187.127.86.176:8765";

module.exports = async function handler(req, res) {
  const subpath = req.query.subpath || "";
  const filtered = Object.entries(req.query).filter(([k]) => k !== "subpath");
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
