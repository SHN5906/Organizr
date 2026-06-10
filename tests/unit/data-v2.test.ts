import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { commandes, factures } from "@/lib/db/schema";
import { createClient } from "@/lib/data/clients";
import {
  createInvitation,
  hasActiveAccess,
  listInvitations,
  revokeInvitation,
  validateInvitationToken,
} from "@/lib/data/client-access";
import {
  createCommandeWithLignes,
  listCommandesForPeriode,
  markFacturees,
  setCommandeProjet,
} from "@/lib/data/commandes";
import { listCommandesForClient } from "@/lib/data/portal/commandes";
import {
  createFacture,
  getFacture,
  listFacturesForPeriode,
} from "@/lib/data/factures";
import { createProjet } from "@/lib/data/projets";
import { periodeBounds } from "@/lib/format";

const LIGNE_3_SIMPLES = {
  type: "reel_simple" as const,
  quantite: 3,
  brief: "3 reels événement",
  prixUnitaireCents: 2800,
};
const LIGNE_1_LONGUE = {
  type: "video_longue" as const,
  quantite: 1,
  brief: null,
  prixUnitaireCents: 7000,
};

async function seedClient(nom = "Client A") {
  return createClient({ nom, contact: null });
}

beforeEach(async () => {
  const db = await getDb();
  // db.delete ne réinitialise pas les colonnes identity (numéros).
  await db.execute(
    sql`TRUNCATE clients, projets, missions, client_access, commandes, commande_lignes, factures RESTART IDENTITY CASCADE`,
  );
});

describe("periodeBounds (fuseau applicatif)", () => {
  it("borne juin 2026 en Europe/Paris (UTC+2 l'été)", () => {
    const { start, end } = periodeBounds("2026-06", "Europe/Paris");
    expect(start.toISOString()).toBe("2026-05-31T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-30T22:00:00.000Z");
  });

  it("borne janvier (UTC+1 l'hiver)", () => {
    const { start } = periodeBounds("2026-01", "Europe/Paris");
    expect(start.toISOString()).toBe("2025-12-31T23:00:00.000Z");
  });
});

