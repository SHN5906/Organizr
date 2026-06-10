import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { commandeBriefs, commandes } from "@/lib/db/schema";

export async function saveBrief(
  commandeId: string,
  brief: { nom: string; taille: number; contenu: string },
): Promise<void> {
  const db = await getDb();
  await db.insert(commandeBriefs).values({ commandeId, ...brief });
}

/**
 * Brief complet + clientId propriétaire (pour l'autorisation de la route
 * de téléchargement : owner OU le client de la commande).
 */
export async function getBrief(commandeId: string): Promise<{
  nom: string;
  taille: number;
  contenu: string;
  clientId: string;
} | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      nom: commandeBriefs.nom,
      taille: commandeBriefs.taille,
      contenu: commandeBriefs.contenu,
      clientId: commandes.clientId,
    })
    .from(commandeBriefs)
    .innerJoin(commandes, eq(commandeBriefs.commandeId, commandes.id))
    .where(eq(commandeBriefs.commandeId, commandeId));
  return row ?? null;
}
