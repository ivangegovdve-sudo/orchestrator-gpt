"use strict";

// Delivers client-side API keys for the Council Console.
// Keys live in Vercel env vars, never in source. The OR key unlocks free
// models for anyone; the Groq key is returned separately and the client
// gates it behind the access code entered in the UI.
module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const or   = process.env.OPENROUTER_API_KEY || "";
  const groq = process.env.GROQ_API_KEY || "";

  if (!or) return res.status(503).json({ error: "OPENROUTER_API_KEY not configured" });

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ or, groq });
};
