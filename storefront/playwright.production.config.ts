import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e/tests",
  testMatch: "production-smoke.spec.ts",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [["line"], ["html", { open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL: "https://storefront-production-03a4.up.railway.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "production",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
