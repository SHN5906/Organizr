import { describe, expect, it } from "vitest";
import { parseDashboardParams } from "@/lib/search-params";

const UUID = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff";

describe("parseDashboardParams", () => {
  it("retourne le tri par défaut sur des params vides", () => {
    expect(parseDashboardParams({})).toEqual({ sort: "deadline_asc" });
  });

  it("conserve type, statut et clientId valides", () => {
    expect(
      parseDashboardParams({ type: "site_web", statut: "en_cours", client: UUID }),
    ).toEqual({
      type: "site_web",
      statut: "en_cours",
      clientId: UUID,
      sort: "deadline_asc",
    });
  });

  it("ignore les valeurs invalides sans casser le reste", () => {
    expect(
      parseDashboardParams({ type: "podcast", statut: "fini", client: "42", sort: "nope" }),
    ).toEqual({ sort: "deadline_asc" });
  });

  it("accepte le tri descendant", () => {
    expect(parseDashboardParams({ sort: "deadline_desc" }).sort).toBe("deadline_desc");
  });

  it("prend la première valeur quand le param est répété", () => {
    expect(parseDashboardParams({ statut: ["termine", "a_faire"] }).statut).toBe("termine");
  });
});
