"use strict";
const https = require("https");

// ── Diverse free-tier model roster ──────────────────────────────────────────
// 6 stages, 4 distinct vendor families, all non-Venice, all :free.
// All slugs verified against OpenRouter /api/v1/models or live-tested, June 2026.
//
// Session-empirical findings (June 21 2026):
//   Venice-hosted (rate-limits aggressively): Nous Hermes, Qwen3-*, Meta Llama.
//   Queues for 60s+ (too slow on free tier): gpt-oss-120b, nemotron-ultra.
//   Confirmed fast and reliable: nemotron-super (12B active), gemma-4-26b MoE (4B active),
//     gemma-4-31b (31B dense), gpt-oss-20b (20B), nex-n2-pro (17B active MoE).
//
// Family map across 6 stages:
//   Stage         Primary slug                          Family
//   -----------   ------------------------------------  --------
//   Proposer R1   openai/gpt-oss-120b                   OpenAI 120B
//   Critic 1      nvidia/nemotron-3-ultra-550b-a55b     NVIDIA Ultra (55B active)
//   Proposer R2   google/gemma-4-31b-it                 Google 31B
//   Critic 2      nex-agi/nex-n2-pro                    Nex AGI (17B active MoE) ← NEW family
//   Synthesizer   google/gemma-4-26b-a4b-it             Google MoE (4B active)
//   Judge         openai/gpt-oss-20b                    OpenAI 20B
//
// 4 distinct vendor families: OpenAI · NVIDIA · Google · Nex AGI
// Critic 1 (NVIDIA Ultra) uses TIMEOUT_ULTRA = 75s — Ivan wants the quality.
// All other stages use TIMEOUT_NORMAL = 40s with fast fallbacks.
const ROSTER = {
  proposer_r1:  ["openai/gpt-oss-120b:free",                 "openai/gpt-oss-20b:free"],
  critic:       ["nvidia/nemotron-3-ultra-550b-a55b:free",   "nvidia/nemotron-3-super-120b-a12b:free"],
  proposer_rev: ["google/gemma-4-31b-it:free",               "nvidia/nemotron-3-nano-30b-a3b:free"],
  critic2:      ["nex-agi/nex-n2-pro:free",                  "cohere/north-mini-code:free"],
  synthesizer:  ["google/gemma-4-26b-a4b-it:free",           "nvidia/nemotron-3-super-120b-a12b:free"],
  judge:        ["openai/gpt-oss-20b:free",                  "nvidia/nemotron-3-super-120b-a12b:free"],
};

// ── PAID-FALLBACK KILL GATE (2026-06-21) ────────────────────────────────────
// Free-only policy. When PAID_FALLBACK_ENABLED=false (default), any model slug
// NOT ending in ":free" is blocked before the request — council stays $0.
//   RE-ENABLE after OpenRouter top-up: set Vercel env  PAID_FALLBACK_ENABLED=true
const PAID_FALLBACK_ENABLED = /^(1|true|yes|on|enabled)$/i.test(
  (process.env.PAID_FALLBACK_ENABLED || "").trim()
);
function isFreeSlug(model) {
  return String(model || "").trim().toLowerCase().endsWith(":free");
}

const DEFAULT_ROUNDS = 2;
// TIMEOUT_ULTRA: NVIDIA Ultra (550B, 55B active) is slow — give it headroom.
// TIMEOUT_NORMAL: fast/mid models; falls back quickly so total budget stays sane.
// req.setTimeout only fires on socket inactivity; Promise.race fires on wall-clock.
const TIMEOUT_ULTRA  = 75000;
const TIMEOUT_NORMAL = 40000;

// Short label for SSE display (last path segment, strip :free)
function shortName(slug) {
  return slug.split("/").pop().replace(/:free$/, "");
}

function callSingleModel(messages, apiKey, model, maxTokens, timeoutMs) {
  const tMs = timeoutMs || TIMEOUT_NORMAL;
  const requestPromise = new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens || 600,
      temperature: 0.65,
    });
    const req = https.request(
      {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://sdforest.site",
          "X-Title": "SD Forest LLM Council",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed && parsed.choices && parsed.choices[0] &&
              parsed.choices[0].message && parsed.choices[0].message.content;
            if (!content) return reject(new Error("Empty response: " + data.slice(0, 200)));
            resolve(content);
          } catch (e) {
            reject(new Error("Parse error: " + data.slice(0, 200)));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Timed out after " + tMs + "ms: " + model)),
      tMs
    )
  );

  return Promise.race([requestPromise, timeoutPromise]);
}

