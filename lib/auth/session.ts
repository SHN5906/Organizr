import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sessions signées maison (HMAC-SHA256), zéro dépendance.
 * Stateless : le logout ne révoque rien côté serveur — la révocation
 * effective des clients passe par le check DB de requireClient().
 */

export type SessionRole = "owner" | "client";

export type SessionPayload = {
  sub: string; // 'owner' ou clientId
  role: SessionRole;
  exp: number; // secondes epoch
};

export const OWNER_COOKIE = "organizr_owner";
export const CLIENT_COOKIE = "organizr_client";
export const OWNER_SESSION_SECONDS = 30 * 24 * 60 * 60; // 30 j
export const CLIENT_SESSION_SECONDS = 90 * 24 * 60 * 60; // 90 j

function isProdLike(): boolean {
  return Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
}

// Lecture LAZY : jamais au top-level d'un module, sinon `next build` local
// (NODE_ENV=production) casserait sans secrets. Rien n'appelle ces fonctions
// au build (pages force-dynamic).
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;
  if (isProdLike()) {
    throw new Error("SESSION_SECRET manquant en production — configurer Vercel.");
  }
  console.warn("[auth] SESSION_SECRET absent — secret de DEV utilisé.");
  return "dev-session-secret-ne-pas-utiliser-en-prod";
}

/**
 * OWNER_PASSWORD n'est pas passé par un KDF (comparaison sha256 timing-safe) :
 * il DOIT être généré à haute entropie, jamais un mot de passe humain faible.
 */
export function getOwnerPassword(): string {
  const password = process.env.OWNER_PASSWORD?.trim();
  if (password) return password;
  if (isProdLike()) {
    throw new Error("OWNER_PASSWORD manquant en production — configurer Vercel.");
  }
  console.warn("[auth] OWNER_PASSWORD absent — mot de passe de DEV utilisé.");
  return "dev-owner";
}

/** Comparaison en temps constant, longueurs différentes incluses. */
export function safeEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}

function hmac(body: string): Buffer {
  return createHmac("sha256", getSessionSecret()).update(body).digest();
}

export function signSession(
  payload: { sub: string; role: SessionRole },
  maxAgeSeconds: number,
): string {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${hmac(body).toString("base64url")}`;
}

export function verifySession(
  token: string | null | undefined,
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;

  let given: Buffer;
  try {
    given = Buffer.from(mac, "base64url");
  } catch {
    return null;
  }
  const expected = hmac(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      typeof payload.sub !== "string" ||
      (payload.role !== "owner" && payload.role !== "client") ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now() / 1000
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
