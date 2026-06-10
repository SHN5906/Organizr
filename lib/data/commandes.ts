import "server-only";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  commandeBriefs,
  commandeLiens,
  commandeLignes,
  commandes,
  type Client,
  type Commande,
  type CommandeLigne,
  type LienPartage,
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

export type LienPartageInput = { titre: string | null; url: string };

export type CommandeWithLignes = Commande & {
  lignes: CommandeLigne[];
  liens: LienPartage[];
};
export type CommandeComplete = CommandeWithLignes & {
  client: Client;
  briefNom: string | null;
};

/** Crée la commande, ses lignes et ses liens (pas de transaction neon-http : ordre sûr). */
export async function createCommandeWithLignes(
  clientId: string,
  lignes: CommandeLigneInput[],
  tipCents = 0,
  liens: LienPartageInput[] = [],
): Promise<CommandeWithLignes> {
  const db = await getDb();
  const [commande] = await db
    .insert(commandes)
    .values({ clientId, tip: centsToNumeric(tipCents) })
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

  let insertedLiens: LienPartage[] = [];
  if (liens.length > 0) {
    insertedLiens = await db
      .insert(commandeLiens)
      .values(
        liens.map((l) => ({
          commandeId: commande.id,
          titre: l.titre,
          url: l.url,
        })),
      )
      .returning();
    insertedLiens.sort((a, b) => a.ordre - b.ordre);
  }

  return { ...commande, lignes: insertedLignes, liens: insertedLiens };
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

export async function liensByCommande(
  commandeIds: string[],
): Promise<Map<string, LienPartage[]>> {
  if (commandeIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select()
    .from(commandeLiens)
    .where(inArray(commandeLiens.commandeId, commandeIds))
    .orderBy(asc(commandeLiens.ordre));
  const map = new Map<string, LienPartage[]>();
  for (const row of rows) {
    (map.get(row.commandeId) ?? map.set(row.commandeId, []).get(row.commandeId)!).push(row);
  }
  return map;
}

/**
 * Commandes d'une période (bornes en fuseau applicatif), toutes clients ou
 * filtrées, avec client + lignes + liens — pour la page facturation.
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

  const ids = rows.map((r) => r.commande.id);
  const [lignes, liens] = await Promise.all([
    lignesByCommande(ids),
    liensByCommande(ids),
  ]);
  return rows.map((r) => ({
    ...r.commande,
    client: r.client,
    briefNom: r.briefNom,
    lignes: lignes.get(r.commande.id) ?? [],
    liens: liens.get(r.commande.id) ?? [],
  }));
}

export type CommandeFichiersProjet = {
  projetId: string;
  commandeId: string;
  numero: number;
  liens: LienPartage[];
  briefNom: string | null;
};

/** Fichiers (liens + brief) des commandes liées à des projets — page Projets. */
export async function listCommandesForProjets(
  projetIds: string[],
): Promise<CommandeFichiersProjet[]> {
  if (projetIds.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({
      projetId: commandes.projetId,
      commandeId: commandes.id,
      numero: commandes.numero,
      briefNom: commandeBriefs.nom,
    })
    .from(commandes)
    .leftJoin(commandeBriefs, eq(commandeBriefs.commandeId, commandes.id))
    .where(inArray(commandes.projetId, projetIds))
    .orderBy(desc(commandes.numero));

  const liens = await liensByCommande(rows.map((r) => r.commandeId));
  return rows
    .filter((r) => r.projetId !== null)
    .map((r) => ({
      projetId: r.projetId!,
      commandeId: r.commandeId,
      numero: r.numero,
      briefNom: r.briefNom,
      liens: liens.get(r.commandeId) ?? [],
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
