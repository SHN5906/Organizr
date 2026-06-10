import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clientAccess, type ClientAccess } from "@/lib/db/schema";

const DEFAULT_EXPIRES_DAYS = 14;

function hashToken(token: string): string {
  // sha256 sans clé : l'entropie 256 bits du token EST la sécurité.
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crée une invitation : le token clair n'existe qu'ici, à la création —
 * seul son hash est stocké, il n'est jamais re-récupérable.
 */
export async function createInvitation(
  clientId: string,
  options: { expiresInDays?: number } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() +
      (options.expiresInDays ?? DEFAULT_EXPIRES_DAYS) * 24 * 60 * 60 * 1000,
  );
  await db.insert(clientAccess).values({
    clientId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

/**
 * Valide un token de lien magique : hash connu, non révoqué, non expiré.
 * Met à jour lastUsedAt. Retourne le clientId ou null.
 */
export async function validateInvitationToken(
  token: string,
): Promise<{ clientId: string } | null> {
  const db = await getDb();
  const [row] = await db
    .update(clientAccess)
    .set({ lastUsedAt: sql`now()` })
    .where(
      and(
        eq(clientAccess.tokenHash, hashToken(token)),
        isNull(clientAccess.revokedAt),
        gt(clientAccess.expiresAt, sql`now()`),
      ),
    )
    .returning({ clientId: clientAccess.clientId });
  return row ?? null;
}

/**
 * Au moins un accès valide (non révoqué, non expiré) pour ce client ?
 * Appelé par requireClient() à CHAQUE requête : c'est ce qui rend la
 * révocation effective malgré des sessions stateless.
 */
export async function hasActiveAccess(clientId: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ id: clientAccess.id })
    .from(clientAccess)
    .where(
      and(
        eq(clientAccess.clientId, clientId),
        isNull(clientAccess.revokedAt),
        gt(clientAccess.expiresAt, sql`now()`),
      ),
    )
    .limit(1);
  return row !== undefined;
}

export async function listInvitations(
  clientId: string,
): Promise<ClientAccess[]> {
  const db = await getDb();
  return db
    .select()
    .from(clientAccess)
    .where(eq(clientAccess.clientId, clientId))
    .orderBy(desc(clientAccess.createdAt));
}

export async function revokeInvitation(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(clientAccess)
    .set({ revokedAt: sql`now()` })
    .where(eq(clientAccess.id, id));
}
