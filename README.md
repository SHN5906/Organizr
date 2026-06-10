# Organizr

Application solo pour planifier le travail de montage vidéo et organiser la
production de sites web clients. Ajouter une mission en quelques secondes,
visualiser tous les projets et deadlines sur un calendrier mensuel monochrome.

**Production** : https://organizr-zeta.vercel.app (Vercel `shn5906s-projects` +
Neon `neon-coffee-pocket`). Raccourci : `n` → nouvelle mission.

## v2 — Espace client

- **Interne** (owner) : protégé par mot de passe (`/connexion`, `OWNER_PASSWORD`).
- **Espace client** (`/espace`) : accès par **lien magique** généré depuis
  Projets → « Inviter » (lien valable 14 j, session 90 j, révocable à effet
  immédiat). Aucun mot de passe client, aucun email automatique : tu copies
  le lien et l'envoies toi-même.
- **Commandes** : le client choisit ses prestations (grille ReNew Editing TTC,
  dégressive par ligne ; vidéo longue 70 €), la commande crée automatiquement
  un projet + une mission par vidéo dans ton dashboard.
- **Facturation** (`/facturation`) : par client × mois, facture print-ready
  `FAC-AAAA-MM-XXX` (impression PDF par le navigateur), régénération = révision.

Variables d'environnement supplémentaires : `OWNER_PASSWORD`, `SESSION_SECRET`
(générées, posées sur Vercel — voir `.env.example`).

## Stack

Next.js 15 (App Router, React 19, Server Actions) · TypeScript strict · pnpm ·
Tailwind CSS v4 + shadcn/ui · Drizzle ORM + Postgres (Neon en prod, PGlite en
local) · Zod + React Hook Form · date-fns · Vitest/RTL + Playwright.

## Démarrage

```bash
pnpm install
cp .env.example .env   # optionnel — sans DATABASE_URL, PGlite est utilisé
pnpm dev               # http://localhost:3000
```

Sans `DATABASE_URL`, la base est un Postgres embarqué (PGlite) stocké dans
`.pglite/`, migré automatiquement au démarrage. Avec `DATABASE_URL` (Neon),
applique les migrations : `pnpm db:migrate`.

⚠️ Après un `vercel env pull`, `.env.local` contient la `DATABASE_URL` de
**production** — `.env.development.local` (non versionné) force `pnpm dev`
sur PGlite pour ne jamais développer contre la prod :

```bash
printf 'DATABASE_URL=\nPGLITE_DATA_DIR=.pglite\n' > .env.development.local
```

## Scripts

| Script | Rôle |
|---|---|
| `pnpm dev` | serveur de dev (Turbopack) |
| `pnpm build` / `pnpm start` | build et serveur de production |
| `pnpm lint` | ESLint |
| `pnpm test` / `pnpm test:watch` | tests unitaires Vitest (node + jsdom) |
| `pnpm e2e` | parcours e2e Playwright (build de prod + PGlite jetable) |
| `pnpm db:generate` | génère une migration Drizzle depuis `lib/db/schema.ts` |
| `pnpm db:migrate` | applique les migrations (`DATABASE_URL` requis) |
| `pnpm db:studio` | Drizzle Studio |

## Variables d'environnement

Documentées dans [.env.example](.env.example) : `DATABASE_URL` (Neon, optionnel
en local), `PGLITE_DIR` (avancé).

## Architecture

- `lib/db/` — schéma Drizzle + singleton double-driver (neon-http ↔ PGlite)
- `lib/data/` — **seul** point d'accès aux données (server-only) ; le futur
  portail client `/share/[token]` s'appuiera sur cette couche sans toucher l'UI
- `lib/actions/` — server actions (validation Zod côté serveur)
- `lib/validation/` — schémas Zod partagés client/serveur
- `lib/calendar.ts` — logique pure de la grille mensuelle (testée)
- `app/` — pages : `/` calendrier, `/dashboard` missions, `/projets` gestion
- `drizzle/` — migrations SQL versionnées

Le plan de construction détaillé vit dans [plans/organizr-v1.md](plans/organizr-v1.md).
