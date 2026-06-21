"use strict";
const https = require("https");

// ── Diverse free-tier model roster ──────────────────────────────────────────
// Each role uses a DIFFERENT model family to maximize architectural diversity.
// A council of clones shares blind spots; heterogeneous families catch errors
// each other misses. Primary is tried first; fallback used on 429 or failure.
// Slugs verified on OpenRouter free catalog, June 2026.
//
// Role         Primary                                    Family       Fallback
// -----------  -----------------------------------------  -----------  ------------------------------------------
// Proposer R1  openai/gpt-oss-120b:free                  OpenAI       meta-llama/llama-3.3-70b-instruct:free
// Critic       nvidia/nemotron-3-super-120b-a12b:free    NVIDIA       deepseek/deepseek-r1:free
// Proposer Rev qwen/qwen3-coder:free                     Alibaba Qwen google/gemma-3-27b-it:free
// Synthesizer  nousresearch/hermes-3-llama-3.1-405b:free NousResearch meta-llama/llama-3.3-70b-instruct:free
// Judge        openai/gpt-oss-20b:free                   OpenAI-20B   z-ai/glm-4.5-air:free
const ROSTER = {
  proposer_r1:  ["openai/gpt-oss-120b:free",                "meta-llama/llama-3.3-70b-instruct:free"],
  critic:       ["nvidia/nemotron-3-super-120b-a12b:free",   "deepseek/deepseek-r1:free"],
  proposer_rev: ["qwen/qwen3-coder:free",                    "google/gemma-3-27b-it:free"],
  synthesizer:  ["nousresearch/hermes-3-llama-3.1-405b:free","meta-llama/llama-3.3-70b-instruct:free"],
  judge:        ["openai/gpt-oss-20b:free",                  "z-ai/glm-4.5-air:free"],
};

const DEFAULT_ROUNDS = 2; // ≥2 ensures at least one critique-then-revise loop

// Short label for SSE display (last path segment, strip :free)
function shortName(slug) {
  return slug.split("/").pop().replace(/:free$/, "");
}

function callSingleModel(messages, apiKey, model, maxTokens) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens || 800,
      temperature: 0.7,
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
            if (!content) return reject(new Error(`Empty: ${data.slice(0, 200)}`));
            resolve(content);
          } catch (e) {
            reject(new Error(`Parse: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
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
      // Continue to next model on any failure (rate-limit, 5xx, parse error)
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
      apiKey, ROSTER.proposer_r1, 800
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
        apiKey, criticRoster, 600
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
        apiKey, revRoster, 800
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
      apiKey, ROSTER.synthesizer, 1000
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
      apiKey, ROSTER.judge, 500
    );
    send({ stage: "judge", status: "done", text: judge.text, model: shortName(judge.model) });

    send({ stage: "complete" });
  } catch (err) {
    send({ stage: "error", error: err.message });
  }

  res.end();
};
