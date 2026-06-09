import { z } from "zod";
import { optionalText, requiredText } from "./shared";

export const clientCreateSchema = z.object({
  nom: requiredText,
  contact: optionalText,
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
