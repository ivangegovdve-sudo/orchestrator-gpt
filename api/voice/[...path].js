"use strict";
// Vercel serverless proxy — Voice Playground → audiobook-saas on Oracle.
//
// Two reasons this exists rather than the page calling the API directly:
//
//  1. chloe.blumenkraft.cloud/audiobook/* sends no CORS headers at all and
//     405s on OPTIONS, so a browser on sdforest.site cannot fetch it. Going
//     through here makes every request same-origin.
//  2. The upstream /engines response is not safe to forward. It labels its
//     engines by provider and by whose voice they clone. The catalogue below
//     is the only thing a visitor ever sees; upstream is consulted for
//     availability and nothing else.

const AUDIOBOOK_BASE =
  process.env.AUDIOBOOK_API_URL || "https://chloe.blumenkraft.cloud/audiobook";

// Preview-sized. Long enough to hear a voice's character, short enough that
// every engine answers in seconds and none of the metered ones get drained by
// someone pasting a chapter in.
const MAX_CHARS = 500;

// Public names and copy, held here so they cannot drift back to the upstream
// labels.
//
// `slug` is what the page speaks; `engine` is the upstream id and never leaves
// this file. The ids name providers and a self-hosted service, and two of them
// are a clone of a specific person's voice — so "hume" in a network tab is the
// same leak as "Hume Octave 2 (Chloé voice)" in a label, just quieter.
const ENGINES = [
  {
    slug: "standard",
    engine: "edge",
    label: "Standard voice",
    blurb: "Fast, 300+ voices. Free and unlimited.",
    requiresKey: false,
    default: true,
  },
  {
    slug: "natural-a",
    engine: "pocket",
    label: "Natural voice A",
    blurb: "Premium and slower. Capped at 20,000 characters per job.",
    requiresKey: true,
    default: false,
  },
  {
    slug: "natural-b",
    engine: "hume",
    label: "Natural voice B",
    blurb: "Premium with no length limit, from a metered monthly allowance.",
    requiresKey: true,
    default: false,
  },
  {
    slug: "natural-c",
    engine: "gemini",
    label: "Natural voice C",
    blurb: "Backup narrator. No length limit, but rate limited.",
    requiresKey: true,
    default: false,
  },
];

const BY_SLUG = new Map(ENGINES.map((entry) => [entry.slug, entry]));

// Everything the page is allowed to see about a voice.
function publicEngine(entry, available) {
  return {
    id: entry.slug,
    label: entry.label,
    blurb: entry.blurb,
    requiresKey: entry.requiresKey,
    default: entry.default,
    available,
  };
}

function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

// Upstream error text is written for the operator and quotes engine ids
// verbatim — a 503 reads "'pocket' is unavailable and so is every engine it
// falls back to", and a bad-engine 400 lists all four. Those strings are
// useful, so rewrite them into public names rather than discarding them.
const ID_PATTERN = new RegExp(
  `'?\\b(${ENGINES.map((entry) => entry.engine).join("|")})\\b'?`,
  "gi",
);
const PUBLIC_BY_ENGINE = new Map(
  ENGINES.map((entry) => [entry.engine, entry.label.toLowerCase()]),
);

function scrub(message, fallback) {
  if (typeof message !== "string" || !message) return fallback;
  return message.replace(ID_PATTERN, (match, id) =>
    PUBLIC_BY_ENGINE.get(id.toLowerCase()) || "another voice");
}

// The upstream key is never held server-side: these engines cost Ivan a
// metered quota and occupy a live voice service, and a public function
// carrying the key would hand that to anyone who found the URL. The visitor
// supplies it, we forward it, we don't store it.
function upstreamHeaders(req) {
  const key = req.headers["x-audiobook-key"];
  return typeof key === "string" && key ? { "X-Audiobook-Key": key } : {};
}

