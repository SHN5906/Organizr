import "server-only";
import { and, asc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  missions,
  projets,
  type Client,
  type Mission,
  type Projet,
} from "@/lib/db/schema";
import type { Statut, TypeProjet } from "@/lib/validation/labels";
import type {
  MissionCreateInput,
  MissionUpdateInput,
} from "@/lib/validation/missions";

export type MissionWithProjet = Mission & { projet: Projet; client: Client };

export type MissionSort = "deadline_asc" | "deadline_desc";

export type MissionFilters = {
  type?: TypeProjet;
  statut?: Statut;
  clientId?: string;
  sort?: MissionSort;
};

/**
 * Contrat partagé avec le calendrier (P4) : une entrée par jour affichable.
 * `titre` est celui de la mission, sauf pour `deadline_projet` (titre projet).
 */
export type CalendarItem = {
  kind: "mission_planifiee" | "deadline_mission" | "deadline_projet";
  date: string; // YYYY-MM-DD
  titre: string;
  missionId?: string;
  projetId: string;
  statut: Statut;
  clientNom: string;
  projetTitre: string;
};

export async function listMissions(
  filters: MissionFilters = {},
): Promise<MissionWithProjet[]> {
  const db = await getDb();

  const conditions: SQL[] = [];
  if (filters.type) conditions.push(eq(projets.type, filters.type));
  if (filters.statut) conditions.push(eq(missions.statut, filters.statut));
  if (filters.clientId) conditions.push(eq(projets.clientId, filters.clientId));

  const order =
    filters.sort === "deadline_desc"
      ? sql`${missions.deadline} desc nulls last`
      : sql`${missions.deadline} asc nulls last`;

  const rows = await db
    .select()
    .from(missions)
    .innerJoin(projets, eq(missions.projetId, projets.id))
    .innerJoin(clients, eq(projets.clientId, clients.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(order, asc(missions.createdAt));

  return rows.map((r) => ({
    ...r.missions,
    projet: r.projets,
    client: r.clients,
  }));
}

export async function createMission(
  input: MissionCreateInput,
): Promise<Mission> {
  const db = await getDb();
  const [row] = await db.insert(missions).values(input).returning();
  return row;
}

export async function updateMission(
  input: MissionUpdateInput,
): Promise<Mission | null> {
  const db = await getDb();
  const { id, ...fields } = input;
  // PATCH : seules les clés explicitement fournies sont écrites.
  const patch = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined),
  ) as Partial<typeof missions.$inferInsert>;

  if (Object.keys(patch).length === 0) {
    const [row] = await db.select().from(missions).where(eq(missions.id, id));
    return row ?? null;
  }

  const [row] = await db
    .update(missions)
    .set(patch)
    .where(eq(missions.id, id))
    .returning();
  return row ?? null;
}

export async function updateMissionStatut(
  id: string,
  statut: Statut,
): Promise<Mission | null> {
  const db = await getDb();
  const [row] = await db
    .update(missions)
    .set({ statut })
    .where(eq(missions.id, id))
    .returning();
  return row ?? null;
}

export async function deleteMission(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(missions).where(eq(missions.id, id));
}

export async function getCalendarItems(
  start: string,
  end: string,
): Promise<CalendarItem[]> {
  const db = await getDb();

  const missionBase = {
    missionId: missions.id,
    missionTitre: missions.titre,
    missionStatut: missions.statut,
    projetId: projets.id,
    projetTitre: projets.titre,
    clientNom: clients.nom,
  };

  const [planifiees, deadlinesMissions, deadlinesProjets] = await Promise.all([
    db
      .select({ ...missionBase, date: missions.datePlanifiee })
      .from(missions)
      .innerJoin(projets, eq(missions.projetId, projets.id))
      .innerJoin(clients, eq(projets.clientId, clients.id))
      .where(and(gte(missions.datePlanifiee, start), lte(missions.datePlanifiee, end))),
    db
      .select({ ...missionBase, date: missions.deadline })
      .from(missions)
      .innerJoin(projets, eq(missions.projetId, projets.id))
      .innerJoin(clients, eq(projets.clientId, clients.id))
      .where(and(gte(missions.deadline, start), lte(missions.deadline, end))),
    db
      .select({
        projetId: projets.id,
        projetTitre: projets.titre,
        projetStatut: projets.statut,
        clientNom: clients.nom,
        date: projets.deadline,
      })
      .from(projets)
      .innerJoin(clients, eq(projets.clientId, clients.id))
      .where(and(gte(projets.deadline, start), lte(projets.deadline, end))),
  ]);

  const items: CalendarItem[] = [
    ...planifiees.map((r) => ({
      kind: "mission_planifiee" as const,
      date: r.date!,
      titre: r.missionTitre,
      missionId: r.missionId,
      projetId: r.projetId,
      statut: r.missionStatut,
      clientNom: r.clientNom,
      projetTitre: r.projetTitre,
    })),
    ...deadlinesMissions.map((r) => ({
      kind: "deadline_mission" as const,
      date: r.date!,
      titre: r.missionTitre,
      missionId: r.missionId,
      projetId: r.projetId,
      statut: r.missionStatut,
      clientNom: r.clientNom,
      projetTitre: r.projetTitre,
    })),
    ...deadlinesProjets.map((r) => ({
      kind: "deadline_projet" as const,
      date: r.date!,
      titre: r.projetTitre,
      projetId: r.projetId,
      statut: r.projetStatut,
      clientNom: r.clientNom,
      projetTitre: r.projetTitre,
    })),
  ];

  return items.sort(
    (a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind),
  );
}
