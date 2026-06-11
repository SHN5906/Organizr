import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name)! } : undefined,
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
  headers: async () =>
    new Headers({
      host: "localhost:3000",
      "x-forwarded-proto": "http",
      "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 250)}`,
    }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getDb } from "@/lib/db";
import {
  inviteClientAction,
  loginClientAction,
  loginOwnerAction,
  revokeInvitationAction,
} from "@/lib/actions/auth";
import { isOwner, getClientId, requireClient } from "@/lib/auth/guards";
import {
  CLIENT_COOKIE,
  OWNER_COOKIE,
  signSession,
} from "@/lib/auth/session";
import { createClient } from "@/lib/data/clients";
import { listInvitations } from "@/lib/data/client-access";
import { resetRateLimits } from "@/lib/auth/rate-limit";

function loginAsOwner() {
  jar.set(OWNER_COOKIE, signSession({ sub: "owner", role: "owner" }, 3600));
}

beforeEach(async () => {
  vi.stubEnv("SESSION_SECRET", "secret-de-test-suffisamment-long!");
  vi.stubEnv("OWNER_PASSWORD", "mdp-owner-de-test");
  jar.clear();
  resetRateLimits();
  const db = await getDb();
  await db.execute(
    sql`TRUNCATE clients, projets, missions, client_access, commandes, commande_lignes, factures RESTART IDENTITY CASCADE`,
  );
});

describe("loginOwnerAction", () => {
  it("mauvais mot de passe → erreur, pas de cookie", async () => {
    const result = await loginOwnerAction({ password: "faux" });
    expect(result).toMatchObject({ ok: false, error: "Mot de passe incorrect." });
    expect(jar.has(OWNER_COOKIE)).toBe(false);
  });

  it("bon mot de passe → cookie owner + redirect /dashboard", async () => {
    await expect(
      loginOwnerAction({ password: "mdp-owner-de-test" }),
    ).rejects.toThrow("REDIRECT:/dashboard");
    expect(jar.has(OWNER_COOKIE)).toBe(true);
    expect(await isOwner()).toBe(true);
  });
});

describe("inviteClientAction", () => {
  it("refusée sans session owner (redirect /connexion)", async () => {
    const client = await createClient({ nom: "Client A", contact: null });
    await expect(
      inviteClientAction({ clientId: client.id }),
    ).rejects.toThrow("REDIRECT:/connexion");
  });

  it("retourne une URL de lien magique dont le token est valide", async () => {
    loginAsOwner();
    const client = await createClient({ nom: "Client A", contact: null });
    const result = await inviteClientAction({ clientId: client.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.url).toMatch(
      /^http:\/\/localhost:3000\/espace\/connexion\?token=/,
    );

    const token = new URL(result.data.url).searchParams.get("token")!;
    await expect(loginClientAction({ token })).rejects.toThrow(
      "REDIRECT:/espace",
    );
    expect(jar.has(CLIENT_COOKIE)).toBe(true);
    expect(await getClientId()).toBe(client.id);
  });
});

describe("loginClientAction", () => {
  it("token invalide → erreur générique, pas de cookie", async () => {
    const result = await loginClientAction({
      token: "token-completement-bidon-mais-long",
    });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/invalide ou expiré/i);
    expect(jar.has(CLIENT_COOKIE)).toBe(false);
  });

  it("accès révoqué APRÈS login → la session existante est refusée (guard DB)", async () => {
    loginAsOwner();
    const client = await createClient({ nom: "Client A", contact: null });
    const invite = await inviteClientAction({ clientId: client.id });
    if (!invite.ok) throw new Error("invite failed");
    const token = new URL(invite.data.url).searchParams.get("token")!;
    await expect(loginClientAction({ token })).rejects.toThrow();
    expect(await getClientId()).toBe(client.id);

    const [inv] = await listInvitations(client.id);
    const revoked = await revokeInvitationAction({ id: inv.id });
    expect(revoked.ok).toBe(true);

    // Le cookie est toujours là, mais le guard re-vérifie la DB.
    expect(jar.has(CLIENT_COOKIE)).toBe(true);
    expect(await getClientId()).toBeNull();
    await expect(requireClient()).rejects.toThrow(
      "REDIRECT:/espace/connexion",
    );
  });
});
