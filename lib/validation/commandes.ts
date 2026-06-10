import { z } from "zod";
import { QUANTITE_MAX, TYPES_PRESTATION } from "@/lib/pricing";
import { optionalText } from "./shared";

/**
 * AUCUN champ prix : les montants affichés côté client sont purement
 * décoratifs — le serveur recalcule tout depuis lib/pricing (Zod strippe
 * les clés inconnues du payload).
 */
export const commandeLigneSchema = z.object({
  type: z.enum(TYPES_PRESTATION),
  quantite: z
    .number({ error: "Quantité requise" })
    .int("Quantité entière requise")
    .min(1, "Quantité minimale : 1")
    .max(QUANTITE_MAX, `Quantité maximale : ${QUANTITE_MAX}`),
  brief: optionalText,
});

export const commandeCreateSchema = z.object({
  lignes: z
    .array(commandeLigneSchema)
    .min(1, "Ajoute au moins une ligne")
    .max(20, "20 lignes maximum par commande"),
});

export type CommandeCreateInput = z.infer<typeof commandeCreateSchema>;

export const factureGenerateSchema = z.object({
  clientId: z.uuid(),
  periode: z.string().regex(/^\d{4}-\d{2}$/, "Période invalide"),
});

export type FactureGenerateInput = z.infer<typeof factureGenerateSchema>;
