import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Contexte ANONYME : on vide le storageState owner du projet chromium.
test.use({ storageState: { cookies: [], origins: [] } });

test("anonyme : les pages internes redirigent vers /connexion", async ({
  page,
}) => {
  for (const path of ["/dashboard", "/", "/projets"]) {
    await page.goto(path);
    await page.waitForURL("**/connexion");
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
  }
});

test("anonyme : /espace redirige vers /espace/connexion", async ({ page }) => {
  await page.goto("/espace");
  await page.waitForURL("**/espace/connexion");
  await expect(page.getByText(/lien d'accès personnel/i)).toBeVisible();
});

test("mauvais mot de passe → erreur, pas d'accès", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Mot de passe").fill("mauvais-mdp");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Mot de passe incorrect")).toBeVisible();
  await page.goto("/dashboard");
  await page.waitForURL("**/connexion");
});

test("axe — /connexion et /espace/connexion sans violation serious/critical", async ({
  page,
}) => {
  for (const path of ["/connexion", "/espace/connexion"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(blocking.map((v) => `${v.id}: ${v.description}`)).toEqual([]);
  }
});