// Try each model in order; return { text, model } for the first that succeeds.
async function callWithFallback(messages, apiKey, modelList, maxTokens, timeoutMs) {
  const tMs = timeoutMs || TIMEOUT_NORMAL;
  let lastErr;
  for (const model of modelList) {
    // PAID-FALLBACK KILL GATE: never call a paid model while the gate is off.
    if (!PAID_FALLBACK_ENABLED && !isFreeSlug(model)) {
      lastErr = new Error(
        `PAID_FALLBACK_BLOCKED: '${model}' is not a :free model and ` +
        `PAID_FALLBACK_ENABLED=false — skipped (no spend).`
      );
      continue;
    }
    try {
      const text = await callSingleModel(messages, apiKey, model, maxTokens, tMs);
      return { text, model };
    } catch (err) {
      lastErr = err;
      // Continue to next model on rate-limit, timeout, 5xx, or parse error
    }
  }
  throw lastErr || new Error("All models in roster failed");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "OPENROUTER_API_KEY is not configured on this deployment." });
  }

  let body = "";
  await new Promise((resolve) => {
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", resolve);
  });

  let question, rounds;
  try {
    const parsed = JSON.parse(body);
    question = parsed.question;
    rounds = parsed.rounds;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "question is required." });
  }

  const q = question.trim().slice(0, 2000);
  const numRounds = Math.max(2, Math.min(3, parseInt(rounds, 10) || DEFAULT_ROUNDS));

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.status(200);

  const send = (data) => res.write("data: " + JSON.stringify(data) + "\n\n");

  try {
    const proposerTexts  = [];
    const proposerModels = [];
    const criticTexts    = [];  // all critic rounds (in-loop + critic2)
    const criticModels   = [];

    // ── Round 1: Initial Proposal ──────────────────────────────────────────
    send({ stage: "proposer", round: 1, status: "thinking", roster: ROSTER.proposer_r1.map(shortName) });

    const p1 = await callWithFallback(
      [
        {
          role: "system",
          content:
            "You are the Proposer in a multi-role LLM Council. " +
            "Give a thorough, well-reasoned initial answer. " +
            "Be direct, substantive, and confident. Prioritize depth over hedging.",
        },
        { role: "user", content: q },
      ],
      apiKey, ROSTER.proposer_r1, 600, TIMEOUT_NORMAL
    );
    proposerTexts.push(p1.text);
    proposerModels.push(p1.model);
    send({ stage: "proposer", round: 1, status: "done", text: p1.text, model: shortName(p1.model) });

    // ── Rounds 2..numRounds: Critique then Revise ──────────────────────────
    for (let r = 2; r <= numRounds; r++) {
      const prevProposal = proposerTexts[r - 2];
      const criticRound  = r - 1;  // critic N critiques proposer N
      send({ stage: "critic", round: criticRound, status: "thinking", roster: ROSTER.critic.map(shortName) });

      const c = await callWithFallback(
        [
          {
            role: "system",
            content:
              "You are the Critic in a multi-role LLM Council. " +
              "Identify the key weaknesses, blind spots, or missing nuance in the proposal. " +
              "Be specific and constructive. Note at least two concrete concerns. Be concise.",
          },
          {
            role: "user",
            content:
              "Original question:\n" + q + "\n\n" +
              "Proposed answer (Round " + (r - 1) + "):\n" + prevProposal + "\n\n" +
              "Critique the proposal above.",
          },
        ],
        apiKey, ROSTER.critic, 500, TIMEOUT_ULTRA  // Ultra gets generous timeout
      );
      criticTexts.push(c.text);
      criticModels.push(c.model);
      send({ stage: "critic", round: criticRound, status: "done", text: c.text, model: shortName(c.model) });

      const revRoster = r === 2 ? ROSTER.proposer_rev : ROSTER.proposer_r1;
      send({ stage: "proposer", round: r, status: "thinking", roster: revRoster.map(shortName) });

      const p = await callWithFallback(
        [
          {
            role: "system",
            content:
              "You are the Proposer in a multi-role LLM Council. " +
              "A critic from a different AI family identified weaknesses in your previous answer. " +
              "Revise to address those concerns while preserving your core insights. Be direct.",
          },
          {
            role: "user",
            content:
              "Original question:\n" + q + "\n\n" +
              "Your previous answer (Round " + (r - 1) + "):\n" + prevProposal + "\n\n" +
              "Critic's feedback:\n" + c.text + "\n\n" +
              "Write your revised answer for Round " + r + ".",
          },
        ],
        apiKey, revRoster, 600, TIMEOUT_NORMAL
      );
      proposerTexts.push(p.text);
      proposerModels.push(p.model);
      send({ stage: "proposer", round: r, status: "done", text: p.text, model: shortName(p.model) });
    }

    // ── Second Critic (different family from first) ────────────────────────
    // Critiques the FINAL revised proposal. Sent as critic round=numRounds
    // so the frontend renders "Critic — Round N" with a different model badge.
    const finalProposal = proposerTexts[proposerTexts.length - 1];
    const firstCriticText = criticTexts[0] || "";
    send({ stage: "critic", round: numRounds, status: "thinking", roster: ROSTER.critic2.map(shortName) });

    const c2 = await callWithFallback(
      [
        {
          role: "system",
          content:
            "You are the Second Critic in a multi-role LLM Council — a DIFFERENT AI system from the first critic. " +
            "The proposer has already addressed one round of feedback. Your job: identify what REMAINS " +
            "unaddressed, find angles the first critic missed, or raise new objections. " +
            "Be specific. Note at least two distinct concerns.",
        },
        {
          role: "user",
          content:
            "Original question:\n" + q + "\n\n" +
            "Proposer's revised answer:\n" + finalProposal + "\n\n" +
            "First critic's concerns (already incorporated by the proposer):\n" + firstCriticText.slice(0, 600) + "\n\n" +
            "What important angles remain unaddressed or need deeper scrutiny?",
        },
      ],
      apiKey, ROSTER.critic2, 500, TIMEOUT_NORMAL
    );
    criticTexts.push(c2.text);
    criticModels.push(c2.model);
    send({ stage: "critic", round: numRounds, status: "done", text: c2.text, model: shortName(c2.model) });

    // ── Synthesizer ────────────────────────────────────────────────────────
    send({ stage: "synthesizer", status: "thinking", roster: ROSTER.synthesizer.map(shortName) });

    const allRoundsCtx =
      proposerTexts.map((t, i) =>
        "Proposer Round " + (i + 1) + " (" + shortName(proposerModels[i]) + "):\n" + t
      ).join("\n\n") +
      "\n\n" +
      criticTexts.map((t, i) =>
        "Critic " + (i + 1) + " (" + shortName(criticModels[i]) + "):\n" + t
      ).join("\n\n");

    const synth = await callWithFallback(
      [
        {
          role: "system",
          content:
            "You are the Synthesizer in a multi-role LLM Council. " +
            "You have received proposals and critiques from MULTIPLE distinct AI model families. " +
            "Produce the definitive final answer — incorporate the strongest points from all rounds " +
            "and address ALL critiques. Be comprehensive yet concise.",
        },
        {
          role: "user",
          content: "Original question:\n" + q + "\n\n" + allRoundsCtx + "\n\nSynthesize the best final answer.",
        },
      ],
      apiKey, ROSTER.synthesizer, 700, TIMEOUT_NORMAL
    );
    send({ stage: "synthesizer", status: "done", text: synth.text, model: shortName(synth.model) });

    // ── Judge — decisive final verdict ─────────────────────────────────────
    send({ stage: "judge", status: "thinking", roster: ROSTER.judge.map(shortName) });

    const judge = await callWithFallback(
      [
        {
          role: "system",
          content:
            "You are the Judge in a multi-role LLM Council. " +
            "Output EXACTLY this structure and nothing else:\n" +
            "VERDICT: [one decisive sentence]\n" +
            "CONFIDENCE: [High or Medium or Low — one-line reason]\n" +
            "KEY REASONING:\n- [point 1]\n- [point 2]\n- [point 3]\n" +
            "CALL TO ACTION: [the single most important first step]\n" +
            "Start immediately with VERDICT:. No preamble.",
        },
        {
          role: "user",
          content:
            "Original question:\n" + q + "\n\n" +
            "Council synthesis:\n" + synth.text.slice(0, 1400) + "\n\n" +
            "Deliver your verdict now.",
        },
      ],
      apiKey, ROSTER.judge, 500, TIMEOUT_NORMAL
    );
    send({ stage: "judge", status: "done", text: judge.text, model: shortName(judge.model) });

    send({ stage: "complete" });
  } catch (err) {
    send({ stage: "error", error: err.message });
  }

  res.end();
};
