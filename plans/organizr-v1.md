# Organizr v1 — Plan de construction (rév. 2 — post review adversariale)

> Application web **solo** (pas d'auth) pour planifier le travail de montage vidéo et la
> production de sites web. Objectif central : **ajouter une mission en < 15 s** et
> **visualiser tous les projets/deadlines sur un calendrier mensuel monochrome**.

- **Répertoire** : `/Users/sohan/Organizr` — mode direct : commits sur `main`, pas de remote/PR.
- **Toolchain vérifiée** : node 22, pnpm 10, git, gh (auth ok), Vercel CLI (auth ok). Pas de Postgres local, Docker daemon éteint (→ PGlite en local).
- **Rév. 2** : 4 relecteurs adversariaux (spec-compliance, cold-start, tech-pitfalls, scope-quality) — findings critiques/majeurs intégrés ci-dessous.

## Stack (imposée — ne pas dévier)

| Domaine | Choix |
|---|---|
| Framework | Next.js 15.5 (App Router, React 19, Server Components + Server Actions) |
| Langage | TypeScript `strict`, gestionnaire **pnpm** |
| UI | Tailwind CSS **v4** + shadcn/ui (Radix), thème **100 % monochrome** |
| ORM/DB | Drizzle ORM + Postgres **Neon** (prod, via Vercel) ; **PGlite** en local/e2e (même dialecte pg, mêmes migrations — justifié : pas de Postgres local ni Docker) |
| Validation | Zod 4 (schémas partagés client/serveur) + React Hook Form (resolvers ≥ 5.1 pour Zod 4) |
| Calendrier | Grille mensuelle **custom** avec date-fns 4 (PAS de FullCalendar/react-big-calendar) ; react-day-picker **9** (requis par shadcn Calendar — v10 incompatible) |
| Tests | Vitest 4 + RTL 16 (+ `@testing-library/dom` explicite), Playwright 1.60 |
| Déploiement | Vercel + Neon |

## Décisions d'architecture (s'appliquent à tous les steps)

1. **Double driver DB, une seule API** — `lib/db/index.ts` exporte **`getDb(): Promise<DB>`** (l'init PGlite + migrations est async ; on met en cache **la promesse** sur `globalThis` pour survivre au HMR et éviter la double init concurrente) :
   - `DATABASE_URL` non vide (`process.env.DATABASE_URL?.trim() || undefined`) → `drizzle-orm/neon-http` + `@neondatabase/serverless`.
   - Sinon → `drizzle-orm/pglite` + `@electric-sql/pglite`, dossier **`PGLITE_DATA_DIR`** (défaut `.pglite`, valeurs admises : `memory://` pour les tests, `.pglite-e2e` pour l'e2e), **migrations appliquées automatiquement** via `drizzle-orm/pglite/migrator` (`migrationsFolder: './drizzle'`).
   - **Type** : `export type DB = NeonHttpDatabase<typeof schema>` ; l'instance PGlite est castée (`as unknown as DB`) — API de query identique, et v1 s'interdit les transactions interactives (non supportées par neon-http).
   - **Garde-fou prod** : si (`VERCEL` ou `NODE_ENV==='production'` hors e2e) et pas de `DATABASE_URL` → `throw` (jamais de PGlite éphémère silencieuse en prod). L'e2e pose `PGLITE_DATA_DIR=.pglite-e2e` + `DATABASE_URL=""` explicitement.
   - `next.config.ts` : `serverExternalPackages: ['@electric-sql/pglite']` (WASM/assets non bundlables). Aucune page en runtime edge.
2. **Pages DB = dynamiques** — `export const dynamic = 'force-dynamic'` sur TOUTE page qui touche `lib/data` (`/`, `/dashboard`, `/projets`) : sinon `next build` prerend la page, ouvre PGlite au build (lock inter-process) et fige le HTML. Vérif : `pnpm build` ne crée pas `.pglite/`.
3. **Next 15** : `searchParams`/`params` sont des **Promises** (`const sp = await searchParams`).
4. **Dates sans timezone** — `datePlanifiee`/`deadline` : colonnes `date` Drizzle `mode: 'string'` (`YYYY-MM-DD` de bout en bout). `createdAt` : `timestamptz`. Jamais `new Date('YYYY-MM-DD')` pour l'affichage.
5. **Couche d'accès isolée** — TOUT accès DB passe par `lib/data/*` (`import 'server-only'`). Actions et pages n'importent jamais `lib/db` directement. Vérif : `grep -rn "@/lib/db" app components lib/actions lib/validation` → 0. (Vitest : alias `server-only` → `tests/stubs/server-only.ts`.)
6. **Filtres/navigation par URL** — searchParams pour filtres dashboard et mois calendrier.
7. **Statuts** — `pgEnum('statut', ['a_faire','en_cours','en_revue','termine'])` partagé ; `pgEnum('type_projet', ['montage_video','site_web'])`. Labels FR centralisés dans `lib/validation/labels.ts`.
8. **Validation partagée** — schémas Zod dans `lib/validation/*` (sans `server-only`), consommés par RHF côté client ET re-parsés dans chaque action côté serveur.
9. **Server actions** — `'use server'` dans `lib/actions/*`. `(input: unknown) => Promise<ActionResult>` ; `ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string,string[]> }` ; `revalidatePath` après mutation ; jamais d'erreur DB brute exposée.
10. **Contrat calendrier (frontière P1↔P4)** — exporté par `lib/data/missions.ts` :
    ```ts
    type CalendarItem = {
      kind: 'mission_planifiee' | 'deadline_mission' | 'deadline_projet';
      date: string;            // YYYY-MM-DD
      titre: string;           // titre mission ou projet
      missionId?: string; projetId: string;
      statut: 'a_faire'|'en_cours'|'en_revue'|'termine';
      clientNom: string; projetTitre: string;
    }
    ```
    `getCalendarItems(start, end): Promise<CalendarItem[]>` (missions planifiées + deadlines missions + deadlines projets dans l'intervalle).
11. **shareToken** — colonne `text` nullable sur `projets`, jamais lue/écrite par l'UI v1.

## Arborescence cible

```
app/
  layout.tsx              # fonts Geist, AppHeader, QuickAddProvider (raccourci "n", projets pré-chargés serveur)
  page.tsx                # HomePage = calendrier mensuel (?month=YYYY-MM) — force-dynamic
  globals.css             # tokens design N&B (pass "impeccable" avant P3)
  dashboard/page.tsx      # missions filtrables (?type=&statut=&client=&sort=) — force-dynamic
  projets/page.tsx        # gestion légère projets+clients (create-only) — force-dynamic
components/
  ui/*                    # primitives shadcn (button, input, textarea, label, select, dialog, popover, calendar, badge, dropdown-menu, field, separator)
  shell/                  # AppHeader, NavLink
  missions/               # QuickAddProvider, QuickAddMissionDialog, MissionForm (partagé créa/édition), MissionRow, StatutBadge, MissionFilters, EditMissionDialog
  calendar/               # MonthGrid, DayCell (data-date), DayDetailDialog, MonthNav
  projets/                # ProjetFormDialog, ClientFormDialog (liste simple, PAS de grille de cards)
lib/
  db/index.ts             # getDb(): Promise<DB> double-driver ; db/schema.ts
  data/clients.ts|projets.ts|missions.ts   # server-only, seul point d'accès DB, exporte CalendarItem
  actions/clients.ts|projets.ts|missions.ts # 'use server'
  validation/clients.ts|projets.ts|missions.ts|labels.ts  # Zod + labels FR enums
  calendar.ts             # buildMonthGrid(month, today), parseMonthParam(s, today), groupCalendarItems — purs, testés
drizzle/                  # migrations SQL versionnées
tests/ (vitest: unit/, ui/, stubs/)   e2e/ (playwright)
```

## Modèle de données (Drizzle)

```
clients   { id uuid pk default random, nom text NOT NULL, contact text NULL, createdAt timestamptz default now }
projets   { id uuid pk, clientId uuid FK→clients (cascade), type type_projet NOT NULL,
            titre text NOT NULL, description text NULL, statut statut NOT NULL default 'a_faire',
            deadline date NULL, shareToken text NULL, createdAt timestamptz }
missions  { id uuid pk, projetId uuid FK→projets (cascade), titre text NOT NULL,
            statut statut NOT NULL default 'a_faire', datePlanifiee date NULL,
            deadline date NULL, notes text NULL, createdAt timestamptz }
```

Index : `missions(projetId)`, `missions(datePlanifiee)`, `missions(deadline)`, `projets(clientId)`.

## Design (anti « IA slop ») — contraintes non négociables

- Palette **strictement** noir/blanc/gris (au plus UN gris d'accent). Zéro gradient, glassmorphism, emoji décoratif, ombre colorée.
- **Pas de template admin générique** : aucune primitive shadcn visible avec ses styles par défaut ; la liste missions n'est pas le `<Table>` shadcn de base ; les 4 statuts se distinguent par **forme/remplissage/contour** (pas seulement une teinte) ; le calendrier custom est l'écran signature.
- Typo Geist, échelle 4/8 px, blanc généreux, hiérarchie nette. Transitions 150–200 ms, focus visibles, états vides travaillés.
- Contraste AA, navigation clavier complète, rôles ARIA corrects.

## Hors périmètre v1 (NE PAS FAIRE)

Auth ; UI client/pages publiques ; emails ; temps réel ; mobile natif ; facturation ; drag-and-drop ; vues semaine/jour ; **édition/suppression de projets et clients** (create-only assumé : statut/deadline projet immuables en v1) ; dépendance UI lourde.

---

# Steps

> Workflow par phase : **/tdd → implémentation → /code-review → /verify**.

## ✅ P0 — Scaffold & outillage — **FAIT** (commit `chore(p0)`, amendé post-review)

Livré : Next 15.5.19 / React 19.1 / Tailwind v4 (CNA via dossier temp, package renommé `organizr`) ; shadcn init `-b radix -p nova` (neutral, CSS vars) + 12 composants (`field` remplace `form`) ; react-day-picker **repinné v9** (v10 casse calendar.tsx) ; deps P0.4 + `@testing-library/dom`, `@types/node@22` ; `--turbopack` retiré du build ; vitest 4 (projets node+jsdom, alias `server-only`→stub) ; playwright (webServer `rm -rf .pglite-e2e && pnpm build && pnpm start -p 3100`, env `DATABASE_URL=""` + `PGLITE_DATA_DIR=.pglite-e2e`, PAS de globalSetup — il s'exécute APRÈS le démarrage du webServer) ; chromium installé ; `next.config.ts` `serverExternalPackages` ; `.gitignore` `!.env.example` (sinon ignoré par `.env*`) + `.pglite*/` ; smoke test ; README ; `.env.example` (`DATABASE_URL`, `PGLITE_DATA_DIR`).

## P1 — Couche données (validation + schéma + migrations + data layer)

**Contexte** : P0 livré. Décisions 1–5, 7–8, 10–11.

**Tâches (TDD : tests d'abord)**
1. Tests `tests/unit/validation.test.ts` : schémas createClient/createProjet/createMission/updateMission — requis, enums, dates regex `YYYY-MM-DD`, chaînes vides → null/undefined, uuid.
2. Tests `tests/unit/data.test.ts` contre PGlite `memory://` (`PGLITE_DATA_DIR=memory://` posé par le test) : create/list clients-projets-missions, filtres type/statut/client, tri deadline, `getCalendarItems` (3 kinds, bornes incluses).
3. Test `tests/unit/migrations.test.ts` : rejouabilité — instancier la factory sur un dossier temp, vérifier les tables (`information_schema`), détruire, recommencer ; 2e `migrate()` sur la même base = no-op.
4. `lib/validation/{clients,projets,missions,labels}.ts` — schémas Zod + labels FR des enums (`a_faire` → « À faire », `montage_video` → « Montage vidéo », etc.).
5. `lib/db/schema.ts` + `drizzle.config.ts` (`dialect: 'postgresql'`, `out: './drizzle'`, `dbCredentials: { url: process.env.DATABASE_URL ?? '' }` — **jamais** de garde qui throw : `generate` doit marcher sans DB).
6. `pnpm db:generate` → migration SQL initiale versionnée.
7. `lib/db/index.ts` : `getDb()` selon décision 1 (promesse cachée, PGLITE_DATA_DIR, garde-fou prod, cast DB).
8. `lib/data/*` : `listClients`, `createClient`, `listProjets` (join client, tri createdAt desc), `createProjet`, `listMissions({type?, statut?, clientId?, sort})` (join projet+client), `getCalendarItems(start,end)`, `createMission`, `updateMission`, `deleteMission`.

**Exit criteria** : `pnpm test` ✓ ; `pnpm build` ✓ **et ne crée pas `.pglite/`** ; migration dans `drizzle/` commitée ; `grep -rn "@/lib/db" app components` → 0.

## P2 — Server actions CRUD

**Tâches (TDD)**
1. Tests `tests/unit/actions.test.ts` : **chaque fichier de test d'action DOIT mocker `vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))`** (sinon crash « static generation store missing ») ; input invalide → `fieldErrors` ; valide → écrit en DB (PGlite memory) ; erreur DB → `{ok:false}` générique.
2. `lib/actions/clients.ts` (`createClientAction`), `projets.ts` (`createProjetAction`), `missions.ts` (`createMissionAction`, `updateMissionAction`, `updateMissionStatutAction`, `deleteMissionAction`).

**Exit criteria** : tests ✓, build ✓, `grep -rn "@/lib/db" lib/actions` → 0.

## DS — Design system N&B (skill **impeccable**, AVANT toute UI)

**Tâches** : tokens `globals.css` (`@theme` : échelle de gris, UN gris d'accent, typo Geist, espacement 4/8, rayons, durées 150–200 ms), focus, **identité au-delà des tokens** : hiérarchie typo réelle, densité/forme de la liste missions (pas le `<Table>` shadcn par défaut), StatutBadge — 4 statuts par forme/remplissage/contour, signature des états vides, calendrier = écran signature. Consigné dans `plans/design-system.md`.

**Exit criteria** : commande de vérif monochrome : aucun hex non-gris (canaux RGB inégaux), aucun `oklch` avec chroma > 0, aucune couleur nommée dans `app/globals.css` → 0 hit ; `plans/design-system.md` écrit ; build ✓.

## P3 — Dashboard missions + QuickAdd

**Tâches (TDD)**
1. Tests RTL `tests/ui/` : MissionForm (validation, erreurs, soumission), parsing searchParams dashboard (fonction pure).
2. `AppHeader` + `NavLink` (nav Calendrier/Dashboard/Projets, bouton « Nouvelle mission »), montés dans `layout.tsx`.
3. `QuickAddProvider` monté dans `layout.tsx` (état d'ouverture + listener `n`), **projets pré-chargés côté serveur dans le layout** (pas de fetch à l'ouverture) ; contient `QuickAddMissionDialog`. Raccourci `n` : guards input/textarea/contenteditable/`[role=combobox]`/`isComposing`/modificateurs/dialog déjà ouvert (état React, pas querySelector) + **`e.preventDefault()`** (sinon « n » tape dans le titre autofocusé). **Projet pré-sélectionné = plus récemment créé** → chemin nominal n → titre → Enter ≈ 6 s. **État vide (0 projet) : message + CTA « Créer un projet » → `/projets`**. Après succès : fermeture + la mission apparaît (revalidation) — pas de toast en v1.
4. `/dashboard` : liste server-rendered (`MissionRow`, `StatutBadge`, `MissionFilters`) — titre, projet, client, type, statut, dates ; filtres type/statut/client + tri deadline asc/desc via searchParams ; statut inline (dropdown → `updateMissionStatutAction`) ; **édition via `EditMissionDialog` (réutilise `MissionForm`, soumet `updateMissionAction`)** ; suppression avec confirmation ; état vide travaillé. `force-dynamic`.
5. `/projets` : liste simple groupée par client (PAS de grille de cards), `ProjetFormDialog` (+ deadline, type, description), `ClientFormDialog` ; 0 client → CTA « créer d'abord un client ». Create-only. `force-dynamic`.

**Exit criteria** : tests ✓, build ✓ ; checklist preview : (a) créer client→projet→mission via UI, (b) filtres+tri via URL, (c) `n` ouvre/projet présélectionné/Enter soumet, (d) état 0-projet du QuickAdd affiche le CTA.

## P4 — HomePage calendrier mensuel custom

**Tâches (TDD)**
1. Tests `tests/unit/calendar.test.ts` : `parseMonthParam(s, today)` (fallback mois de `today`, invalides), `buildMonthGrid(month, today)` (lun→dim, 4–6 semaines, hors-mois marqués, `isToday`), `groupCalendarItems` (par jour, 3 kinds). **`today` injecté en paramètre** (déterminisme).
2. `app/page.tsx` : `?month=` → `getCalendarItems` sur les bornes de la **grille** (pas du mois). `force-dynamic`.
3. `MonthGrid`/`DayCell` : 7 colonnes, en-têtes FR, aujourd'hui marqué, hors-mois atténués ; **mission planifiée = pastille pleine + titre ; deadline (mission ou projet) = marqueur creux/outline** ; « +N » si >3 items ; **chaque DayCell rend `data-date="YYYY-MM-DD"`** (contrat e2e).
4. `MonthNav` : ← / mois courant / → (liens `?month=`).
5. Clic ou Enter sur un jour **avec items** → `DayDetailDialog` (items du jour : titre, projet, client, statut, kind) — données du mois déjà chargées. Jour sans item : non activable, aria-label « aucune mission ».
6. A11y : navigation clavier, `aria-label` jours (« lundi 9 juin, 2 missions »), dialog Radix.

**Exit criteria** : tests ✓, build ✓ ; test RTL MonthGrid : une mission avec `deadline` et un projet avec `deadline` produisent chacun un marqueur outline sur le bon jour ; preview : mission au bon jour, nav ±1, clic jour → détail.

## P5 — Polish design + a11y

**Tâches** : audit impeccable/web-design-guidelines (« pas de template admin générique » dans la checklist) ; états vides ; transitions 150–200 ms ; focus rings ; responsive mobile ; contraste AA ; `metadata` par page ; favicon monochrome. Scan automatisé : `@axe-core/playwright` sur `/`, `/dashboard`, `/projets` → **0 violation serious/critical** (spec e2e dédiée).

**Exit criteria** : axe ✓, audit sans finding critique, build ✓, preview mobile+desktop.

## E2E — Parcours critique Playwright

**Tâches** : `e2e/mission-calendar.spec.ts` — la base est TOUJOURS vide au départ (wipe dans la commande webServer), donc parcours déterministe obligatoire : `/projets` → créer client (ClientFormDialog) → créer projet → `/` → **chrono départ** → `n` → titre + datePlanifiee (jour fixe du mois affiché) → Enter → **assert `[data-date]` du jour contient le titre** + **chrono < 15 s** ; mission avec `deadline` → marqueur outline sur le bon jour ; clic jour → détail liste la mission ; `/dashboard` la liste.

**Exit criteria** : `pnpm e2e` ✓ deux runs consécutifs.

## SHIP — Vérification globale + déploiement Vercel/Neon

**Tâches**
1. /verify global : `pnpm lint && pnpm test && pnpm build && pnpm e2e` ; `grep -rn "@/lib/db" app components lib/actions lib/validation` → 0 ; `pnpm build` ne crée pas `.pglite/`.
2. `vercel link` (projet `organizr`) ; provisionner Neon via marketplace ; **vérifier le NOM exact de la variable injectée** (DATABASE_URL vs POSTGRES_URL…) et qu'elle couvre production+preview+development ; `vercel env pull .env.local`.
3. Migrations : drizzle-kit ne lit PAS `.env.local` seul → `drizzle.config.ts` charge dotenv (`.env.local` puis `.env`) ; `pnpm db:migrate` contre Neon **deux fois** (2e run = no-op) — idéalement d'abord sur une branche Neon de dev.
4. **Avant prod** : exercer le driver neon-http réellement — `pnpm dev` local avec `DATABASE_URL` Neon (ou deploy preview) + parcours création mission complet (premier exercice réel du chemin neon-http).
5. `vercel deploy --prod` ; vérifier l'URL : créer une mission de bout en bout, visible au calendrier.
6. Re-vérifier que `pnpm e2e` local reste sur PGlite malgré `.env.local` (DATABASE_URL forcé à "" par playwright.config). Commit final + tag `v1.0.0`.

**Exit criteria** : build Vercel ✓, app accessible, mission créée en prod au calendrier, migrations idempotentes sur Neon, `.env.example` exact et tracké.

## (Futur — P6, NE PAS IMPLÉMENTER) Portail client `/share/[token]`

Préparé par : `shareToken` nullable + couche `lib/data` isolée. Rien d'autre en v1.

---

## Graphe de dépendances

P0 ✅ → P1 → P2 → DS → P3 → P4 → P5 → E2E → SHIP (séquentiel ; P3/P4 partagent QuickAdd/shell).

## Pièges connus (consolidés rév. 2)

- **Timezones** : comparer des strings `YYYY-MM-DD` ; `new Date('YYYY-MM-DD')` = UTC shift interdit.
- **PGlite** : cache la **promesse** sur `globalThis` (HMR + double init) ; `serverExternalPackages` obligatoire ; jamais en prod (garde-fou) ; `PGLITE_DATA_DIR` est LE contrat de sélection du dossier.
- **Playwright** : globalSetup s'exécute APRÈS le webServer → wipe dans la commande ; `DATABASE_URL=""` forcé (string vide = absent côté factory) sinon l'e2e peut écrire dans Neon prod après le SHIP.
- **`server-only`** : crash sous Vitest → alias stub (fait en P0).
- **`revalidatePath`** : crash hors contexte request → mock `next/cache` obligatoire dans chaque test d'action.
- **Prerender statique** : toute page DB sans `force-dynamic` est figée au build (et ouvre PGlite pendant le build).
- **Tailwind v4** : config par CSS (`@theme`), pas de `tailwind.config.ts`.
- **Raccourci « n »** : `preventDefault()` + guards complets, sinon « n » s'insère dans le titre autofocusé.
- **Calendrier** : intervalle de fetch = bornes de la GRILLE, pas du mois.
- **drizzle-kit** : `generate` n'a pas besoin de DB mais le config ne doit jamais throw ; `migrate`/`studio` exigent DATABASE_URL (dotenv chargé par le config).
