import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, projets, type Client, type Projet } from "@/lib/db/schema";
import type { ProjetCreateInput } from "@/lib/validation/projets";

export type ProjetWithClient = Projet & { client: Client };

export async function listProjets(): Promise<ProjetWithClient[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(projets)
    .innerJoin(clients, eq(projets.clientId, clients.id))
    .orderBy(desc(projets.seq));
  return rows.map((r) => ({ ...r.projets, client: r.clients }));
}

export async function createProjet(input: ProjetCreateInput): Promise<Projet> {
  const db = await getDb();
  const [row] = await db.insert(projets).values(input).returning();
  return row;
}
