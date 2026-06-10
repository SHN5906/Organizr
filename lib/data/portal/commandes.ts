import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  commandeLignes,
  commandes,
  type Commande,
  type CommandeLigne,
} from "@/lib/db/schema";

// Couche PORTAIL : chaque fonction exige un clientId qui provient TOUJOURS
// de la session (lib/auth/guards), jamais d'un paramètre de requête.

export type PortalCommande = Commande & { lignes: CommandeLigne[] };

export async function listCommandesForClient(
  clientId: string,
): Promise<PortalCommande[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(commandes)
    .where(eq(commandes.clientId, clientId))
    .orderBy(desc(commandes.numero));
  if (rows.length === 0) return [];

  const lignes = await db
    .select()
    .from(commandeLignes)
    .where(
      inArray(
        commandeLignes.commandeId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(commandeLignes.ordre));

  const byCommande = new Map<string, CommandeLigne[]>();
  for (const ligne of lignes) {
    const list = byCommande.get(ligne.commandeId) ?? [];
    list.push(ligne);
    byCommande.set(ligne.commandeId, list);
  }
  return rows.map((r) => ({ ...r, lignes: byCommande.get(r.id) ?? [] }));
}
