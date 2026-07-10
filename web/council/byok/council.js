/* ─────────────────────────────────────────────────────────────────────────────
 * SD Forest — LLM Council client engine (BYOK, browser-side, $0)
 *
 * The council runs ENTIRELY in the visitor's browser: fetch() streams straight
 * from api.openrouter.ai using the visitor's own API key (sessionStorage only —
 * no server ever sees it). Zero server cost; works as a pure static site.
 *
 * Pipeline: Proposer → Critic → (loop × rounds) → Chairman synthesis.
 *   - Heterogeneous seats: each seat has its own ordered :free-model roster.
 *   - stream:true — tokens are surfaced per-seat via on.stage delta events.
 *   - Resilience: 429/503 → exponential-backoff retry on the same model, then
 *     fall through to the next model in the seat's roster. A queued free model
 *     that never emits a first token is abandoned after FIRST_TOKEN_TIMEOUT_MS.
 *   - Abort: pass an AbortSignal; the user can stop the council mid-round.
 *   - FREE-ONLY KILL-GATE: any model id not ending in `:free` throws before a
 *     single byte is sent. The :free suffix is intentional strategy — never
 *     drop it from any model identifier.
 *
 * UMD-ish export so the same file runs in the page (window.Council) and under
 * Node for the unit harness (scripts/test-council-client.cjs).
 * ──────────────────────────────────────────────────────────────────────────── */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.Council = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

  // Tunables live in one mutable object so the Node test harness can shrink
  // timeouts/backoffs without monkey-patching internals.
  var CONFIG = {
    FIRST_TOKEN_TIMEOUT_MS: 20000, // queued free models don't emit quickly → abandon
    STREAM_HARD_CAP_MS: 120000,    // runaway verbose model → salvage what streamed
    MAX_RETRIES_PER_MODEL: 1,      // 429/503 → one backoff retry, then next model
    BACKOFF_BASE_MS: 1500,
    RETRY_STATUS: { 429: true, 503: true }
  };

  // ── Free-only kill-gate ────────────────────────────────────────────────────
  function isFreeSlug(m) { return /:free$/.test(String(m || "").trim()); }
  function assertFree(m) {
    if (!isFreeSlug(m)) {
      var e = new Error('Blocked non-:free model "' + m + '" — the council is free-tier only by design.');
      e.code = "PAID_MODEL_BLOCKED";
      throw e;
    }
  }

  // Keep the :free suffix visible everywhere — only the provider path is trimmed.
  function shortName(slug) { return String(slug || "").split("/").pop(); }

  function abortError() { var e = new Error("Aborted"); e.name = "AbortError"; return e; }
  function isAbort(e) { return !!e && e.name === "AbortError"; }
  function sleep(ms, signal) {
    return new Promise(function (res, rej) {
      var t = setTimeout(res, ms);
      if (signal) signal.addEventListener("abort", function () { clearTimeout(t); rej(abortError()); }, { once: true });
    });
  }

  // ── Mode treatments (system-prompt seasoning per council mode) ────────────
  var MODES = {
    "default": {
      temperature: 0.5,
      propose:  "Give a direct, substantive answer. Lead with your position, then the reasoning.",
      critique: "Fairly weigh the proposal: what holds, what's weak, what's missing. Be specific.",
      synth:    "Weigh the whole deliberation fairly and produce the definitive, balanced final answer."
    },
    "adversarial": {
      temperature: 0.6,
      propose:  "Take a clear, defensible position and argue it hard.",
      critique: "Attack the proposal's assumptions, steelman the opposing view, concede as little as possible. Be specific and ruthless but honest.",
      synth:    "After a hard-fought debate, deliver the answer that survives the strongest objections."
    },
    "chaos": {
      temperature: 0.95,
      propose:  "Answer laterally: surprising connections, wild-card angles, non-obvious framings over the safe take.",
      critique: "React divergently — pull the idea somewhere unexpected, remix it, find the angle nobody considered.",
      synth:    "Distill the most valuable surprising insights into one coherent, usable answer."
    },
    "dreamer": {
      temperature: 0.85,
      propose:  "Answer expansively and imaginatively — paint the biggest honest version of the idea.",
      critique: "Amplify the vision: what would make this 10x bigger, more beautiful, more alive?",
      synth:    "Synthesize the most inspiring yet still-actionable version of the vision."
    },
    "problem-solver": {
      temperature: 0.4,
      propose:  "Frame the input as a PROBLEM. Return several distinct APPROACHES with trade-offs — not just one answer.",
      critique: "Stress-test each approach: failure modes, hidden costs, which trade-offs actually bite.",
      synth:    "Rank the approaches, recommend one, and state exactly when a different one wins."
    }
  };

  // ── Single streaming call: one model, one seat turn ───────────────────────
  // Resolves with the full text (deltas surfaced via onToken as they arrive).
  // Throws {status} on HTTP errors, {code:'FIRST_TOKEN_TIMEOUT'} when a queued
  // model never starts, AbortError on user abort. Salvages partial text if the
  // hard cap trips after content has streamed.
  async function streamOnce(o) {
    assertFree(o.model);
    if (o.signal && o.signal.aborted) throw abortError();

    var inner = new AbortController();
    var onOuterAbort = function () { inner.abort(); };
    if (o.signal) o.signal.addEventListener("abort", onOuterAbort, { once: true });

    var timedOut = false, capped = false, gotFirst = false, full = "";
    var firstTokenTimer = setTimeout(function () { timedOut = true; inner.abort(); }, CONFIG.FIRST_TOKEN_TIMEOUT_MS);
    var hardCapTimer = null;

    function classify(e) {
      if (o.signal && o.signal.aborted) return abortError();
      if (timedOut && !gotFirst) {
        var te = new Error("No first token within " + CONFIG.FIRST_TOKEN_TIMEOUT_MS + "ms (model likely queued)");
        te.code = "FIRST_TOKEN_TIMEOUT";
        return te;
      }
      return e;
    }

    try {
      var res;
      try {
        var _url = o.apiUrl || OPENROUTER_URL;
      var _hdrs = {
            "Content-Type": "application/json",
            "HTTP-Referer": (typeof location !== "undefined" && location.origin) || "https://sdforest.site",
            "X-Title": "SD Forest LLM Council"
          };
      if (o.apiKey) _hdrs["Authorization"] = "Bearer " + o.apiKey;
      if (o.byokKey) _hdrs["X-BYOK-Key"] = o.byokKey;
      res = await fetch(_url, {
          method: "POST",
          headers: _hdrs,
          body: JSON.stringify({
            model: o.model,
            messages: o.messages,
            stream: true,
            max_tokens: o.maxTokens,
            temperature: o.temperature
          }),
          signal: inner.signal
        });
      } catch (e) { throw classify(e); }

      if (!res.ok) {
        var bodyText = "";
        try { bodyText = await res.text(); } catch (e2) {}
        var err = new Error("OpenRouter HTTP " + res.status + (bodyText ? " — " + bodyText.slice(0, 180) : ""));
        err.status = res.status;
        throw err;
      }

      hardCapTimer = setTimeout(function () { capped = true; inner.abort(); }, CONFIG.STREAM_HARD_CAP_MS);

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = "";
      while (true) {
        var chunk;
        try { chunk = await reader.read(); }
        catch (e) {
          if (capped && full) return full;         // runaway model — keep what we have
          throw classify(e);
        }
        if (chunk.done) break;
        buf += decoder.decode(chunk.value, { stream: true });
        var lines = buf.split("\n");
        buf = lines.pop();
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line || line.charAt(0) === ":") continue;      // SSE keep-alive comments
          if (line.indexOf("data:") !== 0) continue;
          var payload = line.slice(5).trim();
          if (payload === "[DONE]") return full;
          var obj;
          try { obj = JSON.parse(payload); } catch (e3) { continue; }
          if (obj.error) {
            var se = new Error(obj.error.message || "OpenRouter stream error");
            if (obj.error.code) se.status = obj.error.code;
            throw se;
          }
          var delta = obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content;
          if (delta) {
            if (!gotFirst) { gotFirst = true; clearTimeout(firstTokenTimer); }
            full += delta;
            if (o.onToken) o.onToken(delta);
          }
        }
      }
      return full;
    } finally {
      clearTimeout(firstTokenTimer);
      if (hardCapTimer) clearTimeout(hardCapTimer);
      if (o.signal) o.signal.removeEventListener("abort", onOuterAbort);
    }
  }

  // ── One council seat with retry + roster fallback ─────────────────────────
  // Tries each model in the seat's roster in order. 429/503 → exponential
  // backoff retry on the same model (MAX_RETRIES_PER_MODEL), anything else →
  // straight to the next model. Returns {model, text} or null (seat failed —
  // the pipeline degrades gracefully around it).
  async function runSeat(o) {
    for (var i = 0; i < o.roster.length; i++) {
      var model = o.roster[i];
      for (var attempt = 0; attempt <= CONFIG.MAX_RETRIES_PER_MODEL; attempt++) {
        if (o.signal && o.signal.aborted) throw abortError();
        try {
          if (o.onModel) o.onModel(model, attempt);
          var text = await streamOnce({
            apiKey: o.apiKey, byokKey: o.byokKey, apiUrl: o.apiUrl,
            model: model, messages: o.messages,
            maxTokens: o.maxTokens, temperature: o.temperature,
            signal: o.signal, onToken: o.onToken
          });
          if (text && text.trim()) return { model: model, text: text.trim() };
          break; // empty response — try the next model
        } catch (e) {
          if (isAbort(e)) throw e;
          if (e.code === "PAID_MODEL_BLOCKED") throw e;   // config bug — never swallow
          var retryable = e.status && CONFIG.RETRY_STATUS[e.status];
          if (retryable && attempt < CONFIG.MAX_RETRIES_PER_MODEL) {
            var wait = CONFIG.BACKOFF_BASE_MS * Math.pow(2, attempt);
            if (o.onNotice) o.onNotice("Rate-limited on " + shortName(model) + " — retrying in " + Math.round(wait / 1000) + "s…");
            await sleep(wait, o.signal);
            continue;
          }
          if (o.onNotice && i < o.roster.length - 1) {
            o.onNotice(shortName(model) + " unavailable (" + (e.status || e.code || "error") + ") — falling back to " + shortName(o.roster[i + 1]) + "…");
          }
          break; // next model in the roster
        }
      }
    }
    return null;
  }

  // ── The council pipeline ───────────────────────────────────────────────────
  // opts: {
  //   apiKey, question, priorContext?, rounds (1–5), mode,
  //   seats: { proposer: [slugs], critic: [slugs], chairman: [slugs] },
  //   signal?, on?: { stage(evt), notice(text) }
  // }
  // stage events: {seat, round, status:'thinking'|'model'|'delta'|'done'|'failed', ...}
  // (round 0 = the chairman's synthesis turn)
  async function runCouncil(o) {
    if (!o || (!o.apiUrl && (!o.apiKey || !String(o.apiKey).trim()))) throw new Error("An OpenRouter API key is required — paste yours top-right (it never leaves your browser).");
    var mode = MODES[o.mode] || MODES["default"];
    var rounds = Math.max(1, Math.min(5, parseInt(o.rounds, 10) || 2));

    // Validate every seat roster upfront — fail fast before any network call.
    ["proposer", "critic", "chairman"].forEach(function (seat) {
      var r = o.seats && o.seats[seat];
      if (!r || !r.length) throw new Error("No models configured for the " + seat + " seat.");
      r.forEach(assertFree);
    });

    var emit = function (seat, round, data) { if (o.on && o.on.stage) o.on.stage(Object.assign({ seat: seat, round: round }, data)); };
    var notice = function (t) { if (o.on && o.on.notice) o.on.notice(t); };

    var framing =
      (o.priorContext ? "Earlier in this deliberation the council concluded:\n" + o.priorContext + "\n\nThe user now follows up with:\n" : "") +
      String(o.question).trim();

    async function seatCall(seat, round, messages, maxTokens) {
      emit(seat, round, { status: "thinking", roster: o.seats[seat].map(shortName) });
      var res = await runSeat({
        apiKey: o.apiKey, byokKey: o.byokKey, apiUrl: o.apiUrl,
        roster: o.seats[seat], messages: messages,
        maxTokens: maxTokens, temperature: mode.temperature, signal: o.signal,
        onModel: function (m, attempt) { emit(seat, round, { status: "model", model: shortName(m), attempt: attempt }); },
        onToken: function (d) { emit(seat, round, { status: "delta", delta: d }); },
        onNotice: notice
      });
      if (res) emit(seat, round, { status: "done", text: res.text, model: shortName(res.model) });
      else emit(seat, round, { status: "failed" });
      return res;
    }

    var proposals = [], critiques = [];

    for (var r = 1; r <= rounds; r++) {
      // ── Proposer: initial answer (r=1) or revision folding in the critique ──
      var pMsgs;
      if (r === 1) {
        pMsgs = [
          { role: "system", content: "You are the Proposer in a multi-model LLM Council. " + mode.propose },
          { role: "user", content: framing }
        ];
      } else {
        pMsgs = [
          { role: "system", content: "You are the Proposer in a multi-model LLM Council, revising your answer after the Critic's reaction. " + mode.propose + " Be direct." },
          { role: "user", content:
              "Original input:\n" + framing +
              "\n\nYour previous answer (Round " + (r - 1) + "):\n" + proposals[r - 2] +
              "\n\nThe Critic's reaction:\n" + (critiques[r - 2] || "(critic unavailable that round)") +
              "\n\nWrite your Round " + r + " revised answer." }
        ];
      }
      var p = await seatCall("proposer", r, pMsgs, 800);
      if (!p) {
        if (r === 1) throw new Error("The Proposer seat could not get any free model to respond — free-tier may be rate-limited right now. Try again in a minute, or pick different models.");
        proposals.push(proposals[proposals.length - 1]);
        notice("Round " + r + " revision unavailable — carrying the previous proposal forward.");
      } else {
        proposals.push(p.text);
      }

      // ── Critic: a different model family reacts to this round's proposal ────
      var cMsgs = [
        { role: "system", content: "You are the Critic in a multi-model LLM Council — a DIFFERENT AI family from the Proposer, reacting to its latest answer. " + mode.critique + " Be concise." },
        { role: "user", content:
            "Original input:\n" + framing +
            "\n\nThe Proposer's answer (Round " + r + "):\n" + proposals[proposals.length - 1] +
            "\n\nApply your treatment to this answer." }
      ];
      var c = await seatCall("critic", r, cMsgs, 500);
      critiques.push(c ? c.text : null);
    }

    // ── Chairman: synthesis of the full deliberation + decisive verdict ──────
    var ctx =
      proposals.map(function (t, i) { return "Proposer — Round " + (i + 1) + ":\n" + t; }).join("\n\n") + "\n\n" +
      critiques.map(function (t, i) { return t ? "Critic — Round " + (i + 1) + ":\n" + t : ""; }).filter(Boolean).join("\n\n");
    var chMsgs = [
      { role: "system", content:
          "You are the Chairman of a multi-model LLM Council. You received proposals and critiques from multiple distinct AI families across " + rounds + " round(s). " + mode.synth +
          " Be comprehensive yet concise. End with EXACTLY:\nVERDICT: [one decisive sentence]\nCONFIDENCE: [High/Medium/Low — one-line reason]\nNEXT STEP: [the single most useful action]" },
      { role: "user", content: "Original input:\n" + framing + "\n\n" + ctx + "\n\nDeliver the council's final synthesis and verdict." }
    ];
    var ch = await seatCall("chairman", 0, chMsgs, 1000);
    if (!ch) notice("Chairman unavailable — presenting the last proposal as the final answer.");

    return {
      final: ch ? ch.text : proposals[proposals.length - 1],
      chairmanModel: ch ? ch.model : null,
      proposals: proposals,
      critiques: critiques,
      rounds: rounds
    };
  }

  return {
    runCouncil: runCouncil,
    isFreeSlug: isFreeSlug,
    shortName: shortName,
    MODES: MODES,
    _config: CONFIG,                       // test harness knob
    _internal: { streamOnce: streamOnce, runSeat: runSeat }
  };
});
