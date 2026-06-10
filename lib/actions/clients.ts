"use server";

import { requireOwner } from "@/lib/auth/guards";
import { createClient } from "@/lib/data/clients";
import { clientCreateSchema } from "@/lib/validation/clients";
import { runAction } from "./shared";
import type { ActionResult } from "./types";

export async function createClientAction(
  input: unknown,
): Promise<ActionResult> {
  await requireOwner();
  return runAction(clientCreateSchema, input, async (data) => {
    await createClient(data);
  });
}
