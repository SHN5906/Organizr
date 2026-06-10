"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth/guards";
import { saveBrief } from "@/lib/data/briefs";
import { getClientById } from "@/lib/data/clients";
import {
  createCommandeWithLignes,
  setCommandeProjet,
  type CommandeLigneInput,
} from "@/lib/data/commandes";
import { createMissionsBulk } from "@/lib/data/missions";
import { createProjet } from "@/lib/data/projets";
import {
  lineTotalCents,
  PRESTATION_LABELS,
  unitPriceCents,
} from "@/lib/pricing";
import { commandeCreateSchema } from "@/lib/validation/commandes";
import { z } from "zod";
import type { ActionResult } from "./types";

const BRIEF_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo

/**
 * Valide le brief PDF côté serveur : extension/type déclaré, taille, et
 * SIGNATURE réelle (%PDF-) — le type MIME client est déclaratif.
 */
async function validateBrief(
  file: File,
): Promise<
  | { ok: true; nom: string; taille: number; contenu: string }
  | { ok: false; message: string }
> {
  if (file.size > BRIEF_MAX_OCTETS) {
    return { ok: false, message: "Le brief PDF dépasse 5 Mo." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.subarray(0, 5).toString("latin1").startsWith("%PDF-")) {
    return { ok: false, message: "Le fichier doit être un PDF valide." };
  }
  const nom = (file.name || "brief.pdf").slice(0, 200);
  return {
    ok: true,
    nom: nom.toLowerCase().endsWith(".pdf") ? nom : `${nom}.pdf`,
    taille: buffer.length,
    contenu: buffer.toString("base64"),
  };
}

/**
 * Commande passée par un CLIENT (portail) : le clientId vient de la session,
 * les prix sont recalculés serveur (ceux du client sont décoratifs).
 * Accepte un objet OU un FormData {payload: JSON, brief?: File PDF}.
 * Crée commande → brief → lignes → projet → missions (1/vidéo) ; pas de
 * transaction neon-http : insertions séquentielles, la commande reste valide
 * même si la création du projet échoue (rattrapable en interne).
 */
export async function createCommandeAction(
  input: unknown,
): Promise<ActionResult<{ numero: number }>> {
  const clientId = await requireClient();

  let payload: unknown = input;
  let briefFile: File | null = null;
  if (input instanceof FormData) {
    try {
      payload = JSON.parse(String(input.get("payload") ?? ""));
    } catch {
      return { ok: false, error: "Saisie invalide" };
    }
    const candidate = input.get("brief");
    if (candidate instanceof File && candidate.size > 0) {
      briefFile = candidate;
    }
  }

  const parsed = commandeCreateSchema.safeParse(payload);
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

  const brief = briefFile ? await validateBrief(briefFile) : null;
  if (brief && !brief.ok) {
    return {
      ok: false,
      error: "Saisie invalide",
      fieldErrors: { brief: [brief.message] },
    };
  }

  try {
    const lignes: CommandeLigneInput[] = parsed.data.lignes.map((l) => ({
      type: l.type,
      quantite: l.quantite,
      brief: l.brief,
      prixUnitaireCents: unitPriceCents(l.type, l.quantite),
      totalCents: lineTotalCents(l.type, l.quantite),
    }));

    const client = await getClientById(clientId);
    if (!client) return { ok: false, error: "Compte client introuvable." };

    const tipCents = Math.round((parsed.data.tipEuros ?? 0) * 100);
    const commande = await createCommandeWithLignes(
      clientId,
      lignes,
      tipCents,
      parsed.data.lienSwisstransfer ?? null,
    );

    if (brief?.ok) {
      await saveBrief(commande.id, {
        nom: brief.nom,
        taille: brief.taille,
        contenu: brief.contenu,
      });
    }

    const projet = await createProjet({
      clientId,
      type: "montage_video",
      titre: `Commande #${commande.numero} — ${client.nom}`,
      description: null,
      statut: "a_faire",
      deadline: null,
    });
    await setCommandeProjet(commande.id, projet.id);

    await createMissionsBulk(
      projet.id,
      parsed.data.lignes.flatMap((l) =>
        Array.from({ length: l.quantite }, (_, i) => ({
          titre: `${PRESTATION_LABELS[l.type]} ${i + 1}/${l.quantite} — Commande #${commande.numero}`,
          notes: l.brief,
        })),
      ),
    );

    revalidatePath("/", "layout");
    return { ok: true, data: { numero: commande.numero } };
  } catch (error) {
    console.error("[action]", error);
    return { ok: false, error: "Une erreur est survenue. Réessaie." };
  }
}
