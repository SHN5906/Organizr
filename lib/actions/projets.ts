"use server";

import { createProjet } from "@/lib/data/projets";
import { projetCreateSchema } from "@/lib/validation/projets";
import { runAction } from "./shared";
import type { ActionResult } from "./types";

export async function createProjetAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(projetCreateSchema, input, async (data) => {
    await createProjet(data);
  });
}
