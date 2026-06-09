import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  groupCalendarItems,
  monthGridInterval,
  monthParamOf,
  parseMonthParam,
} from "@/lib/calendar";
import type { CalendarItem } from "@/lib/data/missions";

// Référence stable : juin 2026 commence un lundi, le 9 est un mardi.
const TODAY = new Date(2026, 5, 9);

describe("parseMonthParam", () => {
  it("parse YYYY-MM vers le premier jour du mois", () => {
    const d = parseMonthParam("2026-06", TODAY);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 1]);
  });

  it("retombe sur le mois courant si absent ou invalide", () => {
    for (const v of [undefined, "abc", "2026-13", "2026", "06-2026", ""]) {
      const d = parseMonthParam(v, TODAY);
      expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 1]);
    }
  });

  it("accepte un autre mois valide", () => {
    const d = parseMonthParam("2027-02", TODAY);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 1, 1]);
  });
});

describe("monthParamOf", () => {
  it("formate en YYYY-MM", () => {
    expect(monthParamOf(new Date(2026, 5, 15))).toBe("2026-06");
    expect(monthParamOf(new Date(2027, 0, 1))).toBe("2027-01");
  });
});

describe("buildMonthGrid", () => {
  it("juin 2026 : 5 semaines de 7 jours, lundi → dimanche", () => {
    const grid = buildMonthGrid(new Date(2026, 5, 1), TODAY);
    expect(grid).toHaveLength(5);
    for (const week of grid) expect(week).toHaveLength(7);
    expect(grid[0][0].date).toBe("2026-06-01");
    expect(grid[4][6].date).toBe("2026-07-05");
  });

  it("marque les jours hors mois et aujourd'hui", () => {
    const grid = buildMonthGrid(new Date(2026, 5, 1), TODAY);
    const flat = grid.flat();
    const july5 = flat.find((d) => d.date === "2026-07-05")!;
    expect(july5.inMonth).toBe(false);
    const june9 = flat.find((d) => d.date === "2026-06-09")!;
    expect(june9.inMonth).toBe(true);
    expect(june9.isToday).toBe(true);
    expect(flat.filter((d) => d.isToday)).toHaveLength(1);
    expect(june9.dayOfMonth).toBe(9);
  });

  it("février 2027 : exactement 4 semaines, aucun jour hors mois", () => {
    const grid = buildMonthGrid(new Date(2027, 1, 1), TODAY);
    expect(grid).toHaveLength(4);
    expect(grid.flat().every((d) => d.inMonth)).toBe(true);
    expect(grid.flat().some((d) => d.isToday)).toBe(false);
  });

  it("mai 2026 : la grille commence le lundi 27 avril", () => {
    const grid = buildMonthGrid(new Date(2026, 4, 1), TODAY);
    expect(grid[0][0].date).toBe("2026-04-27");
    expect(grid[0][0].inMonth).toBe(false);
    expect(grid.at(-1)![6].date).toBe("2026-05-31");
  });
});

describe("monthGridInterval", () => {
  it("retourne les bornes de la GRILLE, pas du mois", () => {
    expect(monthGridInterval(new Date(2026, 4, 1))).toEqual({
      start: "2026-04-27",
      end: "2026-05-31",
    });
    expect(monthGridInterval(new Date(2026, 5, 1))).toEqual({
      start: "2026-06-01",
      end: "2026-07-05",
    });
  });
});

describe("groupCalendarItems", () => {
  const item = (kind: CalendarItem["kind"], date: string, titre: string): CalendarItem => ({
    kind,
    date,
    titre,
    projetId: "p1",
    statut: "a_faire",
    clientNom: "ACME",
    projetTitre: "Site",
    ...(kind !== "deadline_projet" ? { missionId: "m1" } : {}),
  });

  it("groupe par jour avec les missions planifiées avant les deadlines", () => {
    const grouped = groupCalendarItems([
      item("deadline_projet", "2026-06-09", "Site"),
      item("mission_planifiee", "2026-06-09", "Derush"),
      item("deadline_mission", "2026-06-09", "Export"),
      item("mission_planifiee", "2026-06-10", "Mix"),
    ]);
    expect(grouped["2026-06-09"].map((i) => i.kind)).toEqual([
      "mission_planifiee",
      "deadline_mission",
      "deadline_projet",
    ]);
    expect(grouped["2026-06-10"].map((i) => i.titre)).toEqual(["Mix"]);
    expect(grouped["2026-06-11"]).toBeUndefined();
  });
});
