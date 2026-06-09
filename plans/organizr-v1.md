# Organizr v1 — Plan de construction

> Application web **solo** (pas d'auth) pour planifier le travail de montage vidéo et la
> production de sites web. Objectif central : **ajouter une mission en < 15 s** et
> **visualiser tous les projets/deadlines sur un calendrier mensuel monochrome**.

- **Répertoire** : `/Users/sohan/Organizr` (git init à faire en P0 — mode direct : commits sur `main`, pas de remote/PR)
- **Toolchain vérifiée** : node 22, pnpm 10, git, gh (auth ok), Vercel CLI (auth ok). Pas de Postgres local, Docker daemon éteint.
- **Reliquats d'une tentative précédente** : `.env.example` (à conserver/étendre), `.gitignore` (à conserver), `.claude/launch.json` (à conserver), `.next/` orphelin (à supprimer en P0).

## Stack (imposée — ne pas dévier)

| Domaine | Choix |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Components + Server Actions) |
| Langage | TypeScript `strict`, gestionnaire **pnpm** |
| UI | Tailwind CSS **v4** + shadcn/ui (Radix), thème **100 % monochrome** |
| ORM/DB | Drizzle ORM + Postgres **Neon** (prod, via Vercel) ; **PGlite** en local/e2e (même dialecte pg, mêmes migrations) |
| Validation | Zod (schémas partagés client/serveur) + React Hook Form |
| Calendrier | Grille mensuelle **custom** avec date-fns (PAS de FullCalendar/react-big-calendar) ; react-day-picker (shadcn Calendar) pour les date-pickers |
| Tests | Vitest + React Testing Library (unitaires), Playwright (e2e) |
| Déploiement | Vercel + Neon |

## Décisions d'architecture (s'appliquent à tous les steps)

1. **Double driver DB, une seule API** — `lib/db/index.ts` exporte un singleton `db` :
   - `DATABASE_URL` défini → `drizzle-orm/neon-http` + `@neondatabase/serverless` (fonctionne en local contre Neon ET sur Vercel).
   - `DATABASE_URL` absent → `drizzle-orm/pglite` + `@electric-sql/pglite`, fichier `.pglite/` (gitignoré), **migrations appliquées automatiquement au premier accès** (migrator programmatique). Singleton mis en cache sur `globalThis` (survit au HMR de `next dev`).
   - Aucune page en runtime edge (PGlite = WASM Node). Pas de transactions interactives (non supportées par neon-http) — v1 n'en a pas besoin.
