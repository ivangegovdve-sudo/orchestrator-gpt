const fs = require("fs");
const path = require("path");

const root = __dirname;
const outDir = path.join(root, "vercel-public");

function copyFile(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else if (entry.isFile()) copyFile(src, dest);
  }
}

// Regenerate the glossary bundle BEFORE copying web/, so the deploy always carries the
// terms currently in glossary/*.md. This is the whole point: Ivan's weekly term files
// publish themselves on the next deploy instead of needing a manual re-index.
require("./scripts/build-glossary-bundle.cjs").build();

// On Vercel, the build runs twice (vercel build + npm run vercel-build).
// Deleting outDir mid-stream causes ENOENT in @vercel/build-utils.
// Skip the wipe on Vercel; overwrite-in-place is safe because it's a fresh clone.
if (!process.env.VERCEL) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

[
  "index.html",
  "resume.json",
].forEach((file) => copyFile(path.join(root, file), path.join(outDir, file)));

[
  "web",
  "calendar",
  "movies",
  "frontend",
  "public",
  "config",
].forEach((dir) => copyDir(path.join(root, dir), path.join(outDir, dir)));

copyDir(path.join(root, "data", "presets"), path.join(outDir, "data", "presets"));
[
  "sd_inventory_curated.json",
].forEach((file) => copyFile(path.join(root, "data", file), path.join(outDir, "data", file)));

console.log(`Static Forest HUB build written to ${outDir}`);
