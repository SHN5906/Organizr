import { describe, expect, it } from "vitest";
import { dayInZone } from "@/lib/format";

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
