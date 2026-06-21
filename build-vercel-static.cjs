const fs = require("fs");
const https = require("https");
const path = require("path");

const root = __dirname;
const outDir = path.join(root, "vercel-public");
const mendeleevSourceUrl =
  "https://raw.githubusercontent.com/ivangegovdve-sudo/mendeleev-bg/master/periodic-table-bg.html";

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

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "orchestrator-gpt-build" } }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        res.setEncoding("utf8");
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

async function syncMendeleevBg() {
  const target = path.join(root, "web", "mendeleev-bg", "index.html");
  try {
    const html = await fetchText(mendeleevSourceUrl);
    if (!html.includes("<html") || !/periodic|периодична/i.test(html)) {
      throw new Error("unexpected source content");
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html, "utf8");
    console.log("Synced Mendeleev BG from GitHub raw source.");
  } catch (error) {
    console.warn(`Mendeleev BG sync skipped: ${error.message}`);
  }
}

async function main() {
  // syncMendeleevBg() skipped — using committed local version

  fs.rmSync(outDir, { recursive: true, force: true });
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
