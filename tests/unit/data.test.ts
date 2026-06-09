import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { clients, missions, projets } from "@/lib/db/schema";
import { createClient, listClients } from "@/lib/data/clients";
import { createProjet, listProjets } from "@/lib/data/projets";
import {
  createMission,
  deleteMission,
  getCalendarItems,
  listMissions,
  updateMission,
  updateMissionStatut,
} from "@/lib/data/missions";

// PGLITE_DATA_DIR=memory:// (vitest unit env) — fresh in-memory db per reset.

async function seed() {
  const acme = await createClient({ nom: "ACME", contact: null });
  const zenith = await createClient({ nom: "Zénith Prod", contact: "contact@zenith.fr" });
  const site = await createProjet({
    clientId: acme.id,
    type: "site_web",
    titre: "Site vitrine",
    description: null,
    statut: "en_cours",
    deadline: "2026-06-30",
  });
  const film = await createProjet({
    clientId: zenith.id,
    type: "montage_video",
    titre: "Aftermovie festival",
    description: null,
    statut: "a_faire",
    deadline: null,
  });
  return { acme, zenith, site, film };
}

beforeEach(async () => {
  const db = await getDb();
  await db.delete(missions);
  await db.delete(projets);
  await db.delete(clients);
});

describe("clients", () => {
  it("crée puis liste les clients triés par nom", async () => {
    await createClient({ nom: "Zoo", contact: null });
    await createClient({ nom: "Alpha", contact: "a@a.fr" });
    const all = await listClients();
    expect(all.map((c) => c.nom)).toEqual(["Alpha", "Zoo"]);
    expect(all[0].id).toMatch(/[0-9a-f-]{36}/);
    expect(all[0].contact).toBe("a@a.fr");
  });
});

describe("projets", () => {
  it("crée un projet avec shareToken null et le liste avec son client", async () => {
    const { site } = await seed();
    expect(site.shareToken).toBeNull();
    const all = await listProjets();
    expect(all).toHaveLength(2);
    const found = all.find((p) => p.id === site.id)!;
    expect(found.client.nom).toBe("ACME");
    expect(found.titre).toBe("Site vitrine");
  });

  it("liste les projets du plus récent au plus ancien", async () => {
    const { site, film } = await seed();
    const all = await listProjets();
    expect(all.map((p) => p.id)).toEqual([film.id, site.id]);
  });
});

