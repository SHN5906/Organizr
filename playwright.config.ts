import { defineConfig, devices } from "@playwright/test";

// E2E contre un build de prod sur PGlite jetable (wipe dans la commande
// webServer — globalSetup s'exécuterait APRÈS le démarrage du serveur).
// DATABASE_URL est forcé à "" pour ne JAMAIS toucher Neon.
// Secrets : valeurs de TEST assumées en clair (jamais réutilisées ailleurs).
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
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Session owner par défaut ; les tests anonymes la vident via
        // test.use({ storageState: { cookies: [], origins: [] } }).
        storageState: "e2e/.auth/owner.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: "rm -rf .pglite-e2e && pnpm build && pnpm start -p 3100",
    url: "http://localhost:3100",
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "",
      PGLITE_DATA_DIR: ".pglite-e2e",
      OWNER_PASSWORD: "e2e-owner-pass",
      SESSION_SECRET: "e2e-session-secret-32chars-min!",
    },
  },
});
