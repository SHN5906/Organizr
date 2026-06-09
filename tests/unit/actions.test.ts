import { beforeEach, describe, expect, it, vi } from "vitest";

// Obligatoire : revalidatePath crash hors contexte request Next.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { clients, missions, projets } from "@/lib/db/schema";
import { createClientAction } from "@/lib/actions/clients";
import { createProjetAction } from "@/lib/actions/projets";
import {
  createMissionAction,
  deleteMissionAction,
  updateMissionAction,
  updateMissionStatutAction,
} from "@/lib/actions/missions";
import { listClients } from "@/lib/data/clients";
import { createProjet, listProjets } from "@/lib/data/projets";
import { createMission, listMissions } from "@/lib/data/missions";
import { createClient } from "@/lib/data/clients";

const UUID = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff";

async function seedProjet() {
  const client = await createClient({ nom: "ACME", contact: null });
  return createProjet({
    clientId: client.id,
    type: "site_web",
    titre: "Site vitrine",
    description: null,
    statut: "a_faire",
    deadline: null,
  });
}

beforeEach(async () => {
  const db = await getDb();
  await db.delete(missions);
  await db.delete(projets);
  await db.delete(clients);
  vi.mocked(revalidatePath).mockClear();
});

describe("createClientAction", () => {
  it("rejette un input invalide avec fieldErrors, sans toucher la DB ni revalider", async () => {
    const r = await createClientAction({ nom: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.nom).toBeTruthy();
    expect(await listClients()).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("crée le client et revalide", async () => {
    const r = await createClientAction({ nom: "ACME", contact: "" });
    expect(r).toEqual({ ok: true });
    const all = await listClients();
    expect(all.map((c) => c.nom)).toEqual(["ACME"]);
    expect(revalidatePath).toHaveBeenCalled();
  });
});

describe("createProjetAction", () => {
  it("rejette un type inconnu", async () => {
    const r = await createProjetAction({ clientId: UUID, type: "podcast", titre: "X" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.type).toBeTruthy();
  });

  it("crée le projet", async () => {
    const client = await createClient({ nom: "ACME", contact: null });
    const r = await createProjetAction({
      clientId: client.id,
      type: "montage_video",
      titre: "Aftermovie",
      deadline: "2026-07-10",
    });
    expect(r).toEqual({ ok: true });
    const all = await listProjets();
    expect(all[0].titre).toBe("Aftermovie");
    expect(all[0].deadline).toBe("2026-07-10");
  });
});

describe("createMissionAction", () => {
  it("rejette un titre manquant", async () => {
    const projet = await seedProjet();
    const r = await createMissionAction({ projetId: projet.id, titre: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.titre).toBeTruthy();
  });

  it("crée la mission et revalide", async () => {
    const projet = await seedProjet();
    const r = await createMissionAction({
      projetId: projet.id,
      titre: "Derush",
      datePlanifiee: "2026-06-15",
    });
    expect(r).toEqual({ ok: true });
    const all = await listMissions({});
    expect(all[0].titre).toBe("Derush");
    expect(all[0].datePlanifiee).toBe("2026-06-15");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("retourne une erreur générique (pas de message DB brut) si le projet n'existe pas", async () => {
    const r = await createMissionAction({ projetId: UUID, titre: "Orpheline" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.toLowerCase()).not.toContain("constraint");
      expect(r.error.toLowerCase()).not.toContain("foreign");
      expect(r.error.toLowerCase()).not.toContain("sql");
    }
    expect(await listMissions({})).toHaveLength(0);
  });
});

describe("updateMissionAction / updateMissionStatutAction", () => {
  it("met à jour une mission existante", async () => {
    const projet = await seedProjet();
    const m = await createMission({ projetId: projet.id, titre: "Avant", statut: "a_faire", datePlanifiee: null, deadline: null, notes: null });
    const r = await updateMissionAction({
      id: m.id,
      projetId: projet.id,
      titre: "Après",
      statut: "en_cours",
      deadline: "2026-06-25",
    });
    expect(r).toEqual({ ok: true });
    const found = (await listMissions({})).find((x) => x.id === m.id)!;
    expect(found.titre).toBe("Après");
    expect(found.deadline).toBe("2026-06-25");
  });

  it("un update partiel ne réinitialise jamais statut/dates/notes", async () => {
    const projet = await seedProjet();
    const m = await createMission({
      projetId: projet.id,
      titre: "Mix audio",
      statut: "en_revue",
      datePlanifiee: "2026-06-18",
      deadline: "2026-06-22",
      notes: "v2 client",
    });
    const r = await updateMissionAction({ id: m.id, titre: "Mix audio final" });
    expect(r).toEqual({ ok: true });
    const found = (await listMissions({})).find((x) => x.id === m.id)!;
    expect(found.titre).toBe("Mix audio final");
    expect(found.statut).toBe("en_revue");
    expect(found.datePlanifiee).toBe("2026-06-18");
    expect(found.deadline).toBe("2026-06-22");
    expect(found.notes).toBe("v2 client");
  });

  it("échoue proprement sur une mission inexistante", async () => {
    const projet = await seedProjet();
    const r = await updateMissionAction({ id: UUID, projetId: projet.id, titre: "X" });
    expect(r.ok).toBe(false);
  });

  it("change le statut seul", async () => {
    const projet = await seedProjet();
    const m = await createMission({ projetId: projet.id, titre: "M", statut: "a_faire", datePlanifiee: null, deadline: null, notes: null });
    const r = await updateMissionStatutAction({ id: m.id, statut: "termine" });
    expect(r).toEqual({ ok: true });
    expect((await listMissions({}))[0].statut).toBe("termine");
  });

  it("rejette un statut inconnu", async () => {
    const r = await updateMissionStatutAction({ id: UUID, statut: "fini" });
    expect(r.ok).toBe(false);
  });
});

describe("deleteMissionAction", () => {
  it("supprime et revalide", async () => {
    const projet = await seedProjet();
    const m = await createMission({ projetId: projet.id, titre: "Tmp", statut: "a_faire", datePlanifiee: null, deadline: null, notes: null });
    const r = await deleteMissionAction({ id: m.id });
    expect(r).toEqual({ ok: true });
    expect(await listMissions({})).toHaveLength(0);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("rejette un id non uuid", async () => {
    const r = await deleteMissionAction({ id: "42" });
    expect(r.ok).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