describe("client_access — cycle d'invitation", () => {
  it("crée une invitation : token clair retourné, seul le hash en DB", async () => {
    const client = await seedClient();
    const { token, expiresAt } = await createInvitation(client.id);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const invitations = await listInvitations(client.id);
    expect(invitations).toHaveLength(1);
    expect(invitations[0].tokenHash).not.toContain(token);
    expect(invitations[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("valide un token et met à jour lastUsedAt", async () => {
    const client = await seedClient();
    const { token } = await createInvitation(client.id);
    const result = await validateInvitationToken(token);
    expect(result?.clientId).toBe(client.id);
    expect((await listInvitations(client.id))[0].lastUsedAt).not.toBeNull();
  });

  it("rejette un token inconnu, révoqué ou expiré", async () => {
    const client = await seedClient();
    expect(await validateInvitationToken("token-bidon")).toBeNull();

    const { token } = await createInvitation(client.id);
    const [inv] = await listInvitations(client.id);
    await revokeInvitation(inv.id);
    expect(await validateInvitationToken(token)).toBeNull();

    const { token: token2 } = await createInvitation(client.id, {
      expiresInDays: -1, // déjà expiré
    });
    expect(await validateInvitationToken(token2)).toBeNull();
  });

  it("hasActiveAccess : vrai si au moins un accès valide, faux sinon (révocation effective)", async () => {
    const client = await seedClient();
    expect(await hasActiveAccess(client.id)).toBe(false);
    await createInvitation(client.id);
    expect(await hasActiveAccess(client.id)).toBe(true);
    const [inv] = await listInvitations(client.id);
    await revokeInvitation(inv.id);
    expect(await hasActiveAccess(client.id)).toBe(false);
  });
});

describe("commandes", () => {
  it("crée commande + lignes avec numéros séquentiels et prix snapshotés", async () => {
    const client = await seedClient();
    const c1 = await createCommandeWithLignes(client.id, [
      { ...LIGNE_3_SIMPLES, totalCents: 8400 },
      { ...LIGNE_1_LONGUE, totalCents: 7000 },
    ]);
    expect(c1.numero).toBe(1);
    expect(c1.statut).toBe("recue");
    expect(c1.lignes).toHaveLength(2);
    expect(c1.lignes[0].prixUnitaire).toBe("28.00");
    expect(c1.lignes[0].total).toBe("84.00");
    expect(c1.lignes[1].total).toBe("70.00");

    const c2 = await createCommandeWithLignes(client.id, [
      { ...LIGNE_1_LONGUE, totalCents: 7000 },
    ]);
    expect(c2.numero).toBe(2);
  });

  it("rattache un projet à la commande", async () => {
    const client = await seedClient();
    const projet = await createProjet({
      clientId: client.id,
      type: "montage_video",
      titre: "Commande #1 — Client A",
      description: null,
      statut: "a_faire",
      deadline: null,
    });
    const commande = await createCommandeWithLignes(client.id, [
      { ...LIGNE_1_LONGUE, totalCents: 7000 },
    ]);
    await setCommandeProjet(commande.id, projet.id);
    const [row] = await listCommandesForClient(client.id);
    expect(row.projetId).toBe(projet.id);
  });

  it("filtre par période en fuseau Paris (bord de mois inclus)", async () => {
    const client = await seedClient();
    const cJuin = await createCommandeWithLignes(client.id, [
      { ...LIGNE_1_LONGUE, totalCents: 7000 },
    ]);
    const cJuillet = await createCommandeWithLignes(client.id, [
      { ...LIGNE_1_LONGUE, totalCents: 7000 },
    ]);
    const db = await getDb();
    // 30/06 23h30 UTC = 01/07 01h30 à Paris → période 2026-07.
    await db.execute(
      sql`UPDATE commandes SET created_at = '2026-06-15T10:00:00Z' WHERE id = ${cJuin.id}`,
    );
    await db.execute(
      sql`UPDATE commandes SET created_at = '2026-06-30T23:30:00Z' WHERE id = ${cJuillet.id}`,
    );

    const juin = await listCommandesForPeriode("2026-06");
    expect(juin.map((c) => c.id)).toEqual([cJuin.id]);
    const juillet = await listCommandesForPeriode("2026-07");
    expect(juillet.map((c) => c.id)).toEqual([cJuillet.id]);
    expect(juillet[0].client.nom).toBe("Client A");
    expect(juillet[0].lignes).toHaveLength(1);
  });

  it("isolation : le portail d'un client ne voit jamais les commandes d'un autre", async () => {
    const a = await seedClient("Client A");
    const b = await seedClient("Client B");
    await createCommandeWithLignes(a.id, [
      { ...LIGNE_3_SIMPLES, totalCents: 8400 },
    ]);
    expect(await listCommandesForClient(b.id)).toHaveLength(0);
    expect(await listCommandesForClient(a.id)).toHaveLength(1);
  });
});

describe("factures", () => {
  const SNAPSHOT = [
    {
      commandeNumero: 1,
      type: "reel_simple" as const,
      label: "Reel — montage simple",
      quantite: 3,
      prixUnitaire: "28.00",
      total: "84.00",
    },
  ];

  it("numérote FAC-période-XXX et incrémente la révision par client×période", async () => {
    const a = await seedClient("Client A");
    const b = await seedClient("Client B");

    const f1 = await createFacture({
      clientId: a.id,
      periode: "2026-06",
      lignes: SNAPSHOT,
      totalTtc: "84.00",
    });
    expect(f1.numero).toBe("FAC-2026-06-001");
    expect(f1.revision).toBe(1);

    const f2 = await createFacture({
      clientId: b.id,
      periode: "2026-06",
      lignes: SNAPSHOT,
      totalTtc: "84.00",
    });
    expect(f2.numero).toBe("FAC-2026-06-002");
    expect(f2.revision).toBe(1);

    const f3 = await createFacture({
      clientId: a.id,
      periode: "2026-06",
      lignes: SNAPSHOT,
      totalTtc: "84.00",
    });
    expect(f3.numero).toBe("FAC-2026-06-003");
    expect(f3.revision).toBe(2);

    const liste = await listFacturesForPeriode("2026-06");
    expect(liste).toHaveLength(3);
  });

  it("le snapshot JSONB est figé même si les commandes changent ensuite", async () => {
    const client = await seedClient();
    const commande = await createCommandeWithLignes(client.id, [
      { ...LIGNE_3_SIMPLES, totalCents: 8400 },
    ]);
    const facture = await createFacture({
      clientId: client.id,
      periode: "2026-06",
      lignes: SNAPSHOT,
      totalTtc: "84.00",
    });
    await markFacturees([commande.id], facture.id);

    const db = await getDb();
    await db.execute(
      sql`UPDATE commande_lignes SET total = '999.00', prix_unitaire = '333.00'`,
    );

    const relue = await getFacture(facture.id);
    expect(relue?.lignes).toEqual(SNAPSHOT);
    expect(relue?.totalTtc).toBe("84.00");

    const [c] = await listCommandesForClient(client.id);
    expect(c.statut).toBe("facturee");
    expect(c.factureId).toBe(facture.id);
  });
});
