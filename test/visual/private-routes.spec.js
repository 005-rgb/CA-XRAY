const { test, expect } = require("@playwright/test");

const privateRoutes = [
  ["dashboard", "/dashboard"],
  ["new-scan", "/dashboard/new-scan"],
  ["history", "/dashboard/history"],
  ["passport", "/dashboard/passport"],
  ["watchtower", "/dashboard/watchtower"],
  ["compare", "/dashboard/compare"],
  ["reports", "/dashboard/reports"],
  ["api-access", "/dashboard/api-access"],
  ["community", "/dashboard/community"],
  ["settings", "/dashboard/settings"],
];

test.describe("private workspace dark mode", () => {
  test.describe.configure({ mode: "serial" });

  let context;

  test.beforeAll(async ({ browser, request }) => {
    const email = `visual-${process.pid}@example.com`;
    const response = await request.post("/api/auth/register", {
      data: { email, password: "visual test password 123" },
    });
    expect(response.status(), await response.text()).toBe(201);
    context = await browser.newContext({
      colorScheme: "dark",
      locale: "en-US",
      reducedMotion: "reduce",
      storageState: await request.storageState(),
    });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  for (const [name, route] of privateRoutes) {
    test(`matches ${name} dark-mode baseline`, async () => {
      const page = await context.newPage();
      try {
        await page.goto(`${route}?theme=dark`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => !document.body.classList.contains("app-booting"));
        await page.evaluate(async () => {
          await document.fonts?.ready;
          document.querySelectorAll("input").forEach((input) => input.blur());
        });
        await expect(page).toHaveScreenshot(`${name}.png`, {
          fullPage: true,
          animations: "disabled",
          caret: "hide",
          scale: "css",
          maxDiffPixelRatio: 0.006,
          maxDiffPixels: 2500,
        });
      } finally {
        await page.close();
      }
    });
  }
});