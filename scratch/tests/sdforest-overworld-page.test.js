const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { chromium } = require("playwright");

const repoRoot = path.resolve(__dirname, "..", "..");
const outputDir = "D:/output";

let baseUrl;
let browser;
let server;

function contentType(filePath) {
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
  }[path.extname(filePath)] || "application/octet-stream";
}

function startStaticServer() {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let filePath = path.resolve(repoRoot, pathname.replace(/^\/+/, ""));
    if (!filePath.startsWith(repoRoot)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(response);
  });
}

async function openFrontDoor(page) {
  await page.goto(`${baseUrl}/web/sdforest-overworld/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("#forest-shell")?.dataset.renderer === "ready");
  await page.locator("#intro-activator").focus();
  await page.waitForFunction(() => window.__sdForest.snapshot().introPhase === "open");
  await page.locator("#enter-forest").click();
  await page.waitForFunction(() => window.__sdForest.snapshot().scene === "frontdoor");
}

before(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  server = startStaticServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  server?.closeAllConnections();
  await new Promise((resolve) => server?.close(resolve));
});

test("two-scene front door opens a portal, lands on project pools, and captures desktop proof", { concurrency: false }, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/web/sdforest-overworld/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("#forest-shell")?.dataset.renderer === "ready");
  assert.deepEqual(await page.evaluate(() => window.__sdForest.snapshot()), {
    introPhase: "dormant",
    reducedMotion: false,
    renderer: "webgl",
    scene: "intro",
    selectedSourceId: null,
    sourceCount: 6,
  });

  await page.locator("#intro-activator").hover();
  await page.waitForFunction(() => window.__sdForest.snapshot().introPhase === "open");
  assert.equal(await page.locator("#enter-forest").isVisible(), true);
  await page.screenshot({ path: path.join(outputDir, "SDFOREST_INTRO_PORTAL_PROTOTYPE_2026-10-17.png"), fullPage: false, timeout: 15000 });

  await page.locator("#enter-forest").click();
  await page.waitForFunction(() => window.__sdForest.snapshot().scene === "frontdoor");
  assert.equal(await page.locator("#project-sources").isVisible(), true);

  await page.locator('[data-source-id="the-drop"]').hover();
  await page.waitForFunction(() => window.__sdForest.snapshot().selectedSourceId === "the-drop");
  await assert.doesNotReject(() => page.locator("#pool-detail").waitFor({ state: "visible" }));
  assert.equal(await page.locator("#pool-title").textContent(), "The Drop");
  assert.match(await page.locator("#open-source").getAttribute("href"), /morning-news/);

  await page.screenshot({ path: path.join(outputDir, "SDFOREST_OVERWORLD_PROTOTYPE_DESKTOP_2026-10-17.png"), fullPage: false, timeout: 15000 });
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("mobile and reduced-motion paths preserve the linked-scene interaction", { concurrency: false }, async () => {
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openFrontDoor(phone);
  await phone.locator('[data-source-id="rubiks-teacher"]').focus();
  await phone.waitForFunction(() => window.__sdForest.snapshot().selectedSourceId === "rubiks-teacher");
  await phone.screenshot({ path: path.join(outputDir, "SDFOREST_OVERWORLD_PROTOTYPE_MOBILE_2026-10-17.png"), fullPage: false, timeout: 15000 });
  await phone.close();

  const calm = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await calm.emulateMedia({ reducedMotion: "reduce" });
  await openFrontDoor(calm);
  const snapshot = await calm.evaluate(() => window.__sdForest.snapshot());
  assert.equal(snapshot.reducedMotion, true);
  assert.equal(snapshot.scene, "frontdoor");
  await calm.screenshot({ path: path.join(outputDir, "SDFOREST_OVERWORLD_PROTOTYPE_REDUCED_2026-10-17.png"), fullPage: false, timeout: 15000 });
  await calm.close();
});
