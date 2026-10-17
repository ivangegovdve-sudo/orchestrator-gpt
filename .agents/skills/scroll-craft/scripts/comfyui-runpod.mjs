#!/usr/bin/env node
/**
 * scrollcraft asset generator: ComfyUI on RunPod SERVERLESS endpoints
 * (runpod/worker-comfyui). Same commands as kie.mjs.
 *
 *   POST https://api.runpod.ai/v2/<endpoint>/run       { input: { workflow, images } }
 *   GET  https://api.runpod.ai/v2/<endpoint>/status/<id>
 *
 * This is PAID compute, not local: RunPod bills the worker's GPU time per
 * second, including cold start, against a prepaid account balance. Workers
 * scale to zero when idle, so nothing is billed between jobs.
 *
 * COMMANDS
 *   still  <prompt> <out.png> [--ar 16:9] [--seed n] [--steps 20]
 *          Flux.1-dev fp8 text-to-image on the image endpoint (the model the
 *          worker image runpod/worker-comfyui:*-flux1-dev-fp8 ships). --ref is
 *          not supported: this workflow has no image input.
 *
 *   shot   <prompt> <in.png> <out.mp4> --workflow wf.json [--dur 5]
 *          Image-to-video on the VIDEO endpoint with a ComfyUI API-format
 *          workflow you supply. The strings {{PROMPT}}, {{IMAGE}} (the uploaded
 *          input's filename), {{SECONDS}} and {{SEED}} are substituted anywhere
 *          in it. The endpoint's worker must have the video model installed.
 *
 *   probe  print the account balance, spend rate, and each endpoint's health.
 *
 * Env (read from the project-root .env if not set; never printed):
 *   RUNPOD_API_KEY
 *   SCROLLCRAFT_COMFYUI_IMAGE_ENDPOINT   serverless endpoint id for stills
 *   SCROLLCRAFT_COMFYUI_VIDEO_ENDPOINT   serverless endpoint id for shots
 */

import fs from "node:fs";
import path from "node:path";

const API = "https://api.runpod.ai/v2";
const GRAPHQL = "https://api.runpod.io/graphql";

const SIZES = {
  "16:9": [1344, 768], "9:16": [768, 1344],
  "4:3": [1152, 864],  "3:4": [864, 1152],
  "1:1": [1024, 1024],
};

// ---------------------------------------------------------------- env ----
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
const envFile = (() => {
  const p = findEnv(process.cwd());
  const vals = {};
  if (!p) return vals;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m) vals[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return vals;
})();
const env = (name) => (process.env[name] || envFile[name] || "").trim();
function need(name) {
  const v = env(name);
  if (!v) throw new Error(`${name} is not set (env or project-root .env)`);
  return v;
}

const KEY = need("RUNPOD_API_KEY");
const H = { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` };

// ------------------------------------------------------------- helpers ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(res, label) {
  const text = await res.text();
  let j; try { j = JSON.parse(text); } catch { j = null; }
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${text.slice(0, 400)}`);
  return j;
}

async function account() {
  const j = await json(await fetch(GRAPHQL, {
    method: "POST", headers: H,
    body: JSON.stringify({ query: "{ myself { clientBalance currentSpendPerHr } }" }),
  }), "account");
  return j?.data?.myself || null;
}

