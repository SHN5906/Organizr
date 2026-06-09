import { defineConfig, devices } from "@playwright/test";

// E2E runs against a production build backed by a throwaway PGlite database
// (.pglite-e2e, wiped in global-setup) so no external Postgres is needed.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start -p 3100",
    url: "http://localhost:3100",
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "",
      PGLITE_DIR: ".pglite-e2e",
    },
  },
});
