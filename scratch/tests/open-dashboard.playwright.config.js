const path = require("node:path");
const { defineConfig, devices } = require("playwright/test");

const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome";

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "open-dashboard.browser.spec.js",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4174", trace: "retain-on-failure" },
  webServer: { command: "node open-dashboard-static-server.mjs ../../vercel-public 4174", cwd: __dirname, url: "http://127.0.0.1:4174/web/open-dashboard/index.html", reuseExistingServer: true, timeout: 15_000 },
  projects: [{
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      launchOptions: chromiumExecutable
        ? { executablePath: chromiumExecutable }
        : { channel: browserChannel }
    }
  }],
  outputDir: path.join(__dirname, ".open-dashboard-results")
});
