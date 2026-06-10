import { expect, test as setup } from "@playwright/test";

const OWNER_PASSWORD = "e2e-owner-pass"; // valeur de TEST (webServer env), assumée en clair

setup("login owner → storageState", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Mot de passe").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.context().storageState({ path: "e2e/.auth/owner.json" });
});
