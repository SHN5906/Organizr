import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  factures,
  type Client,
  type Facture,
  type FactureLigneSnapshot,
} from "@/lib/db/schema";

export type FactureWithClient = Facture & { client: Client };

/**
 * Crée une facture figée : numero = compteur GLOBAL de la période
 * (FAC-AAAA-MM-XXX), revision = compteur par client × période.
 * Compteurs par count+1 sans transaction : race acceptée (usage solo).
 */
export async function createFacture(input: {
  clientId: string;
  periode: string;
  lignes: FactureLigneSnapshot[];
  totalTtc: string;
}): Promise<Facture> {
  const db = await getDb();

  const [{ countPeriode }] = await db
    .select({ countPeriode: sql<number>`count(*)::int` })
    .from(factures)
    .where(eq(factures.periode, input.periode));
  const [{ countClient }] = await db
    .select({ countClient: sql<number>`count(*)::int` })
    .from(factures)
    .where(
      and(
        eq(factures.periode, input.periode),
        eq(factures.clientId, input.clientId),
      ),
    );

  const numero = `FAC-${input.periode}-${String(countPeriode + 1).padStart(3, "0")}`;
  const [facture] = await db
    .insert(factures)
    .values({
      clientId: input.clientId,
      periode: input.periode,
      numero,
      revision: countClient + 1,
      lignes: input.lignes,
      totalTtc: input.totalTtc,
    })
    .returning();
  return facture;
}

export async function getFacture(
  id: string,
): Promise<FactureWithClient | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(factures)
    .innerJoin(clients, eq(factures.clientId, clients.id))
    .where(eq(factures.id, id));
  return row ? { ...row.factures, client: row.clients } : null;
}

export async function listFacturesForPeriode(
  periode: string,
): Promise<FactureWithClient[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(factures)
    .innerJoin(clients, eq(factures.clientId, clients.id))
    .where(eq(factures.periode, periode))
    .orderBy(desc(factures.createdAt));
  return rows.map((r) => ({ ...r.factures, client: r.clients }));
}
