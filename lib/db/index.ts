import "server-only";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import {
  drizzle as drizzleNeon,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import type { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

// Une seule API pour deux drivers : Neon (prod / DATABASE_URL) et PGlite
// (local / e2e). L'API de query est identique ; v1 s'interdit les
// transactions interactives (non supportées par neon-http), donc le cast
// PGlite → DB est sûr.
export type DB = NeonHttpDatabase<typeof schema>;

function databaseUrl(): string | undefined {
  // Chaîne vide = absent : playwright force DATABASE_URL="" pour garantir
  // que l'e2e n'écrive jamais dans Neon.
  return process.env.DATABASE_URL?.trim() || undefined;
}

/** Crée une base PGlite migrée. Exporté pour les tests de migrations. */
export async function createPgliteDb(
  dataDir: string,
): Promise<{ db: DB; pglite: PGlite }> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  const pglite = await PGlite.create(dataDir);
  const db = drizzlePglite(pglite, { schema });
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  return { db: db as unknown as DB, pglite };
}

async function initDb(): Promise<DB> {
  const url = databaseUrl();
  if (url) {
    return drizzleNeon(neon(url), { schema });
  }

  // Garde-fou : jamais de PGlite éphémère silencieuse en production.
  // L'e2e (next start, NODE_ENV=production) est légitime car il fixe
  // explicitement PGLITE_DATA_DIR.
  const explicitDir = process.env.PGLITE_DATA_DIR;
  if (process.env.VERCEL || (process.env.NODE_ENV === "production" && !explicitDir)) {
    throw new Error(
      "DATABASE_URL manquant en production — configurer la base Neon.",
    );
  }

  const { db } = await createPgliteDb(explicitDir || ".pglite");
  return db;
}

type GlobalWithDb = typeof globalThis & { __organizrDbPromise?: Promise<DB> };

/**
 * Singleton : on met en cache la PROMESSE (pas l'instance) sur globalThis
 * pour survivre au HMR de next dev et éviter une double init concurrente
 * de PGlite sur le même dossier.
 */
export function getDb(): Promise<DB> {
  const g = globalThis as GlobalWithDb;
  if (!g.__organizrDbPromise) {
    g.__organizrDbPromise = initDb();
  }
  return g.__organizrDbPromise;
}
