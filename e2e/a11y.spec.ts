import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Scan AA automatisé : 0 violation serious/critical exigée (exit criterion P5).
// La base e2e démarre vide : ces scans couvrent les états vides ; le parcours
// peuplé est re-scanné à la fin de mission-calendar.spec.ts.
for (const path of ["/", "/dashboard", "/projets"]) {
  test(`axe — ${path} sans violation serious/critical`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(
      blocking.map((v) => `${v.id}: ${v.description}`),
    ).toEqual([]);
  });
}
