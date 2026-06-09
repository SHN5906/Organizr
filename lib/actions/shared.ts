import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "./types";

/**
 * Squelette commun des actions : re-validation Zod côté serveur, exécution,
 * revalidation. `fn` peut retourner `false` pour signaler « introuvable ».
 * Les erreurs DB ne sont jamais exposées telles quelles au client.
 */
export async function runAction<S extends z.ZodType>(
  schema: S,
  input: unknown,
  fn: (data: z.output<S>) => Promise<boolean | void>,
): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
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
    const result = await fn(parsed.data);
    if (result === false) {
      return { ok: false, error: "Élément introuvable" };
    }
  } catch (error) {
    console.error("[action]", error);
    return { ok: false, error: "Une erreur est survenue. Réessaie." };
  }

  // Solo app : toutes les pages affichent ces données — revalidation globale.
  revalidatePath("/", "layout");
  return { ok: true };
}