async function listEngines(res) {
  // Availability is upstream's to know — an engine with no credentials on the
  // server is offered as disabled rather than failing at generate time.
  let live = null;
  try {
    const upstream = await fetch(`${AUDIOBOOK_BASE}/engines`);
    if (upstream.ok) {
      const data = await upstream.json();
      live = new Map(
        (data.engines || []).map((engine) => [
          engine.id,
          engine.available !== false,
        ]),
      );
    }
  } catch {
    // Upstream unreachable — report the catalogue with availability unknown
    // rather than an empty picker.
  }

  json(res, 200, {
    max_chars: MAX_CHARS,
    engines: ENGINES.map((entry) => publicEngine(
      entry,
      // Absent from upstream means not deployed there yet, which is not the
      // same as broken — but it cannot be selected either way.
      live ? live.get(entry.engine) === true : null,
    )),
  });
}

async function speak(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const chosen = BY_SLUG.get(typeof body.voice === "string" ? body.voice : "standard");

  if (!text) return json(res, 400, { error: "Nothing to read — type some text first." });
  if (text.length > MAX_CHARS) {
    return json(res, 413, {
      error: `Preview is limited to ${MAX_CHARS} characters (you sent ${text.length}).`,
    });
  }
  if (!chosen) return json(res, 400, { error: "Unknown voice." });

  // The API takes books, not strings: /generate is multipart and wants a file
  // it can ingest. A .txt part is the short-form path through the same
  // pipeline. The filename becomes the job's title, so keep it presentable.
  const form = new FormData();
  form.append("file", new Blob([text], { type: "text/plain" }), "Voice preview.txt");
  form.append("voice_engine", chosen.engine);

  try {
    const upstream = await fetch(`${AUDIOBOOK_BASE}/generate`, {
      method: "POST",
      headers: upstreamHeaders(req),
      body: form,
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return json(res, upstream.status, {
        error: scrub(data.detail, "The voice service refused this preview."),
      });
    }
    return json(res, 200, { job_id: data.job_id, status: data.status });
  } catch (err) {
    return json(res, 502, { error: "Voice service unreachable.", detail: err.message });
  }
}

async function status(res, jobId) {
  try {
    const upstream = await fetch(`${AUDIOBOOK_BASE}/status/${encodeURIComponent(jobId)}`);
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return json(res, upstream.status, { error: scrub(data.detail, "Unknown job.") });
    }
    // A status payload names the engine that ran, which is one of the private
    // ids. The page only needs to know whether the voice changed under it.
    const used = data.engine_used || data.engine;
    const requested = data.engine;
    const substituted = Boolean(used && requested && used !== requested);
    return json(res, 200, {
      status: data.status,
      progress: data.progress ?? 0,
      ready: data.ready === true,
      // Job errors are engine failures, so they quote ids too.
      error: data.error ? scrub(data.error, "This preview failed.") : null,
      duration: data.audio_duration || null,
      // Falling back changes the narrator, which a listener hears immediately.
      // Say so without naming what answered.
      substituted,
    });
  } catch (err) {
    return json(res, 502, { error: "Voice service unreachable.", detail: err.message });
  }
}

async function audio(res, jobId) {
  try {
    const upstream = await fetch(`${AUDIOBOOK_BASE}/download/${encodeURIComponent(jobId)}`);
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({}));
      return json(res, upstream.status, { error: scrub(data.detail, "Audio not ready.") });
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", "audio/mp4");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Cache-Control", "no-store");
    // Inline: the <audio> element streams it. The download button adds its own
    // filename client-side.
    res.setHeader("Content-Disposition", 'inline; filename="voice-preview.m4a"');
    return res.status(200).send(buffer);
  } catch (err) {
    return json(res, 502, { error: "Voice service unreachable.", detail: err.message });
  }
}

module.exports = async function handler(req, res) {
  const segments = req.query.path || [];
  const parts = Array.isArray(segments) ? segments : [segments];
  const [route, jobId] = parts;

  if (route === "engines" && req.method === "GET") return listEngines(res);
  if (route === "speak" && req.method === "POST") return speak(req, res);
  if (route === "status" && jobId && req.method === "GET") return status(res, jobId);
  if (route === "audio" && jobId && req.method === "GET") return audio(res, jobId);

  return json(res, 404, { error: "No such voice route." });
};
