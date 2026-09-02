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
