// Unit harness for web/council/council.js — the browser-side BYOK council
// engine. Stubs global fetch with OpenRouter-shaped SSE streams and exercises
// the REAL pipeline: streaming deltas, round-loop context passing, 429 backoff
// retry, roster fallback, graceful seat failure, rounds clamp, the :free
// kill-gate, and user abort mid-stream.
"use strict";
const Council = require("../web/council/council.js");

// Shrink timings so the suite runs in milliseconds.
Council._config.BACKOFF_BASE_MS = 5;
Council._config.FIRST_TOKEN_TIMEOUT_MS = 1000;
Council._config.STREAM_HARD_CAP_MS = 5000;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.error("FAIL: " + name + (extra !== undefined ? " — got: " + JSON.stringify(extra) : "")); }
}

function sseBody(text, init) {
  // OpenRouter-shaped SSE: keep-alive comment, token deltas, [DONE].
  const deltas = text.match(/.{1,6}/gs) || [];
  let payload = ": OPENROUTER PROCESSING\n\n";
  for (const d of deltas) payload += "data: " + JSON.stringify({ choices: [{ delta: { content: d } }] }) + "\n\n";
  payload += "data: [DONE]\n\n";
  return new ReadableStream({
    start(c) {
      if (init && init.signal) init.signal.addEventListener("abort", () => { try { c.error(Object.assign(new Error("aborted"), { name: "AbortError" })); } catch (e) {} });
      c.enqueue(new TextEncoder().encode(payload));
      c.close();
    }
  });
}
function okResponse(text, init) { return { ok: true, status: 200, text: async () => "", body: sseBody(text, init) }; }
function errResponse(status) { return { ok: false, status, text: async () => "stub upstream error", body: null }; }

function seats(p, c, ch) {
  return { proposer: p, critic: c, chairman: ch };
}

