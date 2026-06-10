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
  headers: async () => new Headers({ host: "localhost:3000" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getDb } from "@/lib/db";
import { createCommandeAction } from "@/lib/actions/commandes";
import {
  deleteFactureAction,
  generateFactureAction,
} from "@/lib/actions/factures";
import {
  CLIENT_COOKIE,
  OWNER_COOKIE,
  signSession,
} from "@/lib/auth/session";
import { createClient } from "@/lib/data/clients";
import { createInvitation } from "@/lib/data/client-access";
import { getBrief } from "@/lib/data/briefs";
import { listCommandesForClient } from "@/lib/data/portal/commandes";
import { getFacture } from "@/lib/data/factures";
import { listMissions } from "@/lib/data/missions";
import { listProjets } from "@/lib/data/projets";

async function seedClientWithSession(nom = "Client A") {
  const client = await createClient({ nom, contact: null });
  await createInvitation(client.id); // requireClient vérifie l'accès actif en DB
  jar.set(
    CLIENT_COOKIE,
    signSession({ sub: client.id, role: "client" }, 3600),
  );
  return client;
}

function loginAsOwner() {
  jar.set(OWNER_COOKIE, signSession({ sub: "owner", role: "owner" }, 3600));
}

const COMMANDE_154 = {
  lignes: [
    { type: "reel_simple", quantite: 3, brief: "3 reels événement" },
    { type: "video_longue", quantite: 1, brief: "" },
  ],
};

beforeEach(async () => {
  vi.stubEnv("SESSION_SECRET", "secret-de-test-suffisamment-long!");
  jar.clear();
  const db = await getDb();
  await db.execute(
    sql`TRUNCATE clients, projets, missions, client_access, commandes, commande_lignes, factures RESTART IDENTITY CASCADE`,
  );
});

describe("createCommandeAction", () => {
  it("refusée sans session client", async () => {
    await expect(createCommandeAction(COMMANDE_154)).rejects.toThrow(
      "REDIRECT:/espace/connexion",
    );
  });

  it("crée commande + projet + 1 mission par vidéo, prix recalculés serveur", async () => {
    const client = await seedClientWithSession();
    const result = await createCommandeAction({
      lignes: [
        // Prix bidons envoyés par le client : absents du schéma → ignorés.
        { ...COMMANDE_154.lignes[0], prixUnitaire: "0.01", total: "0.01" },
        COMMANDE_154.lignes[1],
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.numero).toBe(1);

    const [commande] = await listCommandesForClient(client.id);
    expect(commande.lignes.map((l) => [l.prixUnitaire, l.total])).toEqual([
      ["28.00", "84.00"],
      ["70.00", "70.00"],
    ]);
    expect(commande.lignes[0].brief).toBe("3 reels événement");

    const projets = await listProjets();
    expect(projets).toHaveLength(1);
    expect(projets[0].titre).toBe("Commande #1 — Client A");
    expect(projets[0].type).toBe("montage_video");
    expect(commande.projetId).toBe(projets[0].id);

    const missions = await listMissions({});
    expect(missions).toHaveLength(4);
    expect(missions.every((m) => m.statut === "a_faire")).toBe(true);
    expect(missions.every((m) => m.projetId === projets[0].id)).toBe(true);
    const titres = missions.map((m) => m.titre).sort();
    expect(titres).toContain("Reel — montage simple 1/3 — Commande #1");
    expect(titres).toContain("Reel — montage simple 3/3 — Commande #1");
    expect(titres).toContain("Vidéo longue 1/1 — Commande #1");
    expect(
      missions.find((m) => m.titre.startsWith("Reel — montage simple 1/3"))
        ?.notes,
    ).toBe("3 reels événement");
  });

  it("enregistre le tip (euros → centimes) et le refuse négatif", async () => {
    const client = await seedClientWithSession();
    const result = await createCommandeAction({
      lignes: [{ type: "video_longue", quantite: 1 }],
      tipEuros: 6,
    });
    expect(result.ok).toBe(true);
    const [commande] = await listCommandesForClient(client.id);
    expect(commande.tip).toBe("6.00");

    const negatif = await createCommandeAction({
      lignes: [{ type: "video_longue", quantite: 1 }],
      tipEuros: -1,
    });
    expect(negatif.ok).toBe(false);
  });

  it("FormData : enregistre plusieurs liens titrés + brief PDF (signature vérifiée)", async () => {
    const client = await seedClientWithSession();
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        lignes: [{ type: "video_essentiel", quantite: 2 }],
        liens: [
          { titre: "Rushs jour 1", url: "https://www.swisstransfer.com/d/abc" },
          { titre: "", url: "https://www.swisstransfer.com/d/def" },
        ],
      }),
    );
    fd.set(
      "brief",
      new File([Buffer.from("%PDF-1.4\nfake\n%%EOF")], "brief juin.pdf", {
        type: "application/pdf",
      }),
    );
    const result = await createCommandeAction(fd);
    expect(result.ok).toBe(true);

    const [commande] = await listCommandesForClient(client.id);
    // video_essentiel : 15 €/u recalculé serveur.
    expect(commande.lignes[0].total).toBe("30.00");
    expect(commande.liens.map((l) => [l.titre, l.url])).toEqual([
      ["Rushs jour 1", "https://www.swisstransfer.com/d/abc"],
      [null, "https://www.swisstransfer.com/d/def"],
    ]);
    expect(commande.briefNom).toBe("brief juin.pdf");
    const brief = await getBrief(commande.id);
    expect(Buffer.from(brief!.contenu, "base64").toString()).toContain(
      "%PDF-1.4",
    );
  });

  it("refuse un fichier qui n'est pas un vrai PDF et un lien non-https", async () => {
    await seedClientWithSession();
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({ lignes: [{ type: "video_longue", quantite: 1 }] }),
    );
    fd.set(
      "brief",
      new File([Buffer.from("<html>pas un pdf</html>")], "brief.pdf", {
        type: "application/pdf",
      }),
    );
    const faux = await createCommandeAction(fd);
    expect(faux.ok).toBe(false);
    if (!faux.ok) expect(faux.fieldErrors?.brief?.[0]).toMatch(/pdf/i);

    const lienHttp = await createCommandeAction({
      lignes: [{ type: "video_longue", quantite: 1 }],
      liens: [{ titre: "", url: "http://pas-https.com/x" }],
    });
    expect(lienHttp.ok).toBe(false);

    expect(await listMissions({})).toHaveLength(0);
  });

  it("rejette quantité hors bornes, type inconnu, commande vide", async () => {
    await seedClientWithSession();
    for (const lignes of [
      [{ type: "reel_simple", quantite: 0 }],
      [{ type: "reel_simple", quantite: 51 }],
      [{ type: "podcast", quantite: 1 }],
      [],
    ]) {
      const result = await createCommandeAction({ lignes });
      expect(result.ok, JSON.stringify(lignes)).toBe(false);
      if (!result.ok) expect(result.fieldErrors ?? result.error).toBeTruthy();
    }
    expect(await listMissions({})).toHaveLength(0);
  });
});