2. **Dates sans timezone** — `datePlanifiee` et `deadline` sont des colonnes `date` Drizzle en `mode: 'string'` (format `YYYY-MM-DD` de bout en bout : DB → data layer → UI → tests). Seul `createdAt` est un `timestamp with time zone`. Évite tout bug de fuseau dans le calendrier.
3. **Couche d'accès isolée** — TOUT accès DB passe par `lib/data/*` (marqué `server-only`). Les server actions et les pages n'importent jamais `db` directement. Le futur portail `/share/[token]` (P6, hors v1) ne touchera que `lib/data`.
4. **Filtres et navigation par URL** — filtres du dashboard et mois du calendrier dans les `searchParams` (pages server-rendered, état partageable, zéro lib d'état client).
5. **Statuts** — un seul `pgEnum('statut', ['a_faire','en_cours','en_revue','termine'])` partagé Projet/Mission ; `pgEnum('type_projet', ['montage_video','site_web'])`.
6. **Validation partagée** — schémas Zod dans `lib/validation/*` (sans `server-only`), consommés par RHF (`@hookform/resolvers/zod`) côté client ET re-parsés dans chaque server action côté serveur.
7. **Server actions** — fichiers `'use server'` dans `lib/actions/*`. Signature : `(input: unknown) => Promise<ActionResult>` avec `type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string,string[]> }`. `revalidatePath` après chaque mutation.
8. **shareToken** — colonne `text` nullable sur `projets`, jamais lue/écrite par l'UI v1. Préparée pour P6.

## Arborescence cible

```
app/
  layout.tsx              # fonts Geist (sans+mono), shell nav, QuickAddProvider (raccourci "n")
  page.tsx                # HomePage = calendrier mensuel (?month=YYYY-MM)
  globals.css             # tokens design N&B (définis par le pass "impeccable" avant P3)
  dashboard/page.tsx      # liste missions filtrable (?type=&statut=&client=&sort=)
  projets/page.tsx        # gestion légère projets + clients (création via dialogs)
components/
  ui/*                    # primitives shadcn (button, input, dialog, select, popover, calendar, label, badge, textarea, dropdown-menu, form)
  shell/                  # AppHeader, NavLink
  missions/               # QuickAddMissionDialog (+ "n"), MissionForm, MissionRow, StatutBadge, MissionFilters
  calendar/               # MonthGrid, DayCell, DayDetailDialog, MonthNav
  projets/                # ProjetCard, ProjetFormDialog, ClientFormDialog
lib/
  db/index.ts             # singleton double-driver (neon-http | pglite)
  db/schema.ts            # clients, projets, missions, enums
  data/clients.ts|projets.ts|missions.ts   # server-only, seul point d'accès DB
  actions/clients.ts|projets.ts|missions.ts # 'use server'
  validation/*.ts         # schémas Zod + labels FR des enums
  calendar.ts             # buildMonthGrid, parseMonthParam, groupCalendarItems (pur, testé)
drizzle/                  # migrations SQL versionnées (drizzle-kit generate)
drizzle.config.ts
tests/ (vitest)  e2e/ (playwright)
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

- Palette **strictement** noir/blanc/gris (au plus UN gris d'accent pour les états). Zéro gradient, glassmorphism, emoji décoratif, ombre colorée.
- Typo Geist, échelle d'espacement 4/8 px, beaucoup de blanc, hiérarchie nette.
- Transitions 150–200 ms, focus visibles, états vides travaillés.
- Contraste AA, navigation clavier complète, rôles ARIA corrects (grille calendrier = table sémantique ou roving tabindex documenté).
- Le **skill impeccable** fixe les tokens exacts (étape DS) AVANT toute UI ; ses décisions sont consignées dans `plans/design-system.md` et font foi pour P3–P5.

## Hors périmètre v1 (NE PAS FAIRE)

Auth/comptes ; UI client/pages publiques (seulement `shareToken` + couche isolée) ; emails ; temps réel ; appli mobile ; facturation ; drag-and-drop calendrier ; vues semaine/jour ; dépendance UI lourde non justifiée.

---

# Steps

> Chaque step = un commit cohérent sur `main`. Workflow par phase de code : **/tdd (test-first) → implémentation → /code-review → /verify**. Un step n'est terminé que si ses *exit criteria* passent.

## P0 — Scaffold & outillage

**Contexte (cold start)** : répertoire `/Users/sohan/Organizr` non-git contenant seulement `.env.example`, `.gitignore`, `.claude/launch.json` (à garder) et `.next/` orphelin (à supprimer). Créer l'app Next 15 dans CE répertoire.

**Tâches**
1. `rm -rf .next .DS_Store` ; `git init -b main`.
2. Scaffold Next.js 15 : `pnpm create next-app` (TS, ESLint, Tailwind v4, App Router, src=no, import alias `@/*`) — dans un dossier temporaire puis fusion, ou directement si l'outil accepte un répertoire non vide ; préserver `.env.example`/`.claude`.
3. `pnpm dlx shadcn@latest init` (base color **neutral**) puis ajouter : button, input, textarea, label, select, dialog, popover, calendar, badge, dropdown-menu, form.
4. Dépendances : `drizzle-orm @neondatabase/serverless @electric-sql/pglite zod react-hook-form @hookform/resolvers date-fns server-only` ; dev : `drizzle-kit vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test`.
5. Config : `tsconfig` strict (vérifier `strict: true`) ; `vitest.config.ts` (projets node + jsdom, setup jest-dom) ; `playwright.config.ts` (webServer `next build && next start`, `DATABASE_URL` non défini → PGlite e2e, dossier `.pglite-e2e` nettoyé en globalSetup) ; scripts package.json : `dev`, `build`, `start`, `lint`, `test`, `test:watch`, `e2e`, `db:generate`, `db:migrate`, `db:studio`.
6. `.env.example` : conserver le bloc Neon existant, documenter le fallback PGlite. `.gitignore` : ajouter `.pglite*/`.
7. README court (setup, scripts, variables d'env).
8. Commit `chore(p0): scaffold next15 + tooling`.

**Exit criteria** : `pnpm build` ✓, `pnpm lint` ✓, `pnpm test` passe (1 test fumée), `pnpm exec playwright --version` ✓, git propre.

## P1 — Couche données (schéma + migrations + data layer)

**Contexte** : P0 livré. Aucune table encore. Décisions d'architecture 1–3 et 8 ci-dessus.

**Tâches (TDD : tests d'abord)**
1. Tests unitaires : `lib/validation` (schémas client/projet/mission — champs requis, enums, dates `YYYY-MM-DD`, coercitions vides → null) ; tests data layer contre PGlite en mémoire (`memory://`) : create/list/filtre/tri.
2. `lib/db/schema.ts` (modèle ci-dessus), `drizzle.config.ts` (dialect postgresql, out `./drizzle`).
3. `pnpm db:generate` → migration SQL initiale versionnée.
4. `lib/db/index.ts` : factory double-driver + auto-migrate PGlite + cache `globalThis`.
5. `lib/data/*` : `listClients`, `createClient`, `listProjets({withClient})`, `createProjet`, `listMissions({type?, statut?, clientId?, sort})` (join projet+client), `getMissionsBetween(start,end)` (datePlanifiee OU deadline dans l'intervalle, + deadlines projets), `createMission`, `updateMission`, `deleteMission`.
6. Commit `feat(p1): schema, migrations, data layer`.

**Exit criteria** : `pnpm test` ✓ (validation + data sur PGlite), migration rejouable (drop `.pglite` → relance → tables recréées), `pnpm build` ✓.

## P2 — Server actions CRUD

**Contexte** : P1 livré. Pattern `ActionResult` (décision 7).

**Tâches (TDD)**
1. Tests : actions appelées avec input invalide → `fieldErrors` ; input valide → écrit en DB (PGlite) ; `revalidatePath` mocké.
2. `lib/actions/clients.ts` (`createClientAction`), `projets.ts` (`createProjetAction`), `missions.ts` (`createMissionAction`, `updateMissionAction`, `updateMissionStatutAction`, `deleteMissionAction`).
3. Commit `feat(p2): server actions CRUD`.

**Exit criteria** : `pnpm test` ✓, `pnpm build` ✓, aucune action n'importe `db` directement (grep).

## DS — Design system N&B (skill **impeccable**, AVANT toute UI)

**Contexte** : P2 livré, zéro UI encore. Contraintes design ci-dessus.

**Tâches** : exécuter le skill impeccable pour fixer : tokens CSS (`globals.css` Tailwind v4 `@theme` : échelle de gris complète, le gris d'accent unique, échelle typo Geist, espacements 4/8, rayons, durées 150–200 ms), styles focus, hiérarchie, patterns d'états vides, adaptation des primitives shadcn au monochrome. Consigner dans `plans/design-system.md`. Commit `feat(ds): design tokens N&B`.

**Exit criteria** : `globals.css` ne contient que des gris ; `plans/design-system.md` écrit ; build ✓.

## P3 — Dashboard missions

**Contexte** : P2+DS livrés. Page `/dashboard`, filtres URL (décision 4).

**Tâches (TDD)**
1. Tests : tri/filtre côté data déjà couverts (P1) ; tests RTL du formulaire QuickAdd (validation, soumission, erreurs) et du parsing des searchParams.
2. Shell : `AppHeader` (nav Calendrier/Dashboard/Projets, bouton « Nouvelle mission »), monté dans `layout.tsx`.
3. `QuickAddMissionDialog` : RHF+Zod, select projet (groupé par client), titre autofocus, datePlanifiee/deadline optionnelles (shadcn Calendar), soumission Enter, raccourci global `n` (ignoré si focus dans input/textarea/contenteditable ou dialog ouvert). Objectif < 15 s.
4. `/dashboard` : table/liste server-rendered des missions (titre, projet, client, type, statut, datePlanifiee, deadline), filtres type/statut/client + tri deadline asc/desc via searchParams, changement de statut inline (dropdown), suppression avec confirmation, état vide travaillé.
5. `/projets` : liste projets (par client), dialogs création projet/client.
6. Commit `feat(p3): dashboard + quick add`.

**Exit criteria** : tests ✓, build ✓, vérif manuelle (preview) : créer client→projet→mission via UI, filtres et tri fonctionnels via URL, raccourci `n` ok.

## P4 — HomePage calendrier mensuel custom

**Contexte** : P3 livré. Grille custom date-fns, AUCUNE lib calendrier (décision stack). `getMissionsBetween` existe (P1).

**Tâches (TDD)**
1. Tests unitaires `lib/calendar.ts` : `parseMonthParam('2026-06')` (+ fallback mois courant, valeurs invalides), `buildMonthGrid` (semaines lun→dim, 4–6 semaines, jours hors-mois marqués), `groupCalendarItems` (mission planifiée / deadline mission / deadline projet par jour `YYYY-MM-DD`).
2. `app/page.tsx` : lit `?month=`, charge les items du mois affiché (intervalle complet de la grille), rend `MonthGrid`.
3. `MonthGrid`/`DayCell` : 7 colonnes, en-têtes jours FR, aujourd'hui marqué, jours hors-mois atténués, items : **mission planifiée = pastille pleine + titre**, **deadline = marqueur creux/outline** (distinction purement N&B), troncature « +N » si >3 items.
4. `MonthNav` : ← mois précédent / mois courant / mois suivant → (liens `?month=`).
5. Clic jour (et Enter au clavier) → `DayDetailDialog` : liste des missions/deadlines du jour avec projet/client/statut. Données du mois déjà chargées, pas de fetch supplémentaire.
6. Accessibilité : grille navigable clavier, `aria-label` des jours (« lundi 9 juin 2026, 2 missions »), dialog Radix.
7. Commit `feat(p4): calendrier mensuel`.

**Exit criteria** : tests calendar ✓, build ✓, vérif preview : mission créée apparaît au bon jour, nav ±1 mois ok, clic jour → détail.

## P5 — Polish design + a11y

**Contexte** : P3+P4 livrés. Référence : `plans/design-system.md`.

**Tâches** : audit impeccable/web-design-guidelines ; états vides (calendrier sans mission, dashboard vide, aucun projet → CTA guidé) ; transitions 150–200 ms ; focus rings cohérents ; responsive mobile (calendrier compact, nav) ; contraste AA vérifié ; titres de page (`metadata`) ; favicon monochrome ; suppression de tout style par défaut non monochrome. Commit `polish(p5): design + a11y`.

**Exit criteria** : audit sans finding critique, build ✓, vérif preview mobile + desktop.

## E2E — Parcours critique Playwright

**Contexte** : app complète. Playwright configuré en P0 (PGlite jetable, `next build && next start`).

**Tâches** : spec `e2e/mission-calendar.spec.ts` : ouvrir `/` → raccourci `n` (et/ou bouton) → si aucun projet, en créer un via `/projets` d'abord (ou seed via UI) → créer mission avec `datePlanifiee` = jour fixe du mois affiché → assert : la cellule `[data-date="..."]` contient le titre ; clic sur le jour → le détail liste la mission. Aussi : elle apparaît dans `/dashboard`. Commit `test(e2e): mission → calendrier`.

**Exit criteria** : `pnpm e2e` ✓ en local, reproductible (2 runs consécutifs verts).

## SHIP — Vérification globale + déploiement Vercel/Neon

**Contexte** : tout livré. Vercel CLI authentifié (``).

**Tâches**
1. /verify global : `pnpm lint && pnpm test && pnpm build && pnpm e2e`, migrations rejouables, grep `db` hors `lib/data` = 0.
2. Vercel : `vercel link` (nouveau projet `organizr`), provisionner Neon via marketplace (`vercel`/skill vercel:marketplace) ; si le provisioning exige le dashboard → le signaler à l'utilisateur avec les étapes exactes, configurer `DATABASE_URL`, appliquer les migrations (`pnpm db:migrate` contre Neon), `vercel deploy --prod`.
3. Vérifier l'URL de prod (création mission de bout en bout), documenter dans README.
4. Commit final + tag `v1.0.0`.

**Exit criteria** : build Vercel ✓, app accessible, mission créée en prod visible au calendrier, `.env.example` exact.

## (Futur — P6, NE PAS IMPLÉMENTER) Portail client `/share/[token]`

Préparé par : `shareToken` nullable + couche `lib/data` isolée. Rien d'autre en v1.

---

## Graphe de dépendances

P0 → P1 → P2 → DS → P3 → P4 → P5 → E2E → SHIP (séquentiel ; P3/P4 partagent QuickAdd et le shell → volontairement sériels).

## Pièges connus (anti-patterns à éviter)

- **Timezones** : ne jamais passer par `new Date('YYYY-MM-DD')` pour l'affichage (UTC shift) ; utiliser `date-fns/parse` ou comparer des strings `YYYY-MM-DD`.
- **PGlite + HMR** : sans cache `globalThis`, `next dev` ouvre plusieurs instances sur le même dossier → lock. Toujours passer par le singleton.
- **neon-http** : pas de `db.transaction` interactif — ne pas en introduire.
- **Tailwind v4** : config par CSS (`@theme`), PAS de `tailwind.config.ts` hérité de v3.
- **Zod v4** : `z.uuid()` / messages d'erreur — vérifier l'API courante via context7 avant P1.
- **Raccourci « n »** : guard obligatoire (inputs, IME, dialogs ouverts) sinon il se déclenche pendant la saisie.
- **Server actions** : toujours re-valider côté serveur (jamais confiance au client) ; ne pas exposer d'erreur DB brute.
- **Calendrier** : la grille couvre des jours hors-mois → l'intervalle de fetch = bornes de la GRILLE, pas du mois.
