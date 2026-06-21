"use strict";
const https = require("https");

// ─────────────────────────────────────────────────────────────────────────────
// SD Forest — LLM Council (free-tier, $0)
//
// RESILIENCE MODEL (rewritten 2026-06-21):
//   The old pipeline called free models one at a time with a flat 40s/75s
//   per-model timeout. Free-tier models on OpenRouter routinely *queue* for
//   longer than that, so a single slow/queued stage would burn 40–150s of
//   silence, the browser's streaming fetch would drop ("Network error"), and
//   the run died after stage 1.
//
//   Fixes:
//   1. STREAMING calls (stream:true) with a short FIRST-TOKEN timeout. A queued
//      / rate-limited free model does not emit a first token quickly, so we
//      abort and fall through to the next model in ~22s instead of 40–75s.
//   2. Larger free-only fallback rosters per stage (every slug verified present
//      on OpenRouter's /models as a :free variant).
//   3. Token deltas are forwarded to the client live (shows the thinking
//      process AND keeps bytes flowing = natural keep-alive).
//   4. Heartbeats during any gap so proxies/browsers never see an idle stream.
//   5. Per-stage graceful degradation: a fully-failed stage emits status
//      "failed" and the pipeline continues where it can instead of aborting.
//
//   Cost stays $0: PAID_FALLBACK kill-gate blocks any non-:free slug.
// ─────────────────────────────────────────────────────────────────────────────

// Every slug here is a verified-available :free model on OpenRouter (June 2026).
// Order = preference; first model to emit a first token within the timeout wins.
const ROSTER = {
  proposer_r1:  ["openai/gpt-oss-120b:free", "openai/gpt-oss-20b:free", "google/gemma-4-31b-it:free", "meta-llama/llama-3.3-70b-instruct:free"],
  critic:       ["nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-super-120b-a12b:free", "qwen/qwen3-next-80b-a3b-instruct:free", "nousresearch/hermes-3-llama-3.1-405b:free"],
  proposer_rev: ["google/gemma-4-31b-it:free", "nvidia/nemotron-3-nano-30b-a3b:free", "meta-llama/llama-3.3-70b-instruct:free", "openai/gpt-oss-20b:free"],
  critic2:      ["nex-agi/nex-n2-pro:free", "qwen/qwen3-next-80b-a3b-instruct:free", "nvidia/nemotron-3-super-120b-a12b:free", "cohere/north-mini-code:free"],
  synthesizer:  ["google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3-super-120b-a12b:free", "openai/gpt-oss-120b:free", "meta-llama/llama-3.3-70b-instruct:free"],
  judge:        ["openai/gpt-oss-20b:free", "google/gemma-4-31b-it:free", "nvidia/nemotron-3-nano-30b-a3b:free"],
};

// ── PAID-FALLBACK KILL GATE (Ivan's free-only lockdown) ─────────────────────
const PAID_FALLBACK_ENABLED = /^(1|true|yes|on|enabled)$/i.test(
  (process.env.PAID_FALLBACK_ENABLED || "").trim()
);
function isFreeSlug(model) {
  return String(model || "").trim().toLowerCase().endsWith(":free");
}

const DEFAULT_ROUNDS = 2;
// First-token timeout: how long we wait for the model to START streaming before
// giving up and trying the next one. Short enough to dodge queued free models.
const FIRST_TOKEN_TIMEOUT = 22000;
// Hard cap once tokens are flowing — stops a runaway (verbose reasoning) model.
const STREAM_HARD_CAP = 72000;
// Global wall-clock budget. The function's Vercel maxDuration is 300s; we stop
// scheduling new optional stages well before that and always reserve enough time
// to still run the synthesizer + judge, so the user ALWAYS gets a final verdict
// instead of the function being killed mid-stream (the old "Network error").
const TOTAL_BUDGET_MS = 265000;
const SYNTH_JUDGE_RESERVE_MS = 105000;

