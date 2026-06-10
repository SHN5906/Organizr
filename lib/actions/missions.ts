"use server";

import {
  createMission,
  deleteMission,
  updateMission,
  updateMissionStatut,
} from "@/lib/data/missions";
import {
  missionCreateSchema,
  missionDeleteSchema,
  missionStatutSchema,
  missionUpdateSchema,
} from "@/lib/validation/missions";
import { runAction } from "./shared";
import type { ActionResult } from "./types";

export async function createMissionAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(missionCreateSchema, input, async (data) => {
    await createMission(data);
  });
}

export async function updateMissionAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(missionUpdateSchema, input, async (data) => {
    const updated = await updateMission(data);
    if (updated === null) return false;
  });
}

export async function updateMissionStatutAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(missionStatutSchema, input, async (data) => {
    const updated = await updateMissionStatut(data.id, data.statut);
    if (updated === null) return false;
  });
}

export async function deleteMissionAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(missionDeleteSchema, input, async (data) => {
    await deleteMission(data.id);
  });
}
