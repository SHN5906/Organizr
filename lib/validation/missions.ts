import { z } from "zod";
import { STATUTS } from "./labels";
import {
  optionalDate,
  optionalText,
  patchDate,
  patchText,
  requiredText,
} from "./shared";

export const missionCreateSchema = z.object({
  projetId: z.uuid("Projet requis"),
  titre: requiredText,
  statut: z.enum(STATUTS).default("a_faire"),
  datePlanifiee: optionalDate,
  deadline: optionalDate,
  notes: optionalText,
});

/**
 * Update en sémantique PATCH : clé absente = champ non modifié,
 * null / "" = effacement explicite. Le titre n'est jamais effaçable.
 */
export const missionUpdateSchema = z.object({
  id: z.uuid(),
  projetId: z.uuid().optional(),
  titre: requiredText.optional(),
  statut: z.enum(STATUTS).optional(),
  datePlanifiee: patchDate,
  deadline: patchDate,
  notes: patchText,
});

export const missionStatutSchema = z.object({
  id: z.uuid(),
  statut: z.enum(STATUTS),
});

export const missionDeleteSchema = z.object({
  id: z.uuid(),
});

/**
 * Schéma du FORMULAIRE (RHF) : valeurs contrôlées, jamais undefined.
 * Le serveur re-valide avec missionCreate/UpdateSchema.
 */
export const missionFormSchema = z.object({
  projetId: z.uuid("Projet requis"),
  titre: z.string().trim().min(1, "Champ requis"),
  statut: z.enum(STATUTS),
  datePlanifiee: z.iso.date("Date invalide").nullable(),
  deadline: z.iso.date("Date invalide").nullable(),
  notes: z.string(),
});

export type MissionFormValues = z.infer<typeof missionFormSchema>;

export type MissionCreateInput = z.infer<typeof missionCreateSchema>;
export type MissionUpdateInput = z.infer<typeof missionUpdateSchema>;
export type MissionStatutInput = z.infer<typeof missionStatutSchema>;
