"use strict";
const https = require("https");

const FREE_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const DEFAULT_ROUNDS = 2; // Number of proposer passes (≥2 means at least one critique loop)

function callOpenRouter(messages, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: FREE_MODEL,
      messages,
      max_tokens: 1000,
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
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`OpenRouter ${res.statusCode}: ${data}`));
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed?.choices?.[0]?.message?.content;
            if (!content) {
              return reject(new Error(`Empty response: ${data}`));
            }
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
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res
      .status(503)
      .json({ error: "OPENROUTER_API_KEY is not configured on this deployment." });
  }

  let body = "";
  await new Promise((resolve) => {
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", resolve);
  });

  let question, rounds;
  try {
    ({ question, rounds } = JSON.parse(body));
  } catch {
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

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const proposerTexts = [];
    const criticTexts = [];

    // Round 1 — Initial Proposal
    send({ stage: "proposer", round: 1, status: "thinking" });
    proposerTexts[0] = await callOpenRouter(
      [
        {
          role: "system",
          content:
            "You are the Proposer in a multi-role LLM Council. " +
            "Given a question, provide a thorough, well-reasoned initial answer. " +
            "Be direct, substantive, and confident. Focus on depth, not length — be concise.",
        },
        { role: "user", content: q },
      ],
      apiKey
    );
    send({ stage: "proposer", round: 1, status: "done", text: proposerTexts[0] });

    // Rounds 2..numRounds — Critique then Revise loop
    // Critic round (r-1) critiques Proposer round (r-1), then Proposer round r revises
    for (let r = 2; r <= numRounds; r++) {
      const prevProposal = proposerTexts[r - 2];

      // Critic critiques the previous proposer output
      send({ stage: "critic", round: r - 1, status: "thinking" });
      criticTexts[r - 2] = await callOpenRouter(
        [
          {
            role: "system",
            content:
              "You are the Critic in a multi-role LLM Council. " +
              "Identify the key weaknesses, blind spots, or missing nuance in the proposal. " +
              "Be specific and constructive — strengthen the answer, don't dismiss it. " +
              "Note at least two concrete concerns. Be concise.",
          },
          {
            role: "user",
            content:
              `Original question:\n${q}\n\n` +
              `Proposed answer (Round ${r - 1}):\n${prevProposal}\n\n` +
              "Critique the proposal above.",
          },
        ],
        apiKey
      );
      send({ stage: "critic", round: r - 1, status: "done", text: criticTexts[r - 2] });

      // Proposer revises based on the critique
      send({ stage: "proposer", round: r, status: "thinking" });
      proposerTexts[r - 1] = await callOpenRouter(
        [
          {
            role: "system",
            content:
              "You are the Proposer in a multi-role LLM Council. " +
              "A critic identified weaknesses in your previous answer. " +
              "Revise your answer to address those concerns while preserving your core insights. " +
              "Be direct and concise.",
          },
          {
            role: "user",
            content:
              `Original question:\n${q}\n\n` +
              `Your previous answer (Round ${r - 1}):\n${prevProposal}\n\n` +
              `Critic's feedback:\n${criticTexts[r - 2]}\n\n` +
              `Write your revised answer for Round ${r}.`,
          },
        ],
        apiKey
      );
      send({ stage: "proposer", round: r, status: "done", text: proposerTexts[r - 1] });
    }

    // Synthesizer — combines all rounds into the definitive answer
    send({ stage: "synthesizer", status: "thinking" });
    const allRoundsContext =
      proposerTexts.map((t, i) => `Proposer Round ${i + 1}:\n${t}`).join("\n\n") +
      (criticTexts.length
        ? "\n\n" + criticTexts.map((t, i) => `Critic Round ${i + 1}:\n${t}`).join("\n\n")
        : "");

    const synthText = await callOpenRouter(
      [
        {
          role: "system",
          content:
            "You are the Synthesizer in a multi-role LLM Council. " +
            "Review all proposer drafts and critic feedback, then produce the definitive final answer. " +
            "Incorporate the strongest points and address the critiques. " +
            "Be comprehensive yet concise.",
        },
        {
          role: "user",
          content:
            `Original question:\n${q}\n\n` +
            allRoundsContext +
            "\n\nSynthesize the best final answer.",
        },
      ],
      apiKey
    );
    send({ stage: "synthesizer", status: "done", text: synthText });

    // Judge — final verdict with confidence and call-to-action
    send({ stage: "judge", status: "thinking" });
    const judgeText = await callOpenRouter(
      [
        {
          role: "system",
          content:
            "You are the Judge in a multi-role LLM Council. " +
            "After reviewing the full deliberation, deliver a clear VERDICT. " +
            "Use EXACTLY this structure:\n" +
            "VERDICT: [core decision or recommendation — one sentence]\n" +
            "CONFIDENCE: [High | Medium | Low — plus one-line rationale]\n" +
            "KEY REASONING:\n" +
            "- [point 1]\n" +
            "- [point 2]\n" +
            "- [point 3]\n" +
            "CALL TO ACTION: [specific first step the questioner should take]\n" +
            "Be decisive. No padding.",
        },
        {
          role: "user",
          content:
            `Original question:\n${q}\n\n` +
            `Council's final synthesis:\n${synthText}\n\n` +
            "Deliver your verdict.",
        },
      ],
      apiKey
    );
    send({ stage: "judge", status: "done", text: judgeText });

    send({ stage: "complete" });
  } catch (err) {
    send({ stage: "error", error: err.message });
  }

  res.end();
};
