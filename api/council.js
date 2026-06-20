"use strict";
const https = require("https");

const FREE_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

function callOpenRouter(messages, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: FREE_MODEL,
      messages,
      max_tokens: 1500,
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
  // CORS for sdforest.site previews and local dev
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

  let question;
  try {
    ({ question } = JSON.parse(body));
  } catch {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "question is required." });
  }

  const q = question.trim().slice(0, 2000);

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.status(200);

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Stage 1 — Proposer
    send({ stage: "proposer", status: "thinking" });

    const proposerText = await callOpenRouter(
      [
        {
          role: "system",
          content:
            "You are the Proposer in a multi-role LLM Council. " +
            "Given a question, provide a thorough, well-reasoned initial answer. " +
            "Be direct, substantive, and confident. Aim for depth over hedging.",
        },
        { role: "user", content: q },
      ],
      apiKey
    );
    send({ stage: "proposer", status: "done", text: proposerText });

    // Stage 2 — Critic
    send({ stage: "critic", status: "thinking" });

    const criticText = await callOpenRouter(
      [
        {
          role: "system",
          content:
            "You are the Critic in a multi-role LLM Council. " +
            "Given a proposed answer, identify its key weaknesses, blind spots, or missing nuance. " +
            "Be specific and constructive — your goal is to strengthen the answer, not dismiss it. " +
            "Note at least two concrete concerns.",
        },
        {
          role: "user",
          content: `Original question:\n${q}\n\nProposed answer:\n${proposerText}\n\nCritique the proposal above.`,
        },
      ],
      apiKey
    );
    send({ stage: "critic", status: "done", text: criticText });

    // Stage 3 — Synthesizer
    send({ stage: "synthesizer", status: "thinking" });

    const synthText = await callOpenRouter(
      [
        {
          role: "system",
          content:
            "You are the Synthesizer in a multi-role LLM Council. " +
            "Given the original question, the initial proposal, and the critique, " +
            "produce the definitive final answer. Incorporate the strengths of the proposal " +
            "and address the critique's concerns. Be comprehensive and clear.",
        },
        {
          role: "user",
          content:
            `Original question:\n${q}\n\n` +
            `Proposal:\n${proposerText}\n\n` +
            `Critique:\n${criticText}\n\n` +
            "Synthesize the final, best answer.",
        },
      ],
      apiKey
    );
    send({ stage: "synthesizer", status: "done", text: synthText });

    send({ stage: "complete" });
  } catch (err) {
    send({ stage: "error", error: err.message });
  }

  res.end();
};
