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
//
// SPEED-FIRST ordering (2026-06-21): the pipeline must finish well under Vercel's
// 300s function limit, or the function is killed mid-stream and the browser shows
// "Network error". So FAST, well-behaved (max_tokens-respecting) models lead every
// stage; slow reasoning giants (gpt-oss-120b, nemotron-ultra-550b) are demoted to
// LAST-RESORT fallbacks only. gpt-oss-120b previously hit the 72s hard cap emitting
// 9000+ chars (it ignores max_tokens) and single-handedly blew the time budget.
const ROSTER = {
  proposer_r1:  ["google/gemma-4-31b-it:free", "meta-llama/llama-3.3-70b-instruct:free", "openai/gpt-oss-20b:free", "nvidia/nemotron-3-super-120b-a12b:free"],
  critic:       ["nvidia/nemotron-3-super-120b-a12b:free", "qwen/qwen3-next-80b-a3b-instruct:free", "meta-llama/llama-3.3-70b-instruct:free", "google/gemma-4-31b-it:free"],
  proposer_rev: ["google/gemma-4-31b-it:free", "nvidia/nemotron-3-nano-30b-a3b:free", "meta-llama/llama-3.3-70b-instruct:free", "openai/gpt-oss-20b:free"],
  critic2:      ["nex-agi/nex-n2-pro:free", "qwen/qwen3-next-80b-a3b-instruct:free", "nvidia/nemotron-3-super-120b-a12b:free", "meta-llama/llama-3.3-70b-instruct:free"],
  synthesizer:  ["google/gemma-4-26b-a4b-it:free", "meta-llama/llama-3.3-70b-instruct:free", "nvidia/nemotron-3-super-120b-a12b:free", "google/gemma-4-31b-it:free"],
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
const FIRST_TOKEN_TIMEOUT = 15000;
// Hard cap once tokens are flowing — stops a runaway (verbose reasoning) model.
// Tight so no single stage can dominate the wall-clock budget.
const STREAM_HARD_CAP = 38000;
// Global wall-clock budget. Vercel maxDuration is 300s; we keep the WHOLE run well
// under that (the real "Network error" was the function being killed mid-stream on
// a slow free-tier run). Once the budget is nearly spent we skip remaining optional
// debate stages and always reserve enough time to still deliver synthesizer + judge.
const TOTAL_BUDGET_MS = 210000;
const SYNTH_JUDGE_RESERVE_MS = 80000;
// Per-stage output caps (tokens). Kept modest so generations finish fast; the
// council's value is the multi-model debate, not 9000-char monologues.
const MAXTOK = { propose: 420, critique: 320, revise: 420, critique2: 320, synth: 560, judge: 340 };

// ── AGENTIC UPGRADE (2026-06-22): web search + RAG grounding + fleet delegation ──
// All additive and non-fatal: each step injects context into the deliberation and
// can fail without breaking the propose→critique→synth→judge flow. Free-only stays
// in force (web search uses Tavily/DDG, not a paid LLM; delegation hits Chloé's
// own free gateway). The 2142 access gate is untouched.
//
// WEB SEARCH / RAG (§3.1): every member deliberates over fresh, URL-cited web facts.
//   Reuses the same provider stack as the fleet's tools/web_search.py (Tavily primary,
//   key from Vercel env TAVILY_API_KEY; DuckDuckGo HTML fallback, no key).
const WEBSEARCH_ENABLED = !/^(0|false|no|off)$/i.test((process.env.COUNCIL_WEBSEARCH_ENABLED || "1").trim());
const WEBSEARCH_K       = Math.max(1, Math.min(8, parseInt(process.env.COUNCIL_WEBSEARCH_K || "5", 10) || 5));
const WEBSEARCH_TIMEOUT_MS = 9000;
const TAVILY_API_KEY    = process.env.TAVILY_API_KEY || "";
//
// DELEGATION to Chloé (§3.2–§3.4): between rounds the council can delegate ONE
//   sub-question to Chloé's gateway, then fold her grounded answer into synthesis.
//   IMPORTANT: Vercel's serverless functions are NOT on the Tailscale network, so the
//   KVM2 gateway (100.77.50.41, CGNAT) is unreachable from here. Public delegation is
//   therefore OFF unless COUNCIL_DELEGATE_ENDPOINT is a *public* https URL (e.g. a
//   Tailscale Funnel / Cloudflare tunnel in front of Chloé's gateway). When unset, the
//   step is skipped silently (no latency); when set but unreachable/slow, it degrades
//   gracefully with a visible notice and the council proceeds from members only.
const DELEGATE_ENDPOINT   = (process.env.COUNCIL_DELEGATE_ENDPOINT || "").trim();   // public https URL or ""
const DELEGATE_KEY        = (process.env.COUNCIL_DELEGATE_KEY || "").trim();        // Bearer for the gateway
const DELEGATE_MODEL      = (process.env.COUNCIL_DELEGATE_MODEL || "chloe").trim();
const DELEGATE_TIMEOUT_MS = Math.max(10000, Math.min(90000, parseInt(process.env.COUNCIL_DELEGATE_TIMEOUT_MS || "70000", 10) || 70000));
const DELEGATION_ENABLED  = !/^(0|false|no|off)$/i.test((process.env.COUNCIL_DELEGATION_ENABLED || "1").trim()) && !!DELEGATE_ENDPOINT;

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

// ─────────────────────────────────────────────────────────────────────────────
// Web search (Node-native, built-in https only — no npm deps on Vercel).
// Tavily primary (vaulted key via env), DuckDuckGo HTML fallback. Never throws.
// ─────────────────────────────────────────────────────────────────────────────
function httpsRequest(opts, bodyStr, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, arg) => { if (settled) return; settled = true; clearTimeout(timer); try { req.destroy(); } catch (_) {} fn(arg); };
    const timer = setTimeout(() => done(reject, new Error("timeout")), timeoutMs || 9000);
    const req = https.request(opts, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { data += c; });
      res.on("end", () => done(resolve, { statusCode: res.statusCode, body: data }));
      res.on("error", (e) => done(reject, e));
    });
    req.on("error", (e) => done(reject, e));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function tavilySearch(query, limit) {
  if (!TAVILY_API_KEY) throw new Error("no tavily key");
  const body = JSON.stringify({
    api_key: TAVILY_API_KEY, query, search_depth: "basic",
    max_results: Math.min(limit, 10), include_answer: false,
  });
  const r = await httpsRequest({
    hostname: "api.tavily.com", path: "/search", method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
  }, body, WEBSEARCH_TIMEOUT_MS);
  if (r.statusCode < 200 || r.statusCode >= 300) throw new Error("tavily HTTP " + r.statusCode);
  const data = JSON.parse(r.body);
  return (data.results || []).slice(0, limit).map((x) => ({
    title: x.title || "", url: x.url || "", snippet: (x.content || "").slice(0, 400), provider: "tavily",
  }));
}

