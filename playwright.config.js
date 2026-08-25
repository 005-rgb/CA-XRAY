const { defineConfig, devices } = require("@playwright/test");
const { chromium } = require("playwright");

module.exports = defineConfig({
  testDir: "./test/visual",
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  snapshotPathTemplate: "{testDir}/__snapshots__/{projectName}/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:5200",
    browserName: "chromium",
    colorScheme: "dark",
    locale: "en-US",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    launchOptions: { executablePath: chromium.executablePath() },
  },
  webServer: {
    command: "node server.js",
    port: 5200,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: "5200",
      NODE_ENV: "development",
      DATA_STORE_DRIVER: "memory",
      SCAN_QUEUE_DRIVER: "memory",
      SESSION_SECRET: "visual-test-session-secret-32-bytes-minimum",
    },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
});