async function run(endpoint, input, { label = "job", timeoutMs = 20 * 60 * 1000 } = {}) {
  const sub = await json(await fetch(`${API}/${endpoint}/run`, { method: "POST", headers: H, body: JSON.stringify({ input }) }), `submit ${label}`);
  if (!sub?.id) throw new Error(`submit ${label}: no job id: ${JSON.stringify(sub)}`);
  const t0 = Date.now();
  let delay = 2500;
  for (;;) {
    if (Date.now() - t0 > timeoutMs) {
      // A stuck job keeps a worker (and the bill) running; cancel it on the way out.
      const canRes = await fetch(`${API}/${endpoint}/cancel/${sub.id}`, { method: "POST", headers: H }).catch(() => null);
      const cancelOk = canRes && canRes.ok;
      throw new Error(`${label}: timed out after ${Math.round((Date.now() - t0) / 1000)}s (job ${cancelOk ? "cancelled" : "cancellation unconfirmed"})`);
    }
    const st = await json(await fetch(`${API}/${endpoint}/status/${sub.id}`, { headers: H }), `${label} status`);
    if (st.status === "COMPLETED") return st;
    if (["FAILED", "CANCELLED", "TIMED_OUT"].includes(st.status)) {
      throw new Error(`${label} ${st.status}: ${JSON.stringify(st.error || st.output || st).slice(0, 600)}`);
    }
    process.stderr.write(`  ${label}: ${st.status} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
    await sleep(delay);
    delay = Math.min(delay * 1.25, 10000);
  }
}

// worker-comfyui returns outputs as base64 or as bucket URLs, depending on
// whether the endpoint has S3 upload configured. Handle both.
async function saveFirst(output, out, kinds, requiredKind = null) {
  const list = kinds.flatMap((k) => output?.[k] || []);
  const item = list[0];
  if (!item) throw new Error(`no ${kinds.join("/")} in output: ${JSON.stringify(output).slice(0, 400)}`);
  if (requiredKind && !output?.[requiredKind]?.length) {
    throw new Error(`required output kind ${requiredKind} missing: ${JSON.stringify(output).slice(0, 400)}`);
  }
  const data = item.data ?? item.image ?? item.url;
  if (!data) throw new Error(`output item is empty: ${JSON.stringify(item).slice(0, 400)}`);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  if (item.type === "s3_url" || /^https?:/.test(data)) {
    const res = await fetch(data);
    if (!res.ok) throw new Error(`download ${res.status}`);
    fs.writeFileSync(path.resolve(out), Buffer.from(await res.arrayBuffer()));
  } else {
    fs.writeFileSync(path.resolve(out), Buffer.from(String(data).replace(/^data:[^,]+,/, ""), "base64"));
  }
  return out;
}

function report(label, st) {
  const s = (ms) => (ms == null ? "?" : (ms / 1000).toFixed(1));
  console.error(`  ${label}: queue/cold-start ${s(st.delayTime)}s, execution ${s(st.executionTime)}s (job ${st.id})`);
}

function flag(argv, name, dflt = null) {
  const i = argv.indexOf(name);
  return i > -1 && argv[i + 1] ? argv[i + 1] : dflt;
}

// Flux.1-dev fp8, the reference workflow shipped with worker-comfyui.
function fluxWorkflow(prompt, [width, height], seed, steps) {
  return {
    6:  { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["30", 1] } },
    8:  { class_type: "VAEDecode", inputs: { samples: ["31", 0], vae: ["30", 2] } },
    9:  { class_type: "SaveImage", inputs: { filename_prefix: "scrollcraft", images: ["8", 0] } },
    27: { class_type: "EmptySD3LatentImage", inputs: { width, height, batch_size: 1 } },
    30: { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "flux1-dev-fp8.safetensors" } },
    31: { class_type: "KSampler", inputs: { seed, steps, cfg: 1, sampler_name: "euler", scheduler: "simple", denoise: 1, model: ["30", 0], positive: ["35", 0], negative: ["33", 0], latent_image: ["27", 0] } },
    33: { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["30", 1] } },
    35: { class_type: "FluxGuidance", inputs: { guidance: 3.5, conditioning: ["6", 0] } },
  };
}

// ---------------------------------------------------------------- main ----
const [cmd, ...rest] = process.argv.slice(2);

try {
  if (cmd === "probe") {
    const a = await account();
    console.log("balance:", a ? `$${a.clientBalance.toFixed(4)} prepaid, current spend $${a.currentSpendPerH}/h` : "unavailable");
    let failed = false;
    for (const [label, name] of [["image", "SCROLLCRAFT_COMFYUI_IMAGE_ENDPOINT"], ["video", "SCROLLCRAFT_COMFYUI_VIDEO_ENDPOINT"]]) {
      const id = env(name);
      if (!id) { console.log(`${label} endpoint: ${name} not set`); continue; }
      const res = await fetch(`${API}/${id}/health`, { headers: H });
      const t = await res.text();
      if (!res.ok) failed = true;
      console.log(`${label} endpoint: ${res.ok ? t : `HTTP ${res.status} ${t.slice(0, 160)}`}`);
    }
    if (failed) process.exit(1);

  } else if (cmd === "still") {
    const [prompt, out] = rest;
    if (!prompt || !out) throw new Error('usage: comfyui-runpod.mjs still "<prompt>" <out.png> [--ar 16:9] [--seed n] [--steps 20]');
    if (rest.includes("--ref")) throw new Error("--ref is not supported by the Flux text-to-image workflow");
    const size = SIZES[flag(rest, "--ar", "16:9")] || SIZES["16:9"];
    const seed = Number(flag(rest, "--seed", String(Math.floor(Math.random() * 2 ** 31))));
    const steps = Number(flag(rest, "--steps", "20"));
    const st = await run(need("SCROLLCRAFT_COMFYUI_IMAGE_ENDPOINT"), { workflow: fluxWorkflow(prompt, size, seed, steps) }, { label: path.basename(out) });
    report(path.basename(out), st);
    await saveFirst(st.output, out, ["images"]);
    console.log(out);

  } else if (cmd === "shot") {
    const [prompt, head, out] = rest;
    const wfPath = flag(rest, "--workflow");
    if (rest.includes("--tail")) throw new Error("--tail is not supported by the ComfyUI adapter: the workflow pins no end frame (use kie.mjs or fal.mjs for --tail)");
    if (!prompt || !head || !out || !wfPath) {
      throw new Error('usage: comfyui-runpod.mjs shot "<prompt>" <head.png> <out.mp4> --workflow wf.json [--dur 5]');
    }
    const imageName = "scrollcraft-head" + path.extname(head);
    const vars = {
      "{{PROMPT}}": JSON.stringify(prompt).slice(1, -1),
      "{{IMAGE}}": imageName,
      "{{SECONDS}}": String(flag(rest, "--dur", "5")),
      "{{SEED}}": String(Math.floor(Math.random() * 2 ** 31)),
    };
    let wf = fs.readFileSync(path.resolve(wfPath), "utf8");
    for (const [k, v] of Object.entries(vars)) wf = wf.split(k).join(v);
    const input = {
      workflow: JSON.parse(wf),
      images: [{ name: imageName, image: fs.readFileSync(path.resolve(head)).toString("base64") }],
    };
    const st = await run(need("SCROLLCRAFT_COMFYUI_VIDEO_ENDPOINT"), input, { label: path.basename(out) });
    report(path.basename(out), st);
    await saveFirst(st.output, out, ["videos"], "videos");
    console.log(out);

  } else {
    console.error(`scrollcraft asset generator (ComfyUI on RunPod serverless)

  node comfyui-runpod.mjs probe
  node comfyui-runpod.mjs still "<prompt>" <out.png> [--ar 16:9] [--seed n] [--steps 20]
  node comfyui-runpod.mjs shot  "<prompt>" <head.png> <out.mp4> --workflow wf.json [--dur 5]
`);
    process.exit(1);
  }
} catch (err) {
  console.error("ERROR:", err.message);
  process.exit(1);
}
