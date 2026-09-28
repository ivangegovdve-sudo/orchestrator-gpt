#!/usr/bin/env node
/**
 * Provider switch for scrollcraft asset generation. Same commands as every
 * adapter, so the rest of the skill never needs to know which one ran:
 *
 *   node asset.mjs probe
 *   node asset.mjs still "<prompt>" <out.png> [--ar 16:9] [--ref a.png]
 *   node asset.mjs shot  "<prompt>" <head.png> <out.mp4> [--tail b.png] [--dur 5]
 *
 * SCROLLCRAFT_ASSET_PROVIDER = kie | fal | comfyui picks one explicitly and
 * always wins. When it is unset, the first CONFIGURED provider in the
 * preference order for that command is used (see references/assets.md,
 * "Choosing a provider", for the measured costs behind the order):
 *
 *   still:  comfyui  ->  fal  ->  kie
 *   shot:   fal  ->  comfyui (only with a video endpoint)  ->  kie
 *   probe:  every configured provider
 *
 * "Configured" means its credentials are present in the environment or the
 * project-root .env. Nothing is printed except provider names.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const ADAPTERS = {
  kie:     { script: "kie.mjs",            needs: ["KIE_AI_API_KEY"] },
  fal:     { script: "fal.mjs",            needs: ["FAL_KEY"] },
  comfyui: { script: "comfyui-runpod.mjs", needs: ["RUNPOD_API_KEY", "SCROLLCRAFT_COMFYUI_IMAGE_ENDPOINT"] },
};
const ORDER = {
  still: ["comfyui", "fal", "kie"],
  shot:  ["fal", "comfyui", "kie"],
};

function envFile() {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const p = path.join(dir, ".env");
    if (fs.existsSync(p)) {
      const vals = {};
      for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
        if (m) vals[m[1]] = m[2];
      }
      return vals;
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return {};
}
const FILE = envFile();
const has = (name) => Boolean((process.env[name] || FILE[name] || "").trim());
const configured = (p, cmd) => ADAPTERS[p].needs.every(has)
  && !(p === "comfyui" && cmd === "shot" && !has("SCROLLCRAFT_COMFYUI_VIDEO_ENDPOINT"));

const [cmd, ...rest] = process.argv.slice(2);
const explicit = (process.env.SCROLLCRAFT_ASSET_PROVIDER || FILE.SCROLLCRAFT_ASSET_PROVIDER || "").trim().toLowerCase();

if (explicit && !ADAPTERS[explicit]) {
  console.error(`SCROLLCRAFT_ASSET_PROVIDER=${explicit} is not one of: ${Object.keys(ADAPTERS).join(", ")}`);
  process.exit(1);
}

function runAdapter(p) {
  const r = spawnSync(process.execPath, [path.join(HERE, ADAPTERS[p].script), cmd, ...rest], { stdio: "inherit" });
  return r.status ?? 1;
}

if (cmd === "probe") {
  const list = explicit ? [explicit] : Object.keys(ADAPTERS).filter((p) => ADAPTERS[p].needs.every(has));
  if (!list.length) { console.error("no provider is configured; see references/assets.md"); process.exit(1); }
  let worst = 0;
  for (const p of list) { console.log(`\n== ${p}`); worst = Math.max(worst, runAdapter(p)); }
  process.exit(worst);
}

if (!ORDER[cmd]) {
  console.error('usage: asset.mjs probe | still "<prompt>" <out.png> [...] | shot "<prompt>" <head.png> <out.mp4> [...]\n'
    + "provider: SCROLLCRAFT_ASSET_PROVIDER=kie|fal|comfyui, else the preference order in this file's header");
  process.exit(1);
}

const provider = explicit || ORDER[cmd].find((p) => configured(p, cmd));
if (!provider) {
  console.error(`no provider is configured for "${cmd}" (tried ${ORDER[cmd].join(", ")}); see references/assets.md`);
  process.exit(1);
}
console.error(`scrollcraft asset provider: ${provider}${explicit ? " (SCROLLCRAFT_ASSET_PROVIDER)" : " (first configured in preference order)"}`);
process.exit(runAdapter(provider));
