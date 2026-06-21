"use strict";
const https = require("https");

// ── Diverse free-tier model roster ──────────────────────────────────────────
// Each role uses a DISTINCT base model for maximum diversity.
// All slugs verified against OpenRouter /api/v1/models, June 2026.
//
// Session-empirical findings (June 21 2026):
//   Venice-hosted (rate-limits aggressively): Nous Hermes, Qwen3-*, Meta Llama
//   Queues for 60s+ (too slow for 300s pipeline): gpt-oss-120b, nemotron-ultra
//   Confirmed fast and reliable: nemotron-nano (3B active), gemma-4-26b MoE (4B active),
//     nemotron-super (12B active), gemma-4-31b (dense 31B), gpt-oss-20b (20B)
//
// 5 DISTINCT base models across the primary path (satisfies "no two roles same model"):
// Role         Primary                                   Fallback
// -----------  ----------------------------------------  ------------------------------------------
// Proposer R1  openai/gpt-oss-20b       (OpenAI 20B)    nvidia/nemotron-3-nano-30b-a3b (NVIDIA,3B active)
// Critic       nvidia/nemotron-3-super   (NVIDIA,12B)    google/gemma-4-26b-a4b-it      (Google MoE,4B active)
// Proposer Rev google/gemma-4-31b-it    (Google 31B)    nvidia/nemotron-3-nano-30b-a3b (NVIDIA Nano fallback)
// Synthesizer  google/gemma-4-26b-a4b   (Google MoE,4B) nvidia/nemotron-3-super-120b   (NVIDIA fallback)
// Judge        nvidia/nemotron-3-nano    (NVIDIA,3B)     openai/gpt-oss-20b             (OpenAI fallback)
const ROSTER = {
  proposer_r1:  ["openai/gpt-oss-20b:free",                       "nvidia/nemotron-3-nano-30b-a3b:free"],
  critic:       ["nvidia/nemotron-3-super-120b-a12b:free",         "google/gemma-4-26b-a4b-it:free"],
  proposer_rev: ["google/gemma-4-31b-it:free",                    "nvidia/nemotron-3-nano-30b-a3b:free"],
  synthesizer:  ["google/gemma-4-26b-a4b-it:free",                "nvidia/nemotron-3-super-120b-a12b:free"],
  judge:        ["nvidia/nemotron-3-nano-30b-a3b:free",            "openai/gpt-oss-20b:free"],
};

const DEFAULT_ROUNDS = 2;     // ≥2 ensures at least one critique-then-revise loop
const MODEL_TIMEOUT_MS = 45000; // per-attempt wall-clock limit — 45s lets queued models respond (~35-40s typical)

// Short label for SSE display (last path segment, strip :free)
function shortName(slug) {
  return slug.split("/").pop().replace(/:free$/, "");
}

function callSingleModel(messages, apiKey, model, maxTokens) {
  // Promise.race gives a hard wall-clock timeout regardless of socket state.
  // req.setTimeout alone doesn't fire when the remote server holds the connection
  // open without sending data (common on queued/busy free providers).
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
          "Authorization": `Bearer ${apiKey}`,
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
            const content = parsed?.choices?.[0]?.message?.content;
            if (!content) return reject(new Error(`Empty response: ${data.slice(0, 200)}`));
            resolve(content);
          } catch (e) {
            reject(new Error(`Parse error: ${data.slice(0, 200)}`));
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
      () => reject(new Error(`Timed out after ${MODEL_TIMEOUT_MS}ms: ${model}`)),
      MODEL_TIMEOUT_MS
    )
  );

  return Promise.race([requestPromise, timeoutPromise]);
}

