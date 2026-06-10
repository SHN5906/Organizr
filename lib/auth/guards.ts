import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasActiveAccess } from "@/lib/data/client-access";
import {
  CLIENT_COOKIE,
  OWNER_COOKIE,
  verifySession,
} from "@/lib/auth/session";

// Les layouts ne sont PAS une frontière de sécurité (ils ne re-rendent pas
// toujours) : ces guards s'appellent dans CHAQUE page protégée ET CHAQUE
// server action. Le clientId vient TOUJOURS de la session.

export async function isOwner(): Promise<boolean> {
  const jar = await cookies();
  const payload = verifySession(jar.get(OWNER_COOKIE)?.value);
  return payload?.role === "owner";
}

export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) redirect("/connexion");
}

/**
 * Session client valide ET accès encore actif en DB (non révoqué, non
 * expiré) — c'est ce check qui rend la révocation effective malgré des
 * sessions stateless.
 */
export async function getClientId(): Promise<string | null> {
  const jar = await cookies();
  const payload = verifySession(jar.get(CLIENT_COOKIE)?.value);
  if (payload?.role !== "client") return null;
  if (!(await hasActiveAccess(payload.sub))) return null;
  return payload.sub;
}

export async function requireClient(): Promise<string> {
  const clientId = await getClientId();
  if (!clientId) redirect("/espace/connexion");
  return clientId;
}
