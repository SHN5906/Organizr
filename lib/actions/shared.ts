import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "./types";

/**
 * Squelette commun des actions : re-validation Zod côté serveur, exécution,
 * revalidation. `fn` peut retourner `false` pour signaler « introuvable »,
 * ou une valeur qui devient `data` du résultat. Les erreurs DB ne sont
 * jamais exposées telles quelles au client.
 */
export async function runAction<S extends z.ZodType, T = void>(
  schema: S,
  input: unknown,
  fn: (data: z.output<S>) => Promise<T | false>,
): Promise<ActionResult<T>> {
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

  let result: T | false;
  try {
    result = await fn(parsed.data);
    if (result === false) {
      return { ok: false, error: "Élément introuvable" };
    }
  } catch (error) {
    console.error("[action]", error);
    return { ok: false, error: "Une erreur est survenue. Réessaie." };
  }

  // Solo app, toutes pages force-dynamic : revalidation globale sûre
  // (aucun cache RSC par session).
  revalidatePath("/", "layout");
  return { ok: true, data: result as T };
}
