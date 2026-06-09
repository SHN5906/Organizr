import { defineConfig } from "drizzle-kit";

// drizzle-kit ne charge pas les fichiers .env de Next : on le fait ici.
// `generate` fonctionne sans DATABASE_URL ; `migrate`/`studio` l'exigent
// (Neon uniquement — côté PGlite les migrations passent par le migrator
// programmatique de lib/db). Ne jamais throw ici.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // fichier absent — ok
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
