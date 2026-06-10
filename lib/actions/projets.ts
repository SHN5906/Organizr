"use server";

import { requireOwner } from "@/lib/auth/guards";
import { createProjet } from "@/lib/data/projets";
import { projetCreateSchema } from "@/lib/validation/projets";
import { runAction } from "./shared";
import type { ActionResult } from "./types";

export async function createProjetAction(
  input: unknown,
): Promise<ActionResult> {
  await requireOwner();
  return runAction(projetCreateSchema, input, async (data) => {
    await createProjet(data);
  });
}