// ── Council modes ───────────────────────────────────────────────────────────
// IMPORTANT: modes are NOT personas. They are INSTRUCTIONS for HOW each member
// should TREAT the response handed to it by the previous member. Same panel of
// models every time; only the treatment changes.
const MODES = {
  default: {
    label: "Balanced",
    temperature: 0.65,
    propose: "Give a thorough, well-reasoned answer. Be direct, substantive, and confident. Prioritize depth over hedging.",
    critique: "Identify the key weaknesses, blind spots, or missing nuance in the proposal. Be specific and constructive. Note at least two concrete concerns.",
    revise: "A critic identified weaknesses in your previous answer. Revise to address those concerns while preserving your core insights.",
    synth: "Incorporate the strongest points from all rounds and address all critiques. Produce the definitive, balanced final answer.",
  },
  adversarial: {
    label: "Adversarial",
    temperature: 0.7,
    propose: "Give a strong, committed answer — you will have to defend it under fire.",
    critique: "PUSH BACK HARD on the previous response. Attack its weakest assumptions, expose every flaw, steelman the opposing view, and do not concede easily. Be relentless but precise — at least three sharp objections.",
    revise: "Your answer was attacked aggressively. Defend what is defensible, concede only what is truly indefensible, and counter-argue. Come back stronger.",
    synth: "The members fought hard. Weigh the strongest attacks against the strongest defenses and deliver the answer that actually survives scrutiny — note where genuine disagreement remains.",
  },
  chaos: {
    label: "Chaos",
    temperature: 1.0,
    propose: "Answer from an unexpected angle. Make a surprising connection. Avoid the obvious framing entirely.",
    critique: "React to the previous response with lateral, divergent thinking. Introduce wild-card considerations, unlikely scenarios, and angles nobody asked for. Break the frame.",
    revise: "Embrace the chaos the critic introduced. Mutate your answer in a bold, non-linear direction — keep what's alive, discard what's safe.",
    synth: "Weave the divergent threads into something genuinely novel. Favor the surprising-but-true over the safe-and-obvious.",
  },
  dreamer: {
    label: "Dreamer",
    temperature: 0.9,
    propose: "Answer expansively and imaginatively. Explore the best-case, the visionary, the 10x version. Think big and paint the possibility.",
    critique: "Build on the previous response's vision — amplify it, extend it further, and add even more imaginative possibility. Where it played small, dream bigger.",
    revise: "Take the expanded vision and make it richer and more vivid while keeping a thread to reality. Reach further.",
    synth: "Synthesize the most inspiring, expansive version of the answer — bold and visionary, yet coherent enough to act on.",
  },
  "problem-solver": {
    label: "Problem-Solver",
    temperature: 0.6,
    propose: "Treat the input as a PROBLEM to be solved, not a question to be answered. Lay out 2–4 distinct ways to APPROACH it, with the trade-offs of each. Do not just give one answer.",
    critique: "Pressure-test the proposed approaches. Which would fail in practice, which are over-engineered, what approach is missing entirely? Be concrete about failure modes.",
    revise: "Refine the set of approaches using the critique. Drop weak ones, add missing ones, sharpen the trade-offs and the conditions under which each approach wins.",
    synth: "Deliver a clear menu of approaches to the problem: for each, when to use it, the key trade-off, and the first concrete step. End with a recommended default.",
  },
};
function getMode(name) {
  return MODES[String(name || "").trim().toLowerCase()] || MODES.default;
}

function shortName(slug) {
  return slug.split("/").pop().replace(/:free$/, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming OpenRouter call.
//   onToken(deltaText) is invoked for every content delta as it arrives.
//   Resolves with the full accumulated text, or rejects (HTTP error / timeout /
//   no-first-token) so the caller can fall through to the next model.
// ─────────────────────────────────────────────────────────────────────────────
function streamSingleModel(messages, apiKey, model, maxTokens, temperature, onToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens || 600,
      temperature: typeof temperature === "number" ? temperature : 0.65,
      stream: true,
    });

    let settled = false;
    let firstTokenSeen = false;
    let full = "";
    let req;

    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(firstTokenTimer);
      clearTimeout(hardCapTimer);
      try { if (req) req.destroy(); } catch (_) {}
      fn(arg);
    };

    const firstTokenTimer = setTimeout(() => {
      finish(reject, new Error("No first token in " + FIRST_TOKEN_TIMEOUT + "ms: " + model));
    }, FIRST_TOKEN_TIMEOUT);

    const hardCapTimer = setTimeout(() => {
      // We have partial text — keep whatever streamed so far.
      if (full.trim()) finish(resolve, full);
      else finish(reject, new Error("Hard cap " + STREAM_HARD_CAP + "ms: " + model));
    }, STREAM_HARD_CAP);

    req = https.request(
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
          Accept: "text/event-stream",
        },
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let errData = "";
          res.on("data", (c) => { errData += c; });
          res.on("end", () => finish(reject, new Error("HTTP " + res.statusCode + " " + model + ": " + errData.slice(0, 200))));
          return;
        }

        res.setEncoding("utf8");
        let buf = "";
        res.on("data", (chunk) => {
          buf += chunk;
          let nl;
          while ((nl = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line || line.startsWith(":")) continue;          // SSE comment / keep-alive
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") { finish(resolve, full); return; }
            try {
              const obj = JSON.parse(payload);
              const delta = obj && obj.choices && obj.choices[0] &&
                obj.choices[0].delta && obj.choices[0].delta.content;
              if (delta) {
                if (!firstTokenSeen) { firstTokenSeen = true; clearTimeout(firstTokenTimer); }
                full += delta;
                try { onToken && onToken(delta); } catch (_) {}
              }
            } catch (_) { /* ignore partial/non-JSON keepalive lines */ }
          }
        });
        res.on("end", () => {
          if (full.trim()) finish(resolve, full);
          else finish(reject, new Error("Empty stream: " + model));
        });
        res.on("error", (e) => finish(reject, e));
      }
    );
    req.on("error", (e) => finish(reject, e));
    req.write(body);
    req.end();
  });
}

