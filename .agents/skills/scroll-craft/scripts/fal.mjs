#!/usr/bin/env node
/**
 * scrollcraft asset generator: fal.ai queue API. Same commands as kie.mjs.
 *
 *   POST https://queue.fal.run/<endpoint>            { ...input }
 *   GET  <status_url>  then  GET <response_url>
 *
 * COMMANDS
 *   still  <prompt> <out.png> [--ar 16:9] [--ref a.png]
 *          bytedance/seedream/v4.5 text-to-image (or /edit with --ref). The
 *          same model family kie.mjs uses, so a switch does not change the look.
 *
 *   shot   <prompt> <in.png> <out.mp4> [--tail b.png] [--dur 5]
 *          kling-video/v2.1/pro image-to-video, the model kie.mjs uses. --tail
 *          pins the last frame for seamless chains, exactly as in kie.mjs.
 *
 *   probe  print the prepaid balance and the live unit prices of both models.
 *
 * Override a model with --model <endpoint-id>. Prices come from fal's pricing
 * API at run time, never from this file, because they change.
 *
 * Env: FAL_KEY (fal's own name for it), read from the project-root .env if not
 * already set. The key is sent as a header and never printed.
 */

import fs from "node:fs";
import path from "node:path";

const QUEUE = "https://queue.fal.run";
const PLATFORM = "https://api.fal.ai/v1";
const BALANCE = "https://rest.alpha.fal.ai/billing/user_balance";

const MODELS = {
  still:     "fal-ai/bytedance/seedream/v4.5/text-to-image",
  stillEdit: "fal-ai/bytedance/seedream/v4.5/edit",
  shot:      "fal-ai/kling-video/v2.1/pro/image-to-video",
};

// seedream sizes by name; kie.mjs takes the same --ar values.
const SIZES = {
  "16:9": "landscape_16_9", "9:16": "portrait_16_9",
  "4:3": "landscape_4_3",   "3:4": "portrait_4_3",
  "1:1": "square_hd",
};

// ---------------------------------------------------------------- key ----
function findEnv(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 8; i++) {
    const p = path.join(dir, ".env");
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
function loadKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY.trim();
  const envPath = findEnv(process.cwd());
  if (!envPath) throw new Error("FAL_KEY not set and no .env found walking up from " + process.cwd());
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*FAL_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  throw new Error("FAL_KEY not found in " + envPath);
}
const KEY = loadKey();
const H = { "Content-Type": "application/json", Authorization: `Key ${KEY}` };

// ------------------------------------------------------------- helpers ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fal accepts data URIs for image inputs, so a local file needs no upload step.
function asUrl(v) {
  if (/^(https?:|data:)/i.test(v)) return v;
  const abs = path.resolve(v);
  if (!fs.existsSync(abs)) throw new Error("input not found: " + abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
}

async function json(res, label) {
  const text = await res.text();
  let j; try { j = JSON.parse(text); } catch { j = null; }
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${text.slice(0, 500)}`);
  return j;
}

async function run(model, input, { label = "job", timeoutMs = 15 * 60 * 1000 } = {}) {
  const sub = await json(await fetch(`${QUEUE}/${model}`, { method: "POST", headers: H, body: JSON.stringify(input) }), `submit ${model}`);
  if (!sub?.request_id) throw new Error(`submit ${model}: no request_id: ${JSON.stringify(sub)}`);
  const t0 = Date.now();
  let delay = 3000;
  for (;;) {
    if (Date.now() - t0 > timeoutMs) throw new Error(`${label}: timed out after ${Math.round((Date.now() - t0) / 1000)}s`);
    const st = await json(await fetch(sub.status_url, { headers: H }), `${label} status`);
    if (st.status === "COMPLETED") break;
    if (st.status && !["IN_QUEUE", "IN_PROGRESS"].includes(st.status)) throw new Error(`${label} failed: ${JSON.stringify(st)}`);
    process.stderr.write(`  ${label}: ${st.status}${st.queue_position != null ? ` #${st.queue_position}` : ""} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
    await sleep(delay);
    delay = Math.min(delay * 1.25, 15000);
  }
  const out = await json(await fetch(sub.response_url, { headers: H }), `${label} result`);
  return { requestId: sub.request_id, out, seconds: Math.round((Date.now() - t0) / 1000) };
}

