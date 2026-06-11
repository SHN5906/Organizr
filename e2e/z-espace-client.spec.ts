import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const moisCourantLabel = format(new Date(), "LLLL yyyy", { locale: fr });

// Nommé z-* : tourne APRÈS les specs v1 qui supposent une base vierge
// (ordre alphabétique, workers: 1). Le contexte par défaut est OWNER
// (storageState du projet chromium) ; les contextes client/anonyme sont
// créés à la main.

const EMPTY = { cookies: [], origins: [] };

async function inviteClient(page: Page, nom: string): Promise<string> {
  await page.goto("/projets");
  await page.getByRole("button", { name: "Nouveau client" }).click();
  await page.getByLabel("Nom").fill(nom);
  await page.getByRole("button", { name: "Créer le client" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: `Inviter ${nom}` }).click();
  await page.getByRole("button", { name: "Générer un lien d'accès" }).click();
  const input = page.getByLabel("Lien d'accès à copier");
  await expect(input).toBeVisible();
  const url = await input.inputValue();
  await page.getByRole("button", { name: "Fermer" }).click();
  return url;
}

async function loginClient(context: BrowserContext, url: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(url);
  await page.getByRole("button", { name: "Accéder à mon espace" }).click();
  await page.waitForURL("**/espace");
  return page;
}