describe("generateFactureAction", () => {
  async function seedCommandeEnJuin() {
    const client = await seedClientWithSession();
    await createCommandeAction(COMMANDE_154);
    const db = await getDb();
    await db.execute(
      sql`UPDATE commandes SET created_at = '2026-06-10T10:00:00Z'`,
    );
    return client;
  }

  it("réservée à l'owner", async () => {
    await expect(
      generateFactureAction({ clientId: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff", periode: "2026-06" }),
    ).rejects.toThrow("REDIRECT:/connexion");
  });

  it("période sans commande → erreur propre", async () => {
    const client = await seedCommandeEnJuin();
    loginAsOwner();
    const result = await generateFactureAction({
      clientId: client.id,
      periode: "2026-01",
    });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/aucune commande/i);
  });

  it("génère la facture : snapshot, total 154,00 €, commandes facturées", async () => {
    const client = await seedCommandeEnJuin();
    loginAsOwner();
    const result = await generateFactureAction({
      clientId: client.id,
      periode: "2026-06",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.numero).toBe("FAC-2026-06-001");
    expect(result.data.revision).toBe(1);

    const facture = await getFacture(result.data.factureId);
    expect(facture?.totalTtc).toBe("154.00");
    expect(facture?.lignes).toHaveLength(2);
    expect(facture?.lignes[0]).toMatchObject({
      commandeNumero: 1,
      label: "Reel — montage simple",
      quantite: 3,
      total: "84.00",
    });

    const [commande] = await listCommandesForClient(client.id);
    expect(commande.statut).toBe("facturee");
    expect(commande.factureId).toBe(result.data.factureId);
  });

  it("le tip apparaît sur la facture comme ligne dédiée et entre dans le total", async () => {
    const client = await seedClientWithSession();
    await createCommandeAction({ ...COMMANDE_154, tipEuros: 6 });
    const db = await getDb();
    await db.execute(
      sql`UPDATE commandes SET created_at = '2026-06-10T10:00:00Z'`,
    );
    loginAsOwner();
    const result = await generateFactureAction({
      clientId: client.id,
      periode: "2026-06",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const facture = await getFacture(result.data.factureId);
    expect(facture?.totalTtc).toBe("160.00"); // 154 + 6 de tip
    const tipLigne = facture?.lignes.find((l) => l.type === "tip");
    expect(tipLigne).toMatchObject({ label: "Tip", total: "6.00" });
  });

  it("deleteFactureAction : owner only, supprime une ancienne révision, refuse la dernière", async () => {
    const client = await seedCommandeEnJuin();
    loginAsOwner();
    const rev1 = await generateFactureAction({
      clientId: client.id,
      periode: "2026-06",
    });
    if (!rev1.ok) throw new Error("rev1 ko");
    const rev2 = await generateFactureAction({
      clientId: client.id,
      periode: "2026-06",
    });
    if (!rev2.ok) throw new Error("rev2 ko");

    // Pas owner → redirect.
    jar.clear();
    await expect(
      deleteFactureAction({ id: rev1.data.factureId }),
    ).rejects.toThrow("REDIRECT:/connexion");

    loginAsOwner();
    // La DERNIÈRE révision est refusée, même en forgeant la requête.
    const refus = await deleteFactureAction({ id: rev2.data.factureId });
    expect(refus.ok).toBe(false);
    if (!refus.ok) expect(refus.error).toMatch(/dernière révision/i);

    // L'ancienne révision part ; la dernière et les commandes restent intactes.
    const ok = await deleteFactureAction({ id: rev1.data.factureId });
    expect(ok.ok).toBe(true);
    expect(await getFacture(rev1.data.factureId)).toBeNull();
    expect(await getFacture(rev2.data.factureId)).not.toBeNull();
    const [commande] = await listCommandesForClient(client.id);
    expect(commande.statut).toBe("facturee");
    expect(commande.factureId).toBe(rev2.data.factureId);

    // Facture inexistante → introuvable propre.
    const fantome = await deleteFactureAction({ id: rev1.data.factureId });
    expect(fantome.ok).toBe(false);
  });

  it("régénération : révision 2 avec TOUTES les commandes de la période, factureId re-pointés", async () => {
    const client = await seedCommandeEnJuin();
    loginAsOwner();
    const first = await generateFactureAction({
      clientId: client.id,
      periode: "2026-06",
    });
    if (!first.ok) throw new Error("première facture ko");

    // Nouvelle commande dans la même période, après la facture.
    jar.set(CLIENT_COOKIE, signSession({ sub: client.id, role: "client" }, 3600));
    await createCommandeAction({
      lignes: [{ type: "video_longue", quantite: 1 }],
    });
    const db = await getDb();
    await db.execute(
      sql`UPDATE commandes SET created_at = '2026-06-20T10:00:00Z' WHERE numero = 2`,
    );

    loginAsOwner();
    const second = await generateFactureAction({
      clientId: client.id,
      periode: "2026-06",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.revision).toBe(2);
    expect(second.data.numero).toBe("FAC-2026-06-002");

    const facture = await getFacture(second.data.factureId);
    expect(facture?.lignes).toHaveLength(3); // les 2 commandes, re-snapshotées
    expect(facture?.totalTtc).toBe("224.00"); // 154 + 70

    const commandes = await listCommandesForClient(client.id);
    expect(
      commandes.every((c) => c.factureId === second.data.factureId),
    ).toBe(true);
  });
});
