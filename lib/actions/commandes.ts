"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth/guards";
import { getClientById } from "@/lib/data/clients";
import {
  createCommandeWithLignes,
  setCommandeProjet,
  type CommandeLigneInput,
} from "@/lib/data/commandes";
import { createMissionsBulk } from "@/lib/data/missions";
import { createProjet } from "@/lib/data/projets";
import {
  lineTotalCents,
  PRESTATION_LABELS,
  unitPriceCents,
} from "@/lib/pricing";
import { commandeCreateSchema } from "@/lib/validation/commandes";
import { z } from "zod";
import type { ActionResult } from "./types";

/**
 * Commande passée par un CLIENT (portail) : le clientId vient de la session,
 * les prix sont recalculés serveur (ceux du client sont décoratifs).
 * Crée commande → lignes → projet → missions (1/vidéo) ; pas de transaction
 * neon-http : insertions séquentielles, la commande reste valide même si la
 * création du projet échoue (rattrapable en interne).
 */
export async function createCommandeAction(
  input: unknown,
): Promise<ActionResult<{ numero: number }>> {
  const clientId = await requireClient();

  const parsed = commandeCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Saisie invalide",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    const lignes: CommandeLigneInput[] = parsed.data.lignes.map((l) => ({
      type: l.type,
      quantite: l.quantite,
      brief: l.brief,
      prixUnitaireCents: unitPriceCents(l.type, l.quantite),
      totalCents: lineTotalCents(l.type, l.quantite),
    }));

    const client = await getClientById(clientId);
    if (!client) return { ok: false, error: "Compte client introuvable." };

    const commande = await createCommandeWithLignes(clientId, lignes);

    const projet = await createProjet({
      clientId,
      type: "montage_video",
      titre: `Commande #${commande.numero} — ${client.nom}`,
      description: null,
      statut: "a_faire",
      deadline: null,
    });
    await setCommandeProjet(commande.id, projet.id);

    await createMissionsBulk(
      projet.id,
      parsed.data.lignes.flatMap((l) =>
        Array.from({ length: l.quantite }, (_, i) => ({
          titre: `${PRESTATION_LABELS[l.type]} ${i + 1}/${l.quantite} — Commande #${commande.numero}`,
          notes: l.brief,
        })),
      ),
    );

    revalidatePath("/", "layout");
    return { ok: true, data: { numero: commande.numero } };
  } catch (error) {
    console.error("[action]", error);
    return { ok: false, error: "Une erreur est survenue. Réessaie." };
  }
}