describe("missions", () => {
  it("crée et liste avec projet et client joints", async () => {
    const { film } = await seed();
    await createMission({
      projetId: film.id,
      titre: "Derush",
      statut: "a_faire",
      datePlanifiee: "2026-06-10",
      deadline: null,
      notes: null,
    });
    const all = await listMissions({});
    expect(all).toHaveLength(1);
    expect(all[0].titre).toBe("Derush");
    expect(all[0].projet.titre).toBe("Aftermovie festival");
    expect(all[0].client.nom).toBe("Zénith Prod");
  });

  it("filtre par type, statut et client", async () => {
    const { site, film, acme } = await seed();
    await createMission({ projetId: site.id, titre: "Maquette", statut: "en_cours", datePlanifiee: null, deadline: null, notes: null });
    await createMission({ projetId: film.id, titre: "Montage", statut: "a_faire", datePlanifiee: null, deadline: null, notes: null });

    expect((await listMissions({ type: "site_web" })).map((m) => m.titre)).toEqual(["Maquette"]);
    expect((await listMissions({ statut: "a_faire" })).map((m) => m.titre)).toEqual(["Montage"]);
    expect((await listMissions({ clientId: acme.id })).map((m) => m.titre)).toEqual(["Maquette"]);
    expect(await listMissions({ type: "site_web", statut: "a_faire" })).toHaveLength(0);
  });

  it("trie par deadline (nulls en dernier) dans les deux sens", async () => {
    const { site } = await seed();
    await createMission({ projetId: site.id, titre: "Sans deadline", statut: "a_faire", datePlanifiee: null, deadline: null, notes: null });
    await createMission({ projetId: site.id, titre: "Tard", statut: "a_faire", datePlanifiee: null, deadline: "2026-08-01", notes: null });
    await createMission({ projetId: site.id, titre: "Tôt", statut: "a_faire", datePlanifiee: null, deadline: "2026-06-12", notes: null });

    expect((await listMissions({ sort: "deadline_asc" })).map((m) => m.titre)).toEqual(["Tôt", "Tard", "Sans deadline"]);
    expect((await listMissions({ sort: "deadline_desc" })).map((m) => m.titre)).toEqual(["Tard", "Tôt", "Sans deadline"]);
  });

  it("update partiel : ne touche pas aux champs absents, efface sur null explicite", async () => {
    const { site } = await seed();
    const m = await createMission({
      projetId: site.id,
      titre: "Étalonnage",
      statut: "en_cours",
      datePlanifiee: "2026-06-20",
      deadline: "2026-06-30",
      notes: "important",
    });

    const patched = await updateMission({ id: m.id, titre: "Étalonnage v2" });
    expect(patched?.titre).toBe("Étalonnage v2");
    expect(patched?.statut).toBe("en_cours");
    expect(patched?.datePlanifiee).toBe("2026-06-20");
    expect(patched?.deadline).toBe("2026-06-30");
    expect(patched?.notes).toBe("important");

    const cleared = await updateMission({ id: m.id, deadline: null });
    expect(cleared?.deadline).toBeNull();
    expect(cleared?.datePlanifiee).toBe("2026-06-20");

    const noop = await updateMission({ id: m.id });
    expect(noop?.titre).toBe("Étalonnage v2");
  });

  it("met à jour une mission et son statut", async () => {
    const { site } = await seed();
    const m = await createMission({ projetId: site.id, titre: "Avant", statut: "a_faire", datePlanifiee: null, deadline: null, notes: null });
    const updated = await updateMission({
      id: m.id,
      projetId: site.id,
      titre: "Après",
      statut: "en_revue",
      datePlanifiee: "2026-06-11",
      deadline: null,
      notes: "relu",
    });
    expect(updated?.titre).toBe("Après");
    expect(updated?.datePlanifiee).toBe("2026-06-11");

    await updateMissionStatut(m.id, "termine");
    expect((await listMissions({})).find((x) => x.id === m.id)?.statut).toBe("termine");
  });

  it("supprime une mission", async () => {
    const { site } = await seed();
    const m = await createMission({ projetId: site.id, titre: "Tmp", statut: "a_faire", datePlanifiee: null, deadline: null, notes: null });
    await deleteMission(m.id);
    expect(await listMissions({})).toHaveLength(0);
  });
});

describe("getCalendarItems", () => {
  it("retourne missions planifiées, deadlines missions et deadlines projets dans l'intervalle (bornes incluses)", async () => {
    const { site, film } = await seed(); // site.deadline = 2026-06-30
    await createMission({ projetId: film.id, titre: "Derush", statut: "a_faire", datePlanifiee: "2026-06-01", deadline: "2026-06-30", notes: null });
    await createMission({ projetId: site.id, titre: "Hors mois", statut: "a_faire", datePlanifiee: "2026-07-05", deadline: null, notes: null });

    const items = await getCalendarItems("2026-06-01", "2026-06-30");
    const kinds = items.map((i) => `${i.kind}:${i.date}`).sort();
    expect(kinds).toEqual([
      "deadline_mission:2026-06-30",
      "deadline_projet:2026-06-30",
      "mission_planifiee:2026-06-01",
    ]);

    const planifiee = items.find((i) => i.kind === "mission_planifiee")!;
    expect(planifiee.titre).toBe("Derush");
    expect(planifiee.projetTitre).toBe("Aftermovie festival");
    expect(planifiee.clientNom).toBe("Zénith Prod");
    expect(planifiee.missionId).toBeTruthy();

    const dlProjet = items.find((i) => i.kind === "deadline_projet")!;
    expect(dlProjet.titre).toBe("Site vitrine");
    expect(dlProjet.clientNom).toBe("ACME");
    expect(dlProjet.statut).toBe("en_cours");
  });

  it("exclut ce qui est hors intervalle", async () => {
    const { film } = await seed();
    await createMission({ projetId: film.id, titre: "Mai", statut: "a_faire", datePlanifiee: "2026-05-31", deadline: null, notes: null });
    const items = await getCalendarItems("2026-06-01", "2026-06-28");
    expect(items).toHaveLength(0);
  });
});
