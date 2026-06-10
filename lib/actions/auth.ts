"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { requireOwner } from "@/lib/auth/guards";
import {
  CLIENT_COOKIE,
  CLIENT_SESSION_SECONDS,
  getOwnerPassword,
  OWNER_COOKIE,
  OWNER_SESSION_SECONDS,
  safeEqual,
  signSession,
} from "@/lib/auth/session";
import {
  createInvitation,
  revokeInvitation,
  validateInvitationToken,
} from "@/lib/data/client-access";
import type { ActionResult } from "./types";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "ip-inconnue";
}

const ownerLoginSchema = z.object({
  password: z.string().min(1, "Champ requis"),
});

/** Login owner : succès → cookie + redirect /dashboard ; échec → erreur. */
export async function loginOwnerAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = ownerLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Mot de passe requis" };
  }
  if (!checkRateLimit(`owner-login:${await clientIp()}`, 10, 60_000)) {
    return { ok: false, error: "Trop de tentatives. Réessaie dans une minute." };
  }
  if (!safeEqual(parsed.data.password, getOwnerPassword())) {
    return { ok: false, error: "Mot de passe incorrect" };
  }
  const jar = await cookies();
  jar.set(
    OWNER_COOKIE,
    signSession({ sub: "owner", role: "owner" }, OWNER_SESSION_SECONDS),
    cookieOptions(OWNER_SESSION_SECONDS),
  );
  redirect("/dashboard");
}

export async function logoutOwnerAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(OWNER_COOKIE);
  redirect("/connexion");
}

const inviteSchema = z.object({ clientId: z.uuid() });

/**
 * Génère un lien magique pour un client. Le token clair n'existe que dans
 * cette réponse (à copier) — seul son hash est en DB.
 */
export async function inviteClientAction(
  input: unknown,
): Promise<ActionResult<{ url: string; expiresAt: string }>> {
  await requireOwner();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Client invalide" };

  try {
    const { token, expiresAt } = await createInvitation(parsed.data.clientId);
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const url = `${proto}://${host}/espace/connexion?token=${token}`;
    revalidatePath("/projets");
    return { ok: true, data: { url, expiresAt: expiresAt.toISOString() } };
  } catch (error) {
    console.error("[action]", error);
    return { ok: false, error: "Une erreur est survenue. Réessaie." };
  }
}

const revokeSchema = z.object({ id: z.uuid() });

export async function revokeInvitationAction(
  input: unknown,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = revokeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Accès invalide" };
  try {
    await revokeInvitation(parsed.data.id);
    revalidatePath("/projets");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("[action]", error);
    return { ok: false, error: "Une erreur est survenue. Réessaie." };
  }
}

const clientLoginSchema = z.object({ token: z.string().min(20) });

/** Échange un token de lien magique contre une session client. */
export async function loginClientAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = clientLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Lien invalide ou expiré." };
  }
  if (!checkRateLimit(`client-login:${await clientIp()}`, 10, 60_000)) {
    return { ok: false, error: "Trop de tentatives. Réessaie dans une minute." };
  }
  const access = await validateInvitationToken(parsed.data.token);
  if (!access) {
    return { ok: false, error: "Lien invalide ou expiré." };
  }
  const jar = await cookies();
  jar.set(
    CLIENT_COOKIE,
    signSession({ sub: access.clientId, role: "client" }, CLIENT_SESSION_SECONDS),
    cookieOptions(CLIENT_SESSION_SECONDS),
  );
  redirect("/espace");
}

export async function logoutClientAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(CLIENT_COOKIE);
  redirect("/espace/connexion");
}
