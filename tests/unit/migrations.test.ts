import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db";

const TABLES_SQL = `select table_name from information_schema.tables
   where table_schema = 'public' and table_type = 'BASE TABLE'
   order by table_name`;

let dir: string;

afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe("migrations Drizzle (PGlite)", () => {
  it("crée le schéma sur base vierge, est idempotente au redémarrage, et rejouable après wipe", async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "organizr-mig-"));
    const dataDir = path.join(dir, "db");

    // 1. Base vierge → tables créées
    const first = await createPgliteDb(dataDir);
    const t1 = await first.pglite.query<{ table_name: string }>(TABLES_SQL);
    const names1 = t1.rows.map((r) => r.table_name);
    expect(names1).toContain("clients");
    expect(names1).toContain("projets");
    expect(names1).toContain("missions");
    await first.pglite.query(`insert into clients (nom) values ('Persisté')`);
    await first.pglite.close();

    // 2. Réouverture du même dossier → migrate() re-tourne = no-op, données intactes
    const second = await createPgliteDb(dataDir);
    const kept = await second.pglite.query<{ nom: string }>(`select nom from clients`);
    expect(kept.rows.map((r) => r.nom)).toEqual(["Persisté"]);
    await second.pglite.close();

    // 3. Wipe complet → rejouable de zéro
    await rm(dataDir, { recursive: true, force: true });
    const third = await createPgliteDb(dataDir);
    const t3 = await third.pglite.query<{ table_name: string }>(TABLES_SQL);
    expect(t3.rows.map((r) => r.table_name)).toEqual(names1);
    const empty = await third.pglite.query(`select count(*)::int as n from clients`);
    expect((empty.rows[0] as { n: number }).n).toBe(0);
    await third.pglite.close();
  });
});
