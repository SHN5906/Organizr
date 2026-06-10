import { describe, expect, it } from "vitest";
import { dayInZone, formatInstantDayFr } from "@/lib/format";

describe("dayInZone", () => {
  it("convertit un instant UTC vers le jour civil du fuseau", () => {
    // 23h30 UTC un 9 juin = 10 juin à Paris (UTC+2 en été)
    const instant = new Date(Date.UTC(2026, 5, 9, 23, 30));
    const paris = dayInZone(instant, "Europe/Paris");
    expect([paris.getFullYear(), paris.getMonth(), paris.getDate()]).toEqual([
      2026, 5, 10,
    ]);
  });

  it("reste sur le même jour quand le fuseau est derrière", () => {
    const instant = new Date(Date.UTC(2026, 5, 9, 23, 30));
    const la = dayInZone(instant, "America/Los_Angeles"); // UTC-7 → 16h30 le 9
    expect([la.getFullYear(), la.getMonth(), la.getDate()]).toEqual([
      2026, 5, 9,
    ]);
  });
});

describe("formatInstantDayFr", () => {
  it("affiche le jour civil de Paris, pas le jour UTC", () => {
    // 23h30 UTC le 9 juin = 10 juin à Paris : la date affichée doit suivre
    // le même fuseau que le regroupement par mois (periodeOf).
    const instant = new Date(Date.UTC(2026, 5, 9, 23, 30));
    expect(formatInstantDayFr(instant)).toBe("10 juin 2026");
  });
});
