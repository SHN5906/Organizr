import { z } from "zod";
import { getClientId, isOwner } from "@/lib/auth/guards";
import { getBrief } from "@/lib/data/briefs";

export const dynamic = "force-dynamic";

/**
 * Sert le brief PDF d'une commande. Autorisé : l'owner OU le client
 * propriétaire de la commande. 404 indistinct sinon (pas d'énumération).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ commandeId: string }> },
) {
  const { commandeId } = await params;
  if (!z.uuid().safeParse(commandeId).success) {
    return new Response("Introuvable", { status: 404 });
  }

  const brief = await getBrief(commandeId);
  if (!brief) return new Response("Introuvable", { status: 404 });

  const owner = await isOwner();
  const clientId = owner ? null : await getClientId();
  if (!owner && clientId !== brief.clientId) {
    return new Response("Introuvable", { status: 404 });
  }

  return new Response(Buffer.from(brief.contenu, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(brief.taille),
      "Content-Disposition": `inline; filename="${brief.nom.replace(/[^\w. -]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
