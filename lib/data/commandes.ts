import "server-only";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  commandeBriefs,
  commandeLignes,
  commandes,
  type Client,
  type Commande,
  type CommandeLigne,
} from "@/lib/db/schema";
import { centsToNumeric, type TypePrestation } from "@/lib/pricing";
import { periodeBounds } from "@/lib/format";

export type CommandeLigneInput = {
  type: TypePrestation;
  quantite: number;
  brief: string | null;
  prixUnitaireCents: number;
  totalCents: number;
};

export type CommandeWithLignes = Commande & { lignes: CommandeLigne[] };
export type CommandeComplete = CommandeWithLignes & {
  client: Client;
  briefNom: string | null;
};

/** Crée la commande puis ses lignes (pas de transaction neon-http : ordre sûr). */
export async function createCommandeWithLignes(
  clientId: string,
  lignes: CommandeLigneInput[],
  tipCents = 0,
  lienSwisstransfer: string | null = null,
): Promise<CommandeWithLignes> {
  const db = await getDb();
  const [commande] = await db
    .insert(commandes)
    .values({ clientId, tip: centsToNumeric(tipCents), lienSwisstransfer })
    .returning();

  const insertedLignes = await db
    .insert(commandeLignes)
    .values(
      lignes.map((l) => ({
        commandeId: commande.id,
        type: l.type,
        quantite: l.quantite,
        prixUnitaire: centsToNumeric(l.prixUnitaireCents),
        total: centsToNumeric(l.totalCents),
        brief: l.brief,
      })),
    )
    .returning();

  return { ...commande, lignes: insertedLignes };
}

export async function setCommandeProjet(
  commandeId: string,
  projetId: string,
): Promise<void> {
  const db = await getDb();
  await db
    .update(commandes)
    .set({ projetId })
    .where(eq(commandes.id, commandeId));
}

async function lignesByCommande(
  commandeIds: string[],
): Promise<Map<string, CommandeLigne[]>> {
  if (commandeIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select()
    .from(commandeLignes)
    .where(inArray(commandeLignes.commandeId, commandeIds))
    .orderBy(asc(commandeLignes.ordre));
  const map = new Map<string, CommandeLigne[]>();
  for (const row of rows) {
    (map.get(row.commandeId) ?? map.set(row.commandeId, []).get(row.commandeId)!).push(row);
  }
  return map;
}

/**
 * Commandes d'une période (bornes en fuseau applicatif), toutes clients ou
 * filtrées, avec client + lignes — pour la page facturation.
 */
export async function listCommandesForPeriode(
  periode: string,
  clientId?: string,
): Promise<CommandeComplete[]> {
  const db = await getDb();
  const { start, end } = periodeBounds(periode);
  const conditions = [
    gte(commandes.createdAt, start),
    lt(commandes.createdAt, end),
  ];
  if (clientId) conditions.push(eq(commandes.clientId, clientId));

  const rows = await db
    .select({
      commande: commandes,
      client: clients,
      // Métadonnées du brief uniquement — jamais le contenu en liste.
      briefNom: commandeBriefs.nom,
    })
    .from(commandes)
    .innerJoin(clients, eq(commandes.clientId, clients.id))
    .leftJoin(commandeBriefs, eq(commandeBriefs.commandeId, commandes.id))
    .where(and(...conditions))
    .orderBy(desc(commandes.numero));

  const lignes = await lignesByCommande(rows.map((r) => r.commande.id));
  return rows.map((r) => ({
    ...r.commande,
    client: r.client,
    briefNom: r.briefNom,
    lignes: lignes.get(r.commande.id) ?? [],
  }));
}

export async function markFacturees(
  commandeIds: string[],
  factureId: string,
): Promise<void> {
  if (commandeIds.length === 0) return;
  const db = await getDb();
  await db
    .update(commandes)
    .set({ statut: "facturee", factureId })
    .where(inArray(commandes.id, commandeIds));
}
