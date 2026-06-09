import { defineConfig, devices } from "@playwright/test";

// E2E runs against a production build backed by a throwaway PGlite database.
// The wipe of .pglite-e2e lives in the webServer command (NOT in globalSetup,
// which Playwright runs only AFTER the web server is already up).
// DATABASE_URL is forced to "" so a Neon URL in .env.local can never leak into
// e2e runs — lib/db treats blank as absent and falls back to PGlite.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "rm -rf .pglite-e2e && pnpm build && pnpm start -p 3100",
    url: "http://localhost:3100",
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "",
      PGLITE_DATA_DIR: ".pglite-e2e",
    },
  },
});
