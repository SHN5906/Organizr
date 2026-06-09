import { z } from "zod";
import { STATUTS, TYPES_PROJET } from "./labels";
import { optionalDate, optionalText, requiredText } from "./shared";

export const projetCreateSchema = z.object({
  clientId: z.uuid("Client requis"),
  type: z.enum(TYPES_PROJET),
  titre: requiredText,
  description: optionalText,
  statut: z.enum(STATUTS).default("a_faire"),
  deadline: optionalDate,
});

export type ProjetCreateInput = z.infer<typeof projetCreateSchema>;
