"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guards";
import {
  listCommandesForPeriode,
  markFacturees,
} from "@/lib/data/commandes";
import {
  createFacture,
  deleteFacture,
  getFacture,
  latestFactureFor,
} from "@/lib/data/factures";
import { z } from "zod";
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
  if (!parsed.success) return { ok: false, error: "Saisie invalide." };

  try {
    const { clientId, periode } = parsed.data;
    const commandes = await listCommandesForPeriode(periode, clientId);
    if (commandes.length === 0) {
      return {
        ok: false,
        error: "Aucune commande sur cette période pour ce client.",
      };
    }

    const lignes: FactureLigneSnapshot[] = commandes.flatMap((commande) => [
      ...commande.lignes.map((l) => ({
        commandeNumero: commande.numero,
        type: l.type as FactureLigneSnapshot["type"],
        label: PRESTATION_LABELS[l.type],
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        total: l.total,
      })),
      // Le tip du client devient une ligne dédiée de la facture.
      ...(numericToCents(commande.tip) > 0
        ? [
            {
              commandeNumero: commande.numero,
              type: "tip" as const,
              label: "Tip",
              quantite: 1,
              prixUnitaire: commande.tip,
              total: commande.tip,
            },
          ]
        : []),
    ]);
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

const factureDeleteSchema = z.object({ id: z.uuid() });

/**
 * Supprime une ANCIENNE révision de facture. La dernière révision d'un
 * client × période est refusée même si la requête est forgée : c'est la
 * facture vivante, on la remplace (régénération), on ne la supprime pas.
 */
export async function deleteFactureAction(
  input: unknown,
): Promise<ActionResult> {
  await requireOwner();

  const parsed = factureDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Facture invalide." };

  try {
    const facture = await getFacture(parsed.data.id);
    if (!facture) return { ok: false, error: "Facture introuvable." };

    const derniere = await latestFactureFor(facture.clientId, facture.periode);
    if (derniere?.id === facture.id) {
      return {
        ok: false,
        error:
          "La dernière révision ne peut pas être supprimée — régénère la facture si besoin.",
      };
    }

    await deleteFacture(facture.id);
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("[action]", error);
    return { ok: false, error: "Une erreur est survenue. Réessaie." };
  }
}
