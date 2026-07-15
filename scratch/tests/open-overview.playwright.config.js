const path = require("node:path");
const { defineConfig, devices } = require("playwright/test");

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "open-overview.browser.spec.js",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4174", trace: "retain-on-failure" },
  webServer: { command: "node open-overview-static-server.mjs ../../vercel-public 4174", cwd: __dirname, url: "http://127.0.0.1:4174/web/open-overview/index.html", reuseExistingServer: false, timeout: 15_000 },
  projects: [{
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      launchOptions: {
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      }
    }
  }],
  outputDir: path.join(__dirname, ".open-overview-results")
});