// Try each model in the roster; the first to stream wins. onAttempt(model) lets
// the caller reset/relabel the live view each time a new model is tried.
async function streamWithFallback(messages, apiKey, modelList, maxTokens, temperature, onAttempt, onToken) {
  let lastErr;
  for (const model of modelList) {
    if (!PAID_FALLBACK_ENABLED && !isFreeSlug(model)) {
      lastErr = new Error("PAID_FALLBACK_BLOCKED: '" + model + "' is not :free — skipped (no spend).");
      continue;
    }
    try {
      onAttempt && onAttempt(model);
      const text = await streamSingleModel(messages, apiKey, model, maxTokens, temperature, onToken);
      if (text && text.trim()) return { text, model };
      lastErr = new Error("Empty result from " + model);
    } catch (err) {
      lastErr = err;
      // 429 / timeout / no-first-token / 5xx → next model.
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

  let question, rounds, modeName, priorContext;
  try {
    const parsed = JSON.parse(body);
    question = parsed.question;
    rounds = parsed.rounds;
    modeName = parsed.mode;
    priorContext = parsed.priorContext;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "question is required." });
  }

  const q = question.trim().slice(0, 2000);
  const numRounds = Math.max(2, Math.min(3, parseInt(rounds, 10) || DEFAULT_ROUNDS));
  const mode = getMode(modeName);
  const ctx = typeof priorContext === "string" ? priorContext.trim().slice(0, 4000) : "";

  // Shared user-facing framing of the task — carries any prior-round context so
  // follow-up rounds (B4: interactive) build on the previous deliberation.
  const taskFraming =
    (ctx ? "Earlier in this deliberation the council concluded:\n" + ctx + "\n\nThe user now follows up with:\n" : "") +
    q;

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.status(200);

  const send = (data) => { try { res.write("data: " + JSON.stringify(data) + "\n\n"); } catch (_) {} };
  // Heartbeat: SSE comment line, ignored by the client parser, keeps the
  // connection from going idle during the gaps between/within stages.
  const heartbeat = setInterval(() => { try { res.write(": ping\n\n"); } catch (_) {} }, 8000);

  // Global wall-clock guard — see TOTAL_BUDGET_MS above.
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const timeLeft = () => deadline - Date.now();

  send({ stage: "meta", mode: mode.label, rounds: numRounds });

  // Run one council stage with live streaming + graceful failure.
  //   keys: { stage, round?, extra? } — passed straight back to the client.
  async function runStage(keys, roster, messages, maxTokens) {
    send(Object.assign({}, keys, { status: "thinking", roster: roster.map(shortName) }));
    try {
      const result = await streamWithFallback(
        messages, apiKey, roster, maxTokens, mode.temperature,
        (model) => send(Object.assign({}, keys, { status: "model", model: shortName(model) })),
        (delta) => send(Object.assign({}, keys, { status: "delta", delta }))
      );
      send(Object.assign({}, keys, { status: "done", text: result.text, model: shortName(result.model) }));
      return result;
    } catch (err) {
      send(Object.assign({}, keys, { status: "failed", error: err.message }));
      return null;
    }
  }

  try {
    const proposerTexts  = [];
    const proposerModels = [];
    const criticTexts    = [];
    const criticModels   = [];

    // ── Round 1: initial proposal ──────────────────────────────────────────
    const p1 = await runStage(
      { stage: "proposer", round: 1 },
      ROSTER.proposer_r1,
      [
        { role: "system", content: "You are the Proposer in a multi-role LLM Council. " + mode.propose },
        { role: "user", content: taskFraming },
      ],
      650
    );
    if (!p1) throw new Error("The initial proposal stage could not get any free model to respond. Free-tier models may be rate-limited right now — please retry in a minute.");
    proposerTexts.push(p1.text);
    proposerModels.push(p1.model);

    // ── Rounds 2..N: critique then revise ──────────────────────────────────
    for (let r = 2; r <= numRounds; r++) {
      // Budget guard: if we can't fit another critique+revision AND still leave
      // room for synthesis+judge, skip the rest of the debate and synthesize now.
      if (timeLeft() < SYNTH_JUDGE_RESERVE_MS) {
        send({ stage: "notice", text: "Free-tier was slow — skipping remaining debate rounds to deliver the synthesis & verdict in time." });
        break;
      }
      const prevProposal = proposerTexts[r - 2];
      const criticRound = r - 1;

      const c = await runStage(
        { stage: "critic", round: criticRound },
        ROSTER.critic,
        [
          { role: "system", content: "You are the Critic in a multi-role LLM Council, reacting to the previous member's response. " + mode.critique + " Be concise." },
          { role: "user", content: "Original input:\n" + taskFraming + "\n\nPrevious member's response (Round " + (r - 1) + "):\n" + prevProposal + "\n\nNow apply your treatment to the response above." },
        ],
        550
      );
      const criticText = c ? c.text : "(critic stage unavailable — proceeding)";
      if (c) { criticTexts.push(c.text); criticModels.push(c.model); }

      const revRoster = r === 2 ? ROSTER.proposer_rev : ROSTER.proposer_r1;
      const p = await runStage(
        { stage: "proposer", round: r },
        revRoster,
        [
          { role: "system", content: "You are the Proposer in a multi-role LLM Council. " + mode.revise + " Be direct." },
          { role: "user", content: "Original input:\n" + taskFraming + "\n\nYour previous answer (Round " + (r - 1) + "):\n" + prevProposal + "\n\nThe previous member's reaction:\n" + criticText + "\n\nWrite your Round " + r + " response." },
        ],
        650
      );
      if (p) { proposerTexts.push(p.text); proposerModels.push(p.model); }
      else { proposerTexts.push(prevProposal); proposerModels.push(proposerModels[proposerModels.length - 1]); }
    }

    // ── Second critic (different family) on the final proposal ─────────────
    const finalProposal = proposerTexts[proposerTexts.length - 1];
    const firstCriticText = criticTexts[0] || "";
    const c2 = (timeLeft() < SYNTH_JUDGE_RESERVE_MS) ? null : await runStage(
      { stage: "critic", round: numRounds },
      ROSTER.critic2,
      [
        { role: "system", content: "You are the Second Critic in a multi-role LLM Council — a DIFFERENT AI system from the first critic, reacting to the latest response. " + mode.critique + " Find what the first critic missed." },
        { role: "user", content: "Original input:\n" + taskFraming + "\n\nLatest response to react to:\n" + finalProposal + "\n\nThe first critic already raised:\n" + firstCriticText.slice(0, 600) + "\n\nApply your treatment — surface what remains." },
      ],
      550
    );
    if (c2) { criticTexts.push(c2.text); criticModels.push(c2.model); }

    // ── Synthesizer ────────────────────────────────────────────────────────
    const allRoundsCtx =
      proposerTexts.map((t, i) => "Proposer Round " + (i + 1) + " (" + (proposerModels[i] || "?") + "):\n" + t).join("\n\n") +
      "\n\n" +
      criticTexts.map((t, i) => "Critic " + (i + 1) + " (" + (criticModels[i] || "?") + "):\n" + t).join("\n\n");

    const synth = await runStage(
      { stage: "synthesizer" },
      ROSTER.synthesizer,
      [
        { role: "system", content: "You are the Synthesizer in a multi-role LLM Council. You received responses and reactions from MULTIPLE distinct AI model families. " + mode.synth + " Be comprehensive yet concise." },
        { role: "user", content: "Original input:\n" + taskFraming + "\n\n" + allRoundsCtx + "\n\nSynthesize the best final result." },
      ],
      750
    );
    const synthText = synth ? synth.text : finalProposal;

    // ── Judge — decisive verdict ───────────────────────────────────────────
    await runStage(
      { stage: "judge" },
      ROSTER.judge,
      [
        {
          role: "system",
          content:
            "You are the Judge in a multi-role LLM Council. Output EXACTLY this structure and nothing else:\n" +
            "VERDICT: [one decisive sentence]\n" +
            "CONFIDENCE: [High or Medium or Low — one-line reason]\n" +
            "KEY REASONING:\n- [point 1]\n- [point 2]\n- [point 3]\n" +
            "CALL TO ACTION: [the single most important first step]\n" +
            "Start immediately with VERDICT:. No preamble.",
        },
        { role: "user", content: "Original input:\n" + taskFraming + "\n\nCouncil synthesis:\n" + synthText.slice(0, 1400) + "\n\nDeliver your verdict now." },
      ],
      500
    );

    // Send the synthesis text so the client can seed the next interactive round.
    send({ stage: "complete", synthesis: synthText.slice(0, 4000) });
  } catch (err) {
    send({ stage: "error", error: err.message });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
};