test("commande client → missions chez l'owner → facture 154,00 €", async ({
  page,
  browser,
}) => {
  // 1. Owner : créer Client A et générer son lien d'accès.
  const lienA = await inviteClient(page, "Client A");
  expect(lienA).toMatch(/\/espace\/connexion\?token=/);

  // 2. Client A (contexte vierge) : lien magique → espace.
  const ctxA = await browser.newContext({ storageState: EMPTY });
  const pageA = await loginClient(ctxA, lienA);
  await expect(pageA.getByText("Client A")).toBeVisible();
  await expect(pageA.getByText(/aucune commande/i)).toBeVisible();

  // 3. Commander 3 reels simples (84,00 €) + 1 vidéo longue (70,00 €).
  const ligne1 = pageA.getByRole("group", { name: "Ligne 1" });
  const qte = ligne1.getByLabel("Quantité");
  await qte.fill("3");
  await expect(ligne1.getByText("84,00 €")).toBeVisible();
  await ligne1.getByLabel(/brief/i).fill("3 reels événement");

  await pageA.getByRole("button", { name: "Ajouter une ligne" }).click();
  const ligne2 = pageA.getByRole("group", { name: "Ligne 2" });
  await ligne2.getByLabel("Prestation").selectOption("video_longue");
  await expect(
    pageA.getByText("Total TTC").locator(".."),
  ).toContainText("154,00 €");

  // Catalogue : la vidéo essentielle (15 €, tarif unique) est proposée,
  // dans la grille tarifaire ET dans le select de prestation.
  const tarifEssentielle = pageA
    .locator("li")
    .filter({ hasText: "Montage essentiel" });
  await expect(tarifEssentielle.getByText("15,00 €")).toBeVisible();
  await expect(tarifEssentielle.getByText("tarif unique")).toBeVisible();
  await expect(
    ligne2.getByLabel("Prestation").locator("option", {
      hasText: "Vidéo essentiel",
    }),
  ).toHaveCount(1);

  // Fichiers : liens SwissTransfer titrés + brief PDF.
  await pageA.getByRole("button", { name: "Ajouter un lien" }).click();
  const lienGroupe = pageA.getByRole("group", { name: "Lien 1" });
  await lienGroupe.getByLabel("Titre du lien").fill("Rushs jour 1");
  await lienGroupe
    .getByLabel("URL")
    .fill("https://www.swisstransfer.com/d/e2e-rushs");
  await pageA.getByLabel("Brief PDF").setInputFiles({
    name: "brief-e2e.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"),
  });
  await expect(pageA.getByText("brief-e2e.pdf")).toBeVisible();

  // Tip de 6 € → total 160,00 €.
  await pageA.getByLabel(/tip/i).fill("6");
  await expect(
    pageA.getByText("Total TTC").locator(".."),
  ).toContainText("160,00 €");

  await pageA.getByRole("button", { name: "Ajouter à ce mois" }).click();
  await expect(pageA.getByText(/commande #1 ajoutée à/i)).toBeVisible();
  await expect(pageA.getByText(/3 × Reel — montage simple/)).toBeVisible();
  // Historique groupé par mois, avec sous-total et lien titré.
  await expect(
    pageA.getByRole("heading", { name: moisCourantLabel, exact: true }),
  ).toBeVisible();
  await expect(pageA.getByText("1 commande · 160,00 €")).toBeVisible();
  await expect(
    pageA.getByRole("link", { name: "Rushs jour 1" }),
  ).toBeVisible();

  // 4. Owner : les 4 missions de la commande sont au dashboard.
  // (la base n'est pas vierge ici : les specs v1 ont déjà créé des données)
  await page.goto("/dashboard");
  for (const titre of [
    "Reel — montage simple 1/3 — Commande #1",
    "Reel — montage simple 2/3 — Commande #1",
    "Reel — montage simple 3/3 — Commande #1",
    "Vidéo longue 1/1 — Commande #1",
  ]) {
    await expect(page.getByText(titre)).toBeVisible();
  }

  // 4b. Les fichiers sont visibles côté Projets (commande → projet).
  await page.goto("/projets");
  await expect(
    page.getByRole("link", { name: "Rushs jour 1" }),
  ).toHaveAttribute("href", "https://www.swisstransfer.com/d/e2e-rushs");
  await expect(page.getByRole("link", { name: /Brief PDF/ })).toBeVisible();

  // 5. Owner : générer la facture du mois → 154,00 €.
  await page.goto("/facturation");
  await expect(page.getByText("Commande #1")).toBeVisible();

  // Les fichiers du client sont là : lien rushs titré + brief téléchargeable.
  await expect(
    page.getByRole("link", { name: "Rushs jour 1" }),
  ).toHaveAttribute("href", "https://www.swisstransfer.com/d/e2e-rushs");
  const briefLink = page.getByRole("link", { name: /Brief PDF/ });
  const briefHref = await briefLink.getAttribute("href");
  const briefResponse = await page.request.get(briefHref!);
  expect(briefResponse.status()).toBe(200);
  expect(briefResponse.headers()["content-type"]).toBe("application/pdf");
  expect((await briefResponse.body()).toString()).toContain("%PDF-1.4");
  await page.getByRole("button", { name: "Générer la facture" }).click();
  await page.waitForURL("**/facturation/**");
  await expect(page.getByText(/FAC-\d{4}-\d{2}-001/)).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Total TTC" }),
  ).toBeVisible();
  // 154,00 € de prestations + 6,00 € de tip (ligne dédiée).
  await expect(page.locator("article").getByText("Tip")).toBeVisible();
  await expect(
    page.locator("article").getByText("160,00 €"),
  ).toBeVisible();

  // 5b. Corbeille : régénérer (révision 2) puis supprimer la révision 1.
  await page.goto("/facturation");
  await page
    .getByRole("button", { name: /Régénérer \(révision 2\)/ })
    .click();
  await page.waitForURL("**/facturation/**");
  await page.goto("/facturation");
  await expect(page.getByText("(remplacée)")).toBeVisible();
  await page
    .getByRole("button", { name: /Supprimer FAC-\d{4}-\d{2}-001/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("link", { name: /FAC-\d{4}-\d{2}-001/ }),
  ).toBeHidden();
  await expect(page.getByText("(remplacée)")).toBeHidden();
  await expect(
    page.getByRole("link", { name: /FAC-\d{4}-\d{2}-002/ }),
  ).toBeVisible();

  // 6. Isolation : Client B ne voit rien de Client A.
  const lienB = await inviteClient(page, "Client B");
  const ctxB = await browser.newContext({ storageState: EMPTY });
  const pageB = await loginClient(ctxB, lienB);
  await expect(pageB.getByText("Client B")).toBeVisible();
  await expect(pageB.getByText(/aucune commande/i)).toBeVisible();
  await expect(pageB.getByText("Commande #1")).toBeHidden();
  // B ne peut pas télécharger le brief de A (404 indistinct).
  const vol = await pageB.request.get(briefHref!);
  expect(vol.status()).toBe(404);

  // 7. Un client connecté n'accède PAS à l'interne.
  await pageA.goto("/dashboard");
  await pageA.waitForURL("**/connexion");

  // 8. Révocation : la session existante de B est coupée immédiatement.
  await page.goto("/projets");
  await page.getByRole("button", { name: "Inviter Client B" }).click();
  await page.getByRole("button", { name: "Révoquer" }).click();
  await page.getByRole("button", { name: "Fermer" }).click();
  await pageB.goto("/espace");
  await pageB.waitForURL("**/espace/connexion");

  // 9. Axe sur le portail peuplé et la facture.
  for (const target of [pageA, page]) {
    await target.waitForLoadState("networkidle");
  }
  await pageA.goto(lienA);
  const axePortail = await new AxeBuilder({ page: pageA }).analyze();
  expect(
    axePortail.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  const axeFacture = await new AxeBuilder({ page }).analyze();
  expect(
    axeFacture.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);

  await ctxA.close();
  await ctxB.close();
});
