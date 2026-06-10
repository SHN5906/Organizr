import { describe, expect, it } from "vitest";
import { addPeriode, parsePeriodeParam } from "@/lib/format";

const TODAY = new Date(2026, 5, 10); // 10 juin 2026

describe("parsePeriodeParam", () => {
  it("accepte une période valide", () => {
    expect(parsePeriodeParam("2026-03", TODAY)).toBe("2026-03");
  });

  it("retombe sur la période du jour si absent ou invalide", () => {
    for (const v of [undefined, "", "abc", "2026-13", "2026-0", ["x"]]) {
      expect(parsePeriodeParam(v as string | string[] | undefined, TODAY)).toBe(
        "2026-06",
      );
    }
    expect(parsePeriodeParam(["2026-02", "2026-03"], TODAY)).toBe("2026-02");
  });
});

describe("addPeriode", () => {
  it("navigue entre les mois avec passage d'année", () => {
    expect(addPeriode("2026-06", 1)).toBe("2026-07");
    expect(addPeriode("2026-06", -1)).toBe("2026-05");
    expect(addPeriode("2026-12", 1)).toBe("2027-01");
    expect(addPeriode("2026-01", -1)).toBe("2025-12");
  });
});