(async function main() {

  // ── 1. Happy path: 2 rounds, context passing, streaming, event order ───────
  {
    const calls = [];
    const events = [];
    global.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      check("always stream:true", body.stream === true);
      return okResponse("[" + body.model + "] answer for turn " + calls.length, init);
    };
    const res = await Council.runCouncil({
      apiKey: "sk-or-test", question: "Should I learn Rust?", rounds: 2, mode: "default",
      seats: seats(["a/prop:free"], ["b/crit:free"], ["c/chair:free"]),
      on: { stage: (e) => events.push(e), notice: () => {} }
    });
    check("2 rounds + chairman = 5 calls", calls.length === 5, calls.length);
    check("round-2 proposer got round-1 critique (context passes)",
      calls[2].messages[1].content.includes("[b/crit:free] answer for turn 2"));
    check("round-2 proposer got its own round-1 answer",
      calls[2].messages[1].content.includes("[a/prop:free] answer for turn 1"));
    check("chairman got all rounds",
      calls[4].messages[1].content.includes("Round 1") && calls[4].messages[1].content.includes("Round 2"));
    check("final is the chairman's text", res.final.includes("[c/chair:free] answer for turn 5"));
    check("chairmanModel reported", res.chairmanModel === "c/chair:free");
    const deltas = events.filter((e) => e.status === "delta");
    check("deltas streamed", deltas.length > 5, deltas.length);
    const dones = events.filter((e) => e.status === "done").map((e) => e.seat + ":" + e.round);
    check("done order proposer1,critic1,proposer2,critic2,chairman0",
      JSON.stringify(dones) === JSON.stringify(["proposer:1", "critic:1", "proposer:2", "critic:2", "chairman:0"]), dones);
    const streamed = events.filter((e) => e.seat === "proposer" && e.round === 1 && e.status === "delta").map((e) => e.delta).join("");
    const doneText = events.find((e) => e.seat === "proposer" && e.round === 1 && e.status === "done").text;
    check("accumulated deltas equal final text", streamed === doneText);
  }

  // ── 2. 429 → exponential backoff retry on the SAME model, then success ─────
  {
    let hits = 0;
    global.fetch = async (url, init) => {
      hits++;
      if (hits <= 3) { /* proposer turn */ }
      return hits === 1 ? errResponse(429) : okResponse("recovered", init);
    };
    const notices = [];
    const res = await Council.runCouncil({
      apiKey: "k", question: "q", rounds: 1, mode: "default",
      seats: seats(["a/only:free"], ["b/crit:free"], ["c/chair:free"]),
      on: { notice: (t) => notices.push(t) }
    });
    check("429 retried same model and recovered", res.proposals[0] === "recovered");
    check("retry notice emitted", notices.some((t) => /Rate-limited/.test(t)), notices);
  }

  // ── 3. Retries exhausted → fall back to the next :free model ───────────────
  {
    const tried = [];
    global.fetch = async (url, init) => {
      const m = JSON.parse(init.body).model;
      tried.push(m);
      if (m === "a/flaky:free") return errResponse(429);
      return okResponse("from " + m, init);
    };
    const res = await Council.runCouncil({
      apiKey: "k", question: "q", rounds: 1, mode: "default",
      seats: seats(["a/flaky:free", "a/backup:free"], ["b/crit:free"], ["c/chair:free"]),
      on: {}
    });
    check("flaky tried twice (1 retry) then backup", JSON.stringify(tried.slice(0, 3)) === JSON.stringify(["a/flaky:free", "a/flaky:free", "a/backup:free"]), tried);
    check("fallback answer used", res.proposals[0] === "from a/backup:free");
  }

  // ── 4. Hard failure (500) → immediate fallback, no retry ──────────────────
  {
    const tried = [];
    global.fetch = async (url, init) => {
      const m = JSON.parse(init.body).model;
      tried.push(m);
      if (m === "a/dead:free") return errResponse(500);
      return okResponse("alive", init);
    };
    await Council.runCouncil({
      apiKey: "k", question: "q", rounds: 1, mode: "default",
      seats: seats(["a/dead:free", "a/live:free"], ["b/c:free"], ["c/ch:free"]), on: {}
    });
    check("500 → single attempt then next model", tried[0] === "a/dead:free" && tried[1] === "a/live:free" && tried.filter((m) => m === "a/dead:free").length === 1, tried);
  }

  // ── 5. Whole seat fails → pipeline degrades gracefully ─────────────────────
  {
    global.fetch = async (url, init) => {
      const m = JSON.parse(init.body).model;
      if (m.startsWith("crit/")) return errResponse(500);
      return okResponse("fine from " + m, init);
    };
    const events = [];
    const res = await Council.runCouncil({
      apiKey: "k", question: "q", rounds: 1, mode: "default",
      seats: seats(["p/p:free"], ["crit/x:free", "crit/y:free"], ["ch/ch:free"]),
      on: { stage: (e) => events.push(e) }
    });
    check("critic failed gracefully", events.some((e) => e.seat === "critic" && e.status === "failed"));
    check("critique recorded as null", res.critiques[0] === null);
    check("chairman still ran", res.final.includes("fine from ch/ch:free"));
  }

  // ── 6. :free kill-gate — paid slug rejected BEFORE any network call ───────
  {
    let fetches = 0;
    global.fetch = async () => { fetches++; return okResponse("x"); };
    let threw = null;
    try {
      await Council.runCouncil({
        apiKey: "k", question: "q", rounds: 1, mode: "default",
        seats: seats(["openai/gpt-4o"], ["b/c:free"], ["c/ch:free"]), on: {}
      });
    } catch (e) { threw = e; }
    check("paid model throws PAID_MODEL_BLOCKED", threw && threw.code === "PAID_MODEL_BLOCKED", threw && threw.message);
    check("zero network calls made", fetches === 0, fetches);
  }

  // ── 7. Rounds clamp 1–5 ────────────────────────────────────────────────────
  {
    global.fetch = async (url, init) => okResponse("t", init);
    const res9 = await Council.runCouncil({ apiKey: "k", question: "q", rounds: 9, mode: "default", seats: seats(["a/a:free"], ["b/b:free"], ["c/c:free"]), on: {} });
    check("rounds 9 clamps to 5", res9.rounds === 5 && res9.proposals.length === 5, res9.rounds);
    const res0 = await Council.runCouncil({ apiKey: "k", question: "q", rounds: 0, mode: "default", seats: seats(["a/a:free"], ["b/b:free"], ["c/c:free"]), on: {} });
    check("rounds 0 defaults to 2", res0.rounds === 2, res0.rounds);
  }

  // ── 8. User abort mid-stream → AbortError, no further seats run ────────────
  {
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push(JSON.parse(init.body).model);
      // Never-ending stream: one delta, then stays open until aborted.
      return {
        ok: true, status: 200, text: async () => "",
        body: new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'));
            if (init.signal) init.signal.addEventListener("abort", () => { try { c.error(Object.assign(new Error("aborted"), { name: "AbortError" })); } catch (e) {} });
          }
        })
      };
    };
    const ac = new AbortController();
    let threw = null;
    const run = Council.runCouncil({
      apiKey: "k", question: "q", rounds: 3, mode: "default",
      seats: seats(["a/a:free"], ["b/b:free"], ["c/c:free"]),
      signal: ac.signal,
      on: { stage: (e) => { if (e.status === "delta") setTimeout(() => ac.abort(), 5); } }
    });
    try { await run; } catch (e) { threw = e; }
    check("abort rejects with AbortError", threw && threw.name === "AbortError", threw && threw.name);
    check("abort stopped after first seat", calls.length === 1, calls);
  }

  // ── 9. Missing API key fails fast ──────────────────────────────────────────
  {
    let threw = null;
    try { await Council.runCouncil({ apiKey: "", question: "q", rounds: 1, seats: seats(["a:free"], ["b:free"], ["c:free"]), on: {} }); }
    catch (e) { threw = e; }
    check("empty key throws helpful error", threw && /API key/.test(threw.message));
  }

  console.log((fail === 0 ? "ALL PASS" : "SOME FAIL") + " — " + pass + " passed, " + fail + " failed.");
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("HARNESS CRASH:", e); process.exit(1); });
