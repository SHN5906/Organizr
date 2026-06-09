import { describe, expect, it } from "vitest";
import { clientCreateSchema } from "@/lib/validation/clients";
import { projetCreateSchema } from "@/lib/validation/projets";
import {
  missionCreateSchema,
  missionStatutSchema,
  missionUpdateSchema,
} from "@/lib/validation/missions";
import { STATUTS, STATUT_LABELS, TYPES_PROJET, TYPE_LABELS } from "@/lib/validation/labels";

const UUID = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff";

describe("clientCreateSchema", () => {
  it("accepte un nom simple", () => {
    const r = clientCreateSchema.parse({ nom: "ACME Studio" });
    expect(r).toEqual({ nom: "ACME Studio", contact: null });
  });

  it("rejette un nom vide", () => {
    expect(clientCreateSchema.safeParse({ nom: "" }).success).toBe(false);
  });

  it("trim le nom et convertit contact vide en null", () => {
    const r = clientCreateSchema.parse({ nom: "  ACME  ", contact: "" });
    expect(r.nom).toBe("ACME");
    expect(r.contact).toBeNull();
  });
});

describe("projetCreateSchema", () => {
  const base = { clientId: UUID, type: "montage_video", titre: "Aftermovie" };

  it("accepte un projet minimal et applique le statut par défaut", () => {
    const r = projetCreateSchema.parse(base);
    expect(r.statut).toBe("a_faire");
    expect(r.description).toBeNull();
    expect(r.deadline).toBeNull();
  });

  it("rejette un type inconnu", () => {
    expect(projetCreateSchema.safeParse({ ...base, type: "podcast" }).success).toBe(false);
  });

  it("rejette un clientId non uuid", () => {
    expect(projetCreateSchema.safeParse({ ...base, clientId: "42" }).success).toBe(false);
  });

  it("accepte une deadline YYYY-MM-DD et rejette une date invalide", () => {
    expect(projetCreateSchema.parse({ ...base, deadline: "2026-07-01" }).deadline).toBe("2026-07-01");
    expect(projetCreateSchema.safeParse({ ...base, deadline: "2026-13-45" }).success).toBe(false);
    expect(projetCreateSchema.safeParse({ ...base, deadline: "01/07/2026" }).success).toBe(false);
  });

  it("convertit deadline vide en null", () => {
    expect(projetCreateSchema.parse({ ...base, deadline: "" }).deadline).toBeNull();
  });
});

describe("missionCreateSchema", () => {
  const base = { projetId: UUID, titre: "Derush interview" };

  it("accepte une mission minimale (statut par défaut a_faire)", () => {
    const r = missionCreateSchema.parse(base);
    expect(r.statut).toBe("a_faire");
    expect(r.datePlanifiee).toBeNull();
    expect(r.deadline).toBeNull();
    expect(r.notes).toBeNull();
  });

  it("rejette un titre vide", () => {
    expect(missionCreateSchema.safeParse({ ...base, titre: "  " }).success).toBe(false);
  });

  it("accepte datePlanifiee et deadline en YYYY-MM-DD", () => {
    const r = missionCreateSchema.parse({
      ...base,
      datePlanifiee: "2026-06-15",
      deadline: "2026-06-20",
    });
    expect(r.datePlanifiee).toBe("2026-06-15");
    expect(r.deadline).toBe("2026-06-20");
  });

  it("rejette un statut inconnu", () => {
    expect(missionCreateSchema.safeParse({ ...base, statut: "bloque" }).success).toBe(false);
  });
});

describe("missionUpdateSchema (sémantique PATCH)", () => {
  it("exige un id uuid", () => {
    expect(missionUpdateSchema.safeParse({ titre: "X", projetId: UUID }).success).toBe(false);
    expect(
      missionUpdateSchema.parse({ id: UUID, projetId: UUID, titre: "X" }).id,
    ).toBe(UUID);
  });

  it("laisse les clés absentes indéfinies — jamais de reset implicite", () => {
    const r = missionUpdateSchema.parse({ id: UUID, titre: "X" });
    expect(r.statut).toBeUndefined();
    expect(r.datePlanifiee).toBeUndefined();
    expect(r.deadline).toBeUndefined();
    expect(r.notes).toBeUndefined();
    expect("statut" in r && r.statut !== undefined).toBe(false);
  });

  it("efface explicitement avec null ou chaîne vide", () => {
    const r = missionUpdateSchema.parse({ id: UUID, deadline: "", notes: null });
    expect(r.deadline).toBeNull();
    expect(r.notes).toBeNull();
  });

  it("rejette toujours une date invalide", () => {
    expect(missionUpdateSchema.safeParse({ id: UUID, deadline: "13/01/2026" }).success).toBe(false);
  });

  it("rejette un titre vide explicite (le titre n'est pas effaçable)", () => {
    expect(missionUpdateSchema.safeParse({ id: UUID, titre: "" }).success).toBe(false);
  });
});

describe("missionStatutSchema", () => {
  it("valide id + statut", () => {
    expect(missionStatutSchema.parse({ id: UUID, statut: "en_cours" }).statut).toBe("en_cours");
    expect(missionStatutSchema.safeParse({ id: UUID, statut: "fini" }).success).toBe(false);
  });
});

describe("labels FR", () => {
  it("couvre tous les statuts", () => {
    expect(STATUTS).toEqual(["a_faire", "en_cours", "en_revue", "termine"]);
    for (const s of STATUTS) expect(STATUT_LABELS[s]).toBeTruthy();
    expect(STATUT_LABELS.a_faire).toBe("À faire");
  });

  it("couvre tous les types de projet", () => {
    expect(TYPES_PROJET).toEqual(["montage_video", "site_web"]);
    for (const t of TYPES_PROJET) expect(TYPE_LABELS[t]).toBeTruthy();
    expect(TYPE_LABELS.montage_video).toBe("Montage vidéo");
  });
});
