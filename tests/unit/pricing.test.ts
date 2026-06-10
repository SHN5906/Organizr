import { describe, expect, it } from "vitest";
import {
  isDegressif,
  centsToNumeric,
  formatCents,
  lineTotalCents,
  NBSP_EURO,
  PRESTATION_LABELS,
  TYPES_PRESTATION,
  TYPES_PRESTATION_AFFICHAGE,
  unitPriceCents,
} from "@/lib/pricing";

// Grille ReNew Editing 2025 TTC — Tableau Tarifaire Shorts (PDF fait foi).
// Prix unitaires en CENTIMES, indexés par quantité (1 → 30).
const UNITAIRES_SIMPLE = [
  3000, 2900, 2800, 2700, 2600, 2500, 2450, 2400, 2350, 2300, 2250, 2200,
  2150, 2100, 2050, 2000, 1975, 1950, 1925, 1900, 1875, 1850, 1825, 1800,
  1775, 1750, 1725, 1700, 1675, 1650,
];

// Totaux de contrôle lus directement dans le PDF (colonne « Prix total »).
// ERRATA PDF (la formule unitaire × quantité fait foi) :
// - ligne 23 : totaux imprimés 420,25 € / 650,25 € ; calcul : 419,75 / 649,75
// - ligne 29 complexe : total imprimé 776,75 € ; calcul : 26,75 × 29 = 775,75
const TOTAUX_PDF: Array<[number, number, number]> = [
  // [quantité, total simple (c), total complexe (c)]
  [1, 3000, 4000],
  [7, 17150, 24150],
  [9, 21150, 30150],
  [13, 27950, 40950],
  [15, 30750, 45750],
  [17, 33575, 50575],
  [23, 41975, 64975],
  [29, 48575, 77575],
  [30, 49500, 79500],
];

describe("unitPriceCents — grille PDF complète", () => {
  it("reel_simple : les 30 prix unitaires du PDF", () => {
    for (let q = 1; q <= 30; q++) {
      expect(unitPriceCents("reel_simple", q), `simple q=${q}`).toBe(
        UNITAIRES_SIMPLE[q - 1],
      );
    }
  });

  it("reel_complexe : simple + 10 € à toute quantité", () => {
    for (let q = 1; q <= 30; q++) {
      expect(unitPriceCents("reel_complexe", q), `complexe q=${q}`).toBe(
        UNITAIRES_SIMPLE[q - 1] + 1000,
      );
    }
  });

  it("video_longue : 70 €/u flat, aucune dégressivité", () => {
    for (const q of [1, 2, 10, 30, 50]) {
      expect(unitPriceCents("video_longue", q)).toBe(7000);
    }
  });

  it("video_essentiel : 15 €/u flat, aucune dégressivité", () => {
    for (const q of [1, 2, 10, 30, 50]) {
      expect(unitPriceCents("video_essentiel", q)).toBe(1500);
    }
    expect(lineTotalCents("video_essentiel", 4)).toBe(6000);
    expect(isDegressif("video_essentiel")).toBe(false);
    expect(isDegressif("reel_simple")).toBe(true);
    expect(isDegressif("video_longue")).toBe(false);
  });

  it("q > 30 : prix du palier 30", () => {
    for (const q of [31, 40, 50]) {
      expect(unitPriceCents("reel_simple", q)).toBe(1650);
      expect(unitPriceCents("reel_complexe", q)).toBe(2650);
    }
  });

  it("rejette les quantités hors [1, 50] ou non entières", () => {
    for (const q of [0, -1, 51, 2.5, NaN]) {
      expect(() => unitPriceCents("reel_simple", q), `q=${q}`).toThrow();
    }
  });
});

describe("lineTotalCents", () => {
  it("reproduit les totaux du PDF (simple et complexe)", () => {
    for (const [q, totalSimple, totalComplexe] of TOTAUX_PDF) {
      expect(lineTotalCents("reel_simple", q), `total simple q=${q}`).toBe(
        totalSimple,
      );
      expect(lineTotalCents("reel_complexe", q), `total complexe q=${q}`).toBe(
        totalComplexe,
      );
    }
  });

  it("3 reels simples = 84,00 € ; 1 vidéo longue = 70,00 €", () => {
    expect(lineTotalCents("reel_simple", 3)).toBe(8400);
    expect(lineTotalCents("video_longue", 1)).toBe(7000);
  });

  it("au-delà de 30 : unitaire du palier 30 × quantité", () => {
    expect(lineTotalCents("reel_simple", 50)).toBe(1650 * 50);
  });
});

describe("formatCents / centsToNumeric", () => {
  it("formate en euros FR avec espace insécable", () => {
    expect(formatCents(8400)).toBe(`84,00${NBSP_EURO}`);
    expect(formatCents(17150)).toBe(`171,50${NBSP_EURO}`);
    expect(formatCents(15400)).toBe(`154,00${NBSP_EURO}`);
    expect(NBSP_EURO).toBe(" €");
  });

  it("convertit en numeric SQL", () => {
    expect(centsToNumeric(8400)).toBe("84.00");
    expect(centsToNumeric(17150)).toBe("171.50");
    expect(centsToNumeric(5)).toBe("0.05");
  });
});

describe("catalogue", () => {
  it("expose les 4 prestations avec leurs labels FR", () => {
    // video_essentiel est AJOUTÉ EN FIN : l'ordre du tableau est l'ordre de
    // l'enum Postgres (ALTER TYPE ADD VALUE).
    expect(TYPES_PRESTATION).toEqual([
      "reel_simple",
      "reel_complexe",
      "video_longue",
      "video_essentiel",
    ]);
    expect(PRESTATION_LABELS.reel_simple).toMatch(/simple/i);
    expect(PRESTATION_LABELS.reel_complexe).toMatch(/complexe/i);
    expect(PRESTATION_LABELS.video_longue).toMatch(/longue/i);
    // Accord : « Vidéo essentielle » (comme « Vidéo longue »).
    expect(PRESTATION_LABELS.video_essentiel).toMatch(/essentielle/i);
  });

  it("ordre d'AFFICHAGE découplé de l'ordre de l'enum Postgres", () => {
    // Même contenu (permutation), mais la vidéo essentielle est présentée
    // avant la vidéo longue dans le catalogue et le select.
    expect([...TYPES_PRESTATION_AFFICHAGE].sort()).toEqual(
      [...TYPES_PRESTATION].sort(),
    );
    expect(
      TYPES_PRESTATION_AFFICHAGE.indexOf("video_essentiel"),
    ).toBeLessThan(TYPES_PRESTATION_AFFICHAGE.indexOf("video_longue"));
  });
});