async function ddgSearch(query, limit) {
  const r = await httpsRequest({
    hostname: "html.duckduckgo.com", path: "/html/?q=" + encodeURIComponent(query), method: "GET",
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" },
  }, null, WEBSEARCH_TIMEOUT_MS);
  if (r.statusCode < 200 || r.statusCode >= 300) throw new Error("ddg HTTP " + r.statusCode);
  const out = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim();
  while ((m = re.exec(r.body)) && out.length < limit) {
    let href = m[1];
    const um = /uddg=([^&"]+)/.exec(href);
    if (um) href = decodeURIComponent(um[1]);
    if (href.startsWith("//")) href = "https:" + href;
    out.push({ title: strip(m[2]), url: href, snippet: strip(m[3]).slice(0, 400), provider: "ddg" });
  }
  return out;
}

async function webSearch(query, limit) {
  try { const r = await tavilySearch(query, limit); if (r && r.length) return r; } catch (_) {}
  try { const r = await ddgSearch(query, limit); if (r && r.length) return r; } catch (_) {}
  return [];
}

function formatWebBlock(results) {
  const lines = results.map((r, i) =>
    (i + 1) + ". " + (r.title || "(untitled)") + "\n   " + (r.url || "") + "\n   " + (r.snippet || "").replace(/\s+/g, " ").slice(0, 360));
  return "## LIVE WEB CONTEXT (retrieved just now — cite URLs where used)\n" + lines.join("\n") +
    "\n[sources: " + results.length + " results via " + (results[0] && results[0].provider || "?") + "]";
}

// ─────────────────────────────────────────────────────────────────────────────
// Delegation to Chloé (single endpoint). Non-streaming POST /v1/chat/completions,
// hard deadline, NEVER throws — always returns a structured result. Degrades to a
// note when the (public) endpoint is unset, unreachable, or slow.
// ─────────────────────────────────────────────────────────────────────────────
function delegationSystemPrompt(hint) {
  const route = hint === "research"
    ? "Route this to Iris (research/web) and ground the answer in sources."
    : hint === "code"
      ? "Route this to Anderson in ADVISE-ONLY mode (solutions/answers only, never write code)."
      : "Decide the best route (Iris for research, Anderson for code, or answer yourself).";
  return "You are receiving a COUNCIL DELEGATION — one focused sub-question an expert council needs grounded before it finalizes. " +
    route + " Return a single concise, grounded answer with sources where available. NEVER return an error — if the fleet cannot help, answer from your own best knowledge.";
}

async function delegateToChloe(subQuestion, hint) {
  const result = { answer: "", route: hint || "self", degraded: false, reason: "", elapsed_ms: 0 };
  if (!DELEGATE_ENDPOINT) { result.degraded = true; result.reason = "no_public_endpoint"; return result; }
  const url = new URL(DELEGATE_ENDPOINT.replace(/\/$/, "") + "/v1/chat/completions");
  const body = JSON.stringify({
    model: DELEGATE_MODEL, stream: false, max_tokens: 1024,
    messages: [
      { role: "system", content: delegationSystemPrompt(hint) },
      { role: "user", content: subQuestion },
    ],
  });
  const headers = { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) };
  if (DELEGATE_KEY) headers.Authorization = "Bearer " + DELEGATE_KEY;
  const t0 = Date.now();
  try {
    const r = await httpsRequest({
      hostname: url.hostname, port: url.port || 443, path: url.pathname + url.search,
      method: "POST", headers,
    }, body, DELEGATE_TIMEOUT_MS);
    result.elapsed_ms = Date.now() - t0;
    if (r.statusCode < 200 || r.statusCode >= 300) { result.degraded = true; result.reason = "http_" + r.statusCode; return result; }
    const data = JSON.parse(r.body);
    const answer = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim();
    if (!answer) { result.degraded = true; result.reason = "empty_answer"; return result; }
    result.answer = answer;
    return result;
  } catch (e) {
    result.elapsed_ms = Date.now() - t0;
    result.degraded = true;
    result.reason = (e && e.message === "timeout") ? "timeout_" + Math.round(DELEGATE_TIMEOUT_MS / 1000) + "s" : "error:" + (e && e.message || "unknown").slice(0, 60);
    return result;
  }
}

// One cheap free-model JSON classification: is a sub-question worth delegating?
async function delegationDecision(taskFraming, proposal, apiKey) {
  const sys = "You are a council delegation router. Decide whether the council would benefit from delegating ONE focused sub-question to a fleet (Iris=research/web, Anderson=code). Reply with STRICT JSON only: " +
    '{"delegatable":bool,"would_benefit":bool,"target_hint":"research|code|self","sub_question":"..."}. ' +
    "would_benefit=true only when an external grounded answer would materially improve the synthesis.";
  const user = "Question:\n" + taskFraming.slice(0, 1500) + "\n\nRound-1 proposal:\n" + (proposal || "").slice(0, 1200) + "\n\nReturn the JSON verdict.";
  try {
    const { text } = await streamWithFallback(
      [{ role: "system", content: sys }, { role: "user", content: user }],
      apiKey, ROSTER.judge, 180, 0, null, null);
    const m = /\{[\s\S]*\}/.exec(text);
    const v = JSON.parse(m ? m[0] : text);
    return {
      delegatable: !!v.delegatable, would_benefit: !!v.would_benefit,
      target_hint: ["research", "code", "self"].includes(v.target_hint) ? v.target_hint : "self",
      sub_question: typeof v.sub_question === "string" ? v.sub_question.trim() : "",
    };
  } catch (_) {
    return { delegatable: false, would_benefit: false, target_hint: "self", sub_question: "" };
  }
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

  let question, rounds, modeName, priorContext, code;
  try {
    const parsed = JSON.parse(body);
    question = parsed.question;
    rounds = parsed.rounds;
    modeName = parsed.mode;
    priorContext = parsed.priorContext;
    code = parsed.code;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  // ── 4-digit access gate ────────────────────────────────────────────────────
  // Lightweight shared-secret to stop anonymous over-use of the free OpenRouter
  // quota (which itself causes "network error" via rate-limit starvation). The
  // code is validated SERVER-SIDE and never shipped in client source, so it can't
  // be scraped from the page. Configurable via env; falls back to a default.
  const ACCESS_CODE = String(process.env.COUNCIL_ACCESS_CODE || "2142").trim();
  if (String(code || "").trim() !== ACCESS_CODE) {
    return res.status(401).json({ error: "Invalid access code. Ask Ivan for the 4-digit council code." });
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
  let taskFraming =
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

  // ── RAG pre-step: live web search → grounding injected into every member ──────
  // (§3.1) Non-fatal: on any failure the council proceeds ungrounded.
  if (WEBSEARCH_ENABLED) {
    send({ stage: "notice", text: "Searching the live web for grounding…" });
    try {
      const results = await webSearch(q, WEBSEARCH_K);
      if (results.length) {
        taskFraming = formatWebBlock(results) + "\n\n" + taskFraming;
        send({ stage: "notice", text: "Web grounding: pulled " + results.length + " live source" + (results.length === 1 ? "" : "s") + " (" + (results[0].provider) + ") into the deliberation." });
      } else {
        send({ stage: "notice", text: "Web grounding: no results — proceeding from model knowledge." });
      }
    } catch (e) {
      send({ stage: "notice", text: "Web grounding unavailable — proceeding from model knowledge." });
    }
  }

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
      MAXTOK.propose
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
        MAXTOK.critique
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
        MAXTOK.revise
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
      MAXTOK.critique2
    );
    if (c2) { criticTexts.push(c2.text); criticModels.push(c2.model); }

    // ── Fleet delegation (§3.2–§3.4): one sub-question to Chloé, folded into synthesis.
    // Budget-guarded + non-fatal. OFF unless COUNCIL_DELEGATE_ENDPOINT is a public URL.
    let delegationBlock = "";
    if (DELEGATION_ENABLED && timeLeft() > SYNTH_JUDGE_RESERVE_MS + DELEGATE_TIMEOUT_MS) {
      send({ stage: "notice", text: "Considering a fleet delegation to Chloé…" });
      try {
        const d = await delegationDecision(taskFraming, proposerTexts[0], apiKey);
        if (d.delegatable && d.would_benefit && d.sub_question) {
          send({ stage: "notice", text: "Delegating to Chloé (" + d.target_hint + "): " + d.sub_question.slice(0, 120) });
          const ans = await delegateToChloe(d.sub_question, d.target_hint);
          if (!ans.degraded && ans.answer) {
            delegationBlock = "\n\nFleet delegation (Chloé → " + ans.route + ", " + ans.elapsed_ms + "ms):\n" + ans.answer + "\n";
            send({ stage: "notice", text: "Fleet answer folded into synthesis (route=" + ans.route + ")." });
          } else {
            send({ stage: "notice", text: "Fleet delegation unavailable (" + ans.reason + ") — synthesizing from council members only." });
          }
        } else {
          send({ stage: "notice", text: "No fleet delegation needed — the council has enough to synthesize." });
        }
      } catch (e) {
        send({ stage: "notice", text: "Delegation step skipped (non-fatal)." });
      }
    }

    // ── Synthesizer ────────────────────────────────────────────────────────
    const allRoundsCtx =
      proposerTexts.map((t, i) => "Proposer Round " + (i + 1) + " (" + (proposerModels[i] || "?") + "):\n" + t).join("\n\n") +
      "\n\n" +
      criticTexts.map((t, i) => "Critic " + (i + 1) + " (" + (criticModels[i] || "?") + "):\n" + t).join("\n\n") +
      delegationBlock;

    const synth = await runStage(
      { stage: "synthesizer" },
      ROSTER.synthesizer,
      [
        { role: "system", content: "You are the Synthesizer in a multi-role LLM Council. You received responses and reactions from MULTIPLE distinct AI model families. " + mode.synth + " Be comprehensive yet concise." },
        { role: "user", content: "Original input:\n" + taskFraming + "\n\n" + allRoundsCtx + "\n\nSynthesize the best final result." },
      ],
      MAXTOK.synth
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
      MAXTOK.judge
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