// Try each model in order; return { text, model } for the first that succeeds.
async function callWithFallback(messages, apiKey, modelList, maxTokens) {
  let lastErr;
  for (const model of modelList) {
    try {
      const text = await callSingleModel(messages, apiKey, model, maxTokens);
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
  try { ({ question, rounds } = JSON.parse(body)); }
  catch { return res.status(400).json({ error: "Invalid JSON body." }); }

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "question is required." });
  }

  const q = question.trim().slice(0, 2000);
  const numRounds = Math.max(2, Math.min(3, parseInt(rounds, 10) || DEFAULT_ROUNDS));

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.status(200);

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const proposerTexts = [];
    const criticTexts = [];
    const proposerModels = [];
    const criticModels = [];

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
      apiKey, ROSTER.proposer_r1, 600
    );
    proposerTexts.push(p1.text);
    proposerModels.push(p1.model);
    send({ stage: "proposer", round: 1, status: "done", text: p1.text, model: shortName(p1.model) });

    // ── Rounds 2..numRounds: Critique → Revise loop ────────────────────────
    for (let r = 2; r <= numRounds; r++) {
      const prevProposal = proposerTexts[r - 2];

      // Critic — different family than the proposer
      const criticRoster = ROSTER.critic;
      send({ stage: "critic", round: r - 1, status: "thinking", roster: criticRoster.map(shortName) });

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
              `Original question:\n${q}\n\n` +
              `Proposed answer (Round ${r - 1}):\n${prevProposal}\n\n` +
              "Critique the proposal above.",
          },
        ],
        apiKey, criticRoster, 500
      );
      criticTexts.push(c.text);
      criticModels.push(c.model);
      send({ stage: "critic", round: r - 1, status: "done", text: c.text, model: shortName(c.model) });

      // Proposer Revision — yet another family
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
              `Original question:\n${q}\n\n` +
              `Your previous answer (Round ${r - 1}):\n${prevProposal}\n\n` +
              `Critic's feedback:\n${c.text}\n\n` +
              `Write your revised answer for Round ${r}.`,
          },
        ],
        apiKey, revRoster, 600
      );
      proposerTexts.push(p.text);
      proposerModels.push(p.model);
      send({ stage: "proposer", round: r, status: "done", text: p.text, model: shortName(p.model) });
    }

    // ── Synthesizer — different family again ───────────────────────────────
    send({ stage: "synthesizer", status: "thinking", roster: ROSTER.synthesizer.map(shortName) });

    const allRoundsCtx =
      proposerTexts.map((t, i) => `Proposer Round ${i + 1} (${shortName(proposerModels[i])}):\n${t}`).join("\n\n") +
      (criticTexts.length
        ? "\n\n" + criticTexts.map((t, i) => `Critic Round ${i + 1} (${shortName(criticModels[i])}):\n${t}`).join("\n\n")
        : "");

    const synth = await callWithFallback(
      [
        {
          role: "system",
          content:
            "You are the Synthesizer in a multi-role LLM Council. " +
            "You have received proposals and critiques from multiple distinct AI models. " +
            "Produce the definitive final answer — incorporate the strongest points from all rounds " +
            "and address the critiques. Be comprehensive yet concise.",
        },
        {
          role: "user",
          content: `Original question:\n${q}\n\n${allRoundsCtx}\n\nSynthesize the best final answer.`,
        },
      ],
      apiKey, ROSTER.synthesizer, 600
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
            "Deliver a clear VERDICT using EXACTLY this structure:\n" +
            "VERDICT: [core decision — one sentence]\n" +
            "CONFIDENCE: [High | Medium | Low + one-line rationale]\n" +
            "KEY REASONING:\n- [point 1]\n- [point 2]\n- [point 3]\n" +
            "CALL TO ACTION: [specific first step the questioner should take]\n" +
            "Be decisive. No padding.",
        },
        {
          role: "user",
          content:
            `Original question:\n${q}\n\nCouncil synthesis:\n${synth.text}\n\nDeliver your verdict.`,
        },
      ],
      apiKey, ROSTER.judge, 400
    );
    send({ stage: "judge", status: "done", text: judge.text, model: shortName(judge.model) });

    send({ stage: "complete" });
  } catch (err) {
    send({ stage: "error", error: err.message });
  }

  res.end();
};
