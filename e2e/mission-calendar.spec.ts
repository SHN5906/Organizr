import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { addMonths, format } from "date-fns";
import { fr } from "date-fns/locale";

// Parcours critique : créer une mission → elle apparaît au bon jour du
// calendrier. La base est TOUJOURS vide au départ (wipe dans la commande
// webServer) : le chemin client → projet → mission est déterministe.

// Jours cibles : 15 et 20 du mois COURANT — visibles dans le date-picker
// sans navigation (il s'ouvre sur le mois courant) et dans la grille par
// défaut, quel que soit le jour d'exécution.
const now = new Date();
const day15 = new Date(now.getFullYear(), now.getMonth(), 15);
const day20 = new Date(now.getFullYear(), now.getMonth(), 20);
const target15 = format(day15, "yyyy-MM-dd");
const target20 = format(day20, "yyyy-MM-dd");
// aria-label react-day-picker (locale fr) : « lundi 15 juin 2026 »
const picker15 = format(day15, "EEEE d MMMM yyyy", { locale: fr });
const picker20 = format(day20, "EEEE d MMMM yyyy", { locale: fr });
const prevMonthParam = format(addMonths(now, -1), "yyyy-MM");

test("créer une mission → elle apparaît au bon jour du calendrier", async ({
  page,
}) => {
  // 1. Pas de projet : « n » propose de créer un projet d'abord.
  // (retry : le listener clavier n'existe qu'après hydratation)
  await page.goto("/");
  await expect(async () => {
    await page.keyboard.press("n");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  const quickAddVide = page.getByRole("dialog");
  await expect(quickAddVide).toContainText("Aucun projet");
  await quickAddVide.getByRole("link", { name: "Créer un projet" }).click();

  // 2. Créer le client (prérequis du projet).
  await expect(page).toHaveURL(/\/projets/);
  await page.getByRole("button", { name: "Créer un client" }).click();
  await page.getByLabel("Nom").fill("ACME Studio");
  await page.getByRole("button", { name: "Créer le client" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("ACME Studio")).toBeVisible();

  // 3. Créer le projet.
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page.getByLabel("Titre").fill("Refonte site vitrine");
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Refonte site vitrine")).toBeVisible();

  // 4. Mission en moins de 15 s : n → titre → dates → Entrée.
  await page.goto("/");
  const chrono = Date.now();
  await expect(async () => {
    await page.keyboard.press("n");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  // Les popovers Radix portent aussi role=dialog → scope par nom accessible.
  const dialog = page.getByRole("dialog", { name: "Nouvelle mission" });
  const titre = dialog.getByLabel("Titre");
  await expect(titre).toBeFocused();
  await titre.fill("Derush interview");
  // Le projet est présélectionné (le plus récent) — aucune action requise.
  await expect(dialog.getByLabel("Projet")).toHaveValue(/./);

  // Les popovers react-day-picker sont portalés hors du dialog, et l'ancien
  // popover reste monté pendant son animation de sortie → on scope sur celui
  // qui est OUVERT.
  const openPicker = page.locator(
    "[data-slot='popover-content'][data-state='open']",
  );
  await dialog.getByLabel("Planifiée le").click();
  await openPicker.getByRole("button", { name: picker15 }).click();
  await dialog.getByLabel("Deadline").click();
  await openPicker.getByRole("button", { name: picker20 }).click();
  await titre.press("Enter");
  await expect(dialog).toBeHidden();
  const elapsed = (Date.now() - chrono) / 1000;
  expect(elapsed).toBeLessThan(15);

  // 5. La mission apparaît aux bons jours : ● planifiée le 15, ○ deadline le 20.
  const cell = page.locator(`[data-date="${target15}"]`);
  await expect(cell).toContainText("Derush interview");
  await expect(cell.locator("[data-kind='mission_planifiee']")).toHaveCount(1);
  const deadlineCell = page.locator(`[data-date="${target20}"]`);
  await expect(deadlineCell).toContainText("Derush interview");
  await expect(
    deadlineCell.locator("[data-kind='deadline_mission']"),
  ).toHaveCount(1);

  // 6. Clic sur le jour → le détail liste la mission.
  await cell.getByRole("button").click();
  const detail = page.getByRole("dialog");
  await expect(detail).toContainText("Derush interview");
  await expect(detail).toContainText("Refonte site vitrine");
  await detail.getByRole("button", { name: "Fermer" }).click();
  await expect(detail).toBeHidden();

  // 7. Navigation ±1 mois.
  await page.getByRole("link", { name: "Mois précédent" }).click();
  await expect(page).toHaveURL(new RegExp(`month=${prevMonthParam}`));

  // 8. Elle apparaît aussi dans le dashboard.
  await page.goto("/dashboard");
  await expect(page.getByText("Derush interview")).toBeVisible();

  // 9. Scan a11y sur le calendrier peuplé.
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? ""),
  );
  expect(blocking.map((v) => `${v.id}: ${v.description}`)).toEqual([]);
});
