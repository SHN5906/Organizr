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
 * Compteurs en MAX+1 (pas count+1 : la suppression d'anciennes révisions
 * créerait des collisions sur le numero UNIQUE). Sans transaction : race
 * acceptée (usage solo). Suffixe à 3 chiffres — borne 999/période assumée.
 */
export async function createFacture(input: {
  clientId: string;
  periode: string;
  lignes: FactureLigneSnapshot[];
  totalTtc: string;
}): Promise<Facture> {
  const db = await getDb();

  // max(numero) : préfixe fixe + suffixe zero-paddé → le max lexical EST
  // le max numérique.
  const [{ maxNumero }] = await db
    .select({ maxNumero: sql<string | null>`max(${factures.numero})` })
    .from(factures)
    .where(eq(factures.periode, input.periode));
  const dernierSuffixe = maxNumero ? Number(maxNumero.slice(-3)) : 0;

  const [{ maxRevision }] = await db
    .select({
      maxRevision: sql<number | null>`max(${factures.revision})::int`,
    })
    .from(factures)
    .where(
      and(
        eq(factures.periode, input.periode),
        eq(factures.clientId, input.clientId),
      ),
    );

  const numero = `FAC-${input.periode}-${String(dernierSuffixe + 1).padStart(3, "0")}`;
  const [facture] = await db
    .insert(factures)
    .values({
      clientId: input.clientId,
      periode: input.periode,
      numero,
      revision: (maxRevision ?? 0) + 1,
      lignes: input.lignes,
      totalTtc: input.totalTtc,
    })
    .returning();
  return facture;
}

/** Dernière révision d'un client sur une période (la facture « vivante »). */
export async function latestFactureFor(
  clientId: string,
  periode: string,
): Promise<Facture | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(factures)
    .where(
      and(eq(factures.clientId, clientId), eq(factures.periode, periode)),
    )
    .orderBy(desc(factures.revision))
    .limit(1);
  return row ?? null;
}

/** Supprime une facture (les commandes pointant dessus passent à NULL). */
export async function deleteFacture(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(factures).where(eq(factures.id, id));
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
