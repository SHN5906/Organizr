"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guards";
import {
  listCommandesForPeriode,
  markFacturees,
} from "@/lib/data/commandes";
import { createFacture } from "@/lib/data/factures";
import type { FactureLigneSnapshot } from "@/lib/db/schema";
import {
  centsToNumeric,
  numericToCents,
  PRESTATION_LABELS,
} from "@/lib/pricing";
import { factureGenerateSchema } from "@/lib/validation/commandes";
import type { ActionResult } from "./types";

/**
 * Génère la facture d'un client pour une période : snapshot JSONB de TOUTES
 * les commandes de la période (déjà facturées incluses — une régénération
 * produit une révision N+1 qui remplace la précédente), commandes re-pointées
 * vers la dernière facture.
 */
export async function generateFactureAction(
  input: unknown,
): Promise<ActionResult<{ factureId: string; numero: string; revision: number }>> {
  await requireOwner();

  const parsed = factureGenerateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Saisie invalide" };

  try {
    const { clientId, periode } = parsed.data;
    const commandes = await listCommandesForPeriode(periode, clientId);
    if (commandes.length === 0) {
      return {
        ok: false,
        error: "Aucune commande sur cette période pour ce client.",
      };
    }

    const lignes: FactureLigneSnapshot[] = commandes.flatMap((commande) =>
      commande.lignes.map((l) => ({
        commandeNumero: commande.numero,
        type: l.type,
        label: PRESTATION_LABELS[l.type],
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        total: l.total,
      })),
    );
    const totalCents = lignes.reduce(
      (sum, l) => sum + numericToCents(l.total),
      0,
    );

    const facture = await createFacture({
      clientId,
      periode,
      lignes,
      totalTtc: centsToNumeric(totalCents),
    });
    await markFacturees(
      commandes.map((c) => c.id),
      facture.id,
    );

    revalidatePath("/", "layout");
    return {
      ok: true,
      data: {
        factureId: facture.id,
        numero: facture.numero,
        revision: facture.revision,
      },
    };
  } catch (error) {
    console.error("[action]", error);
    return { ok: false, error: "Une erreur est survenue. Réessaie." };
  }
}