async function download(url, out) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  fs.writeFileSync(path.resolve(out), Buffer.from(await res.arrayBuffer()));
  return out;
}

async function balance() {
  const res = await fetch(BALANCE, { headers: H });
  const t = (await res.text()).trim();
  return res.ok && Number.isFinite(Number(t)) ? Number(t) : null;
}

async function prices(ids) {
  const q = ids.map((id) => `endpoint_id=${encodeURIComponent(id)}`).join("&");
  const j = await json(await fetch(`${PLATFORM}/models/pricing?${q}`, { headers: H }), "pricing");
  return j.prices || [];
}

function flag(argv, name, dflt = null) {
  const i = argv.indexOf(name);
  return i > -1 && argv[i + 1] ? argv[i + 1] : dflt;
}
function flags(argv, name) {
  const out = [];
  argv.forEach((a, i) => { if (a === name && argv[i + 1]) out.push(argv[i + 1]); });
  return out;
}

// ---------------------------------------------------------------- main ----
const [cmd, ...rest] = process.argv.slice(2);

try {
  if (cmd === "probe") {
    const b = await balance();
    console.log("balance:", b == null ? "unavailable for this key" : `$${b.toFixed(4)} prepaid`);
    for (const p of await prices([MODELS.still, MODELS.stillEdit, MODELS.shot])) {
      console.log(`price:   ${p.endpoint_id}  $${p.unit_price} per ${p.unit}`);
    }

  } else if (cmd === "still") {
    const [prompt, out] = rest;
    if (!prompt || !out) throw new Error('usage: fal.mjs still "<prompt>" <out.png> [--ar 16:9] [--ref a.png] [--model id]');
    const ar = flag(rest, "--ar", "16:9");
    const refs = flags(rest, "--ref");
    let model = flag(rest, "--model", refs.length ? MODELS.stillEdit : MODELS.still);
    const input = {
      prompt,
      image_size: SIZES[ar] || SIZES["16:9"],
      num_images: 1,
      enable_safety_checker: true,
    };
    if (refs.length) input.image_urls = refs.map(asUrl);
    const { out: r, requestId, seconds } = await run(model, input, { label: path.basename(out) });
    const url = r?.images?.[0]?.url;
    if (!url) throw new Error(`no image in result: ${JSON.stringify(r).slice(0, 300)}`);
    await download(url, out);
    console.error(`  ${model} request ${requestId} in ${seconds}s`);
    console.log(out);

  } else if (cmd === "shot") {
    const [prompt, head, out] = rest;
    if (!prompt || !head || !out) {
      throw new Error('usage: fal.mjs shot "<prompt>" <head.png> <out.mp4> [--tail b.png] [--dur 5] [--model id]');
    }
    const model = flag(rest, "--model", MODELS.shot);
    const tail = flag(rest, "--tail");
    const input = {
      prompt,
      image_url: asUrl(head),
      duration: String(flag(rest, "--dur", "5")),
      // Same negative prompt as kie.mjs: it targets what breaks a scrub.
      negative_prompt: "blur, distortion, low quality, warping, morphing, jitter, flicker, text, watermark, cut, scene change",
      cfg_scale: 0.5,
    };
    if (tail) input.tail_image_url = asUrl(tail);
    const { out: r, requestId, seconds } = await run(model, input, { label: path.basename(out), timeoutMs: 20 * 60 * 1000 });
    const url = r?.video?.url;
    if (!url) throw new Error(`no video in result: ${JSON.stringify(r).slice(0, 300)}`);
    await download(url, out);
    console.error(`  ${model} request ${requestId} in ${seconds}s`);
    console.log(out);

  } else {
    console.error(`scrollcraft asset generator (fal.ai)

  node fal.mjs probe
  node fal.mjs still "<prompt>" <out.png> [--ar 16:9] [--ref ref.png] [--model id]
  node fal.mjs shot  "<prompt>" <head.png> <out.mp4> [--tail tail.png] [--dur 5] [--model id]
`);
    process.exit(1);
  }
} catch (err) {
  console.error("ERROR:", err.message);
  process.exit(1);
}
