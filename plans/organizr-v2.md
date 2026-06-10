# Organizr v2 — Espace client : commandes + facturation mensuelle (rév. 2 — post review adversariale)

> v1 livrée (`plans/organizr-v1.md`, tag v1.0.0) : app interne calendrier/dashboard/projets,
> **sans aucune auth** (publique en prod !). v2 : auth lien magique clients, protection owner,
> commandes au tarif ReNew Editing, création auto projet+missions, facturation mensuelle print-ready.

- **Repo** : github.com/SHN5906/Organizr (**PUBLIC** — zéro secret, fixtures anonymes), push main = auto-deploy Vercel (organizr-zeta.vercel.app, scope perso, Neon `neon-coffee-pocket`).
- **Stack v1** : Next 15.5 App Router / React 19 / TS strict / Tailwind v4 DS « encre sur papier » / Drizzle + Neon ↔ PGlite (`PGLITE_DATA_DIR`) / Zod 4 + RHF / Vitest 4 (79 tests : `tests/unit/*.test.ts` node, `tests/ui/*.test.tsx` jsdom — un fichier hors convention NE TOURNE PAS) + Playwright (2 fichiers spec : a11y ×3 + mission-calendar ×1).
- **Mode** : commits sur `main`, push UNIQUEMENT en fin de step vert ; **migration Neon avant tout push d'un step qui lit de nouvelles tables** ; secrets Vercel posés avant le push V3c.

## Décisions d'architecture v2

1. **Argent en CENTIMES entiers** dans la logique (`lib/pricing.ts` pur, partagé, sans `server-only`) ; colonnes `numeric(10,2)` mode string (« 84.00 ») ; affichage via `formatCents` avec **espace insécable** avant € (constante `NBSP_EURO` exportée — toutes les assertions de tests la réutilisent). Jamais de float.
2. **Grille ReNew Editing TTC** (PDF fait foi, table 1→30 entière = fixture de test) : `reel_simple` q∈[1,6] → 30−(q−1) € ; q∈[7,16] → 25−(q−6)×0,50 ; q∈[17,30] → 20−(q−16)×0,25. `reel_complexe` = simple **+10 €/u**. `video_longue` = **70 €/u flat**. q>30 : prix du palier 30. Total ligne = unitaire(q)×q. **Dégressivité PAR LIGNE** (pas de cumul mensuel). Quantité max par ligne : **50**.
3. **Sessions HMAC maison** (`lib/auth/session.ts`, zéro dépendance) : payload `{sub, role: 'owner'|'client', exp}` base64url + HMAC-SHA256, vérif `timingSafeEqual`. Cookies `httpOnly, secure (prod), sameSite=lax` : `organizr_owner` 30 j, `organizr_client` 90 j. CSRF : mutations UNIQUEMENT par server actions POST (Next 15 vérifie Origin/Host) ; la session est stateless → **le logout ne révoque pas côté serveur** (limite assumée), la révocation réelle passe par le check DB du guard (déc. 5).
4. **Secrets — lecture LAZY** (`getSessionSecret()` / `getOwnerPassword()` appelés à l'usage, jamais au top-level, comme `initDb` v1) : en prod (`VERCEL` — couvre preview — ou `NODE_ENV=production` hors e2e) absents → throw ; en dev, défauts `dev-…` + `console.warn`. `pnpm build` local sans secrets DOIT passer. `OWNER_PASSWORD` : comparaison `timingSafeEqual(sha256(input), sha256(secret))` — pas un KDF → le mot de passe DOIT être à haute entropie (généré, jamais écrit dans le repo/chat). E2e : valeurs de test EN CLAIR dans `playwright.config.ts` (assumées, commentées pour le grep secrets V8).
5. **Lien magique** : `randomBytes(32).toString('base64url')` ; en DB uniquement `sha256(token)` hex (sans clé : l'entropie 256 bits EST la sécurité). Lien `/espace/connexion?token=…` copié manuellement (zéro email), expire **14 j**, révocable. **Le GET ne pose JAMAIS de cookie** : la page (publique, `force-dynamic`, AUCUN accès DB au rendu, `<meta name="referrer" content="no-referrer">`) affiche un bouton « Accéder à mon espace » → **server action POST** (rate-limit best-effort + validation hash + expiry + revokedAt) → cookie → `redirect('/espace')`. Limites documentées : token visible dans l'historique navigateur et les access logs Vercel (accepté, 14 j) ; le rate-limit in-memory par instance est **cosmétique, PAS une mesure de sécurité** (la défense anti-énumération = entropie du token). `inviteClientAction` retourne le token clair UNE fois (jamais re-récupérable).
6. **Guards** (`lib/auth/guards.ts`, `cookies()` async) : `requireOwner()` / `requireClient()` appelés (a) dans **CHAQUE page** des groupes protégés (les layouts ne sont pas une frontière fiable — ils ne re-rendent pas toujours), (b) dans le layout pour l'UX redirect, (c) dans **CHAQUE server action**. `requireClient()` vérifie EN DB qu'un `client_access` non révoqué/non expiré existe pour ce clientId (révocation réelle ; 1 requête indexée) ; sinon cookie purgé + redirect. Le `clientId` vient TOUJOURS de la session. `/connexion` avec session owner → redirect `/dashboard` ; `/espace/connexion` avec session client valide → redirect `/espace`.
7. **Schéma v2** (migration 0001 STRICTEMENT additive — `grep 'ALTER TABLE' drizzle/0001*.sql` → 0) :
   ```
   pgEnum type_prestation: reel_simple | reel_complexe | video_longue
   pgEnum statut_commande: recue | facturee
   client_access  { id uuid pk, clientId FK→clients CASCADE, tokenHash text UNIQUE, expiresAt, lastUsedAt NULL, revokedAt NULL, createdAt }
   commandes      { id uuid pk, clientId FK→clients CASCADE, numero bigint identity (GLOBAL — assumé : « Commande #N » révèle le volume total, acceptable solo), statut default 'recue', projetId FK→projets SET NULL, factureId FK→factures SET NULL, createdAt }
   commande_lignes{ id uuid pk, commandeId FK CASCADE, ordre bigint identity (tri uniquement, séquence globale — ne jamais l'afficher), type, quantite int, prixUnitaire numeric str, total numeric str, brief text NULL }
   factures       { id uuid pk, clientId FK→clients CASCADE, periode 'YYYY-MM', numero text UNIQUE 'FAC-AAAA-MM-XXX', revision int, lignes jsonb $type<FactureLigneSnapshot[]>, totalTtc numeric str, createdAt }
   type FactureLigneSnapshot = { commandeNumero: number; type: TypePrestation; label: string; quantite: number; prixUnitaire: string; total: string }
   ```
   Index : `client_access(tokenHash)`, `commandes(clientId)`, `commande_lignes(commandeId)`, `factures(clientId, periode)`. Ordre FK des suppressions documenté (cascade depuis clients ; projets → commandes.projetId SET NULL).
8. **Période = fuseau applicatif** : `listCommandesForPeriode(clientId, 'YYYY-MM')` borne `[début du mois, début du mois suivant)` calculées en `APP_TZ` (Europe/Paris) puis converties en instants UTC. Test de bord : commande à 23h30 UTC le 30/06 → période 2026-07.
9. **Commande → production** (`createCommandeAction`, portail) : guard + zod (`lib/validation/commandes.ts` : `lignes: array({type, quantite 1..50, brief}).min(1)` — **AUCUN champ prix** : les montants client sont purement décoratifs, le serveur recalcule tout) ; insertions séquentielles (pas de transactions neon-http) : commande → lignes → projet « Commande #N — {client.nom} » (type `montage_video`, deadline NULL) → missions en **UN SEUL insert multi-values** (1 mission/vidéo : « Reel simple i/q — Commande #N », notes = brief, sans dates — assumé : découverte via dashboard, pas calendrier). Nettoyage best-effort si échec partiel.
10. **Facturation** : `/facturation?mois=YYYY-MM` (défaut `todayInAppZone`, nav via `components/facturation/periode-nav.tsx` — PAS MonthNav qui hardcode `/?month=`). Génération : facture = **snapshot JSONB de TOUTES les commandes de la période** (recue + déjà facturées) ; `revision = max(periode)+1` ; numero `FAC-AAAA-MM-XXX` (XXX = compteur période) ; toutes les commandes de la période → statut `facturee` + `factureId` → **dernière révision**. L'UI liste la dernière révision (les anciennes restent en DB). `/facturation/[id]` print-ready (`@media print`, pas de lib PDF).
11. **ActionResult étendu** (V3a, rétro-compatible) : `ActionResult<T = void> = { ok: true; data: T } | { ok: false; error; fieldErrors? }` ; `runAction` propage la valeur de retour de `fn`. Payloads pinnés : `inviteClientAction → {url, expiresAt}` (URL construite depuis le header `host`), `createCommandeAction → {numero}`, `generateFactureAction → {factureId, numero, revision}`.
12. **Cache** : TOUTE page v2 (connexion, espace, facturation) = `force-dynamic`, zéro cache RSC par session → le `revalidatePath('/', 'layout')` global de `runAction` reste sûr (rien de mis en cache cross-client).
13. **Arborescence v2** :
    ```
    app/connexion/page.tsx                      # login owner (public, force-dynamic)
    app/espace/connexion/page.tsx               # bouton POST token (public, force-dynamic, zéro DB au rendu)
    app/espace/(portail)/{layout,page}.tsx      # guard client ; commander + historique
    app/(app)/facturation/{page,[id]/page}.tsx  # owner ; force-dynamic
    lib/pricing.ts  lib/auth/{session,guards,rate-limit}.ts
    lib/validation/commandes.ts (+ STATUT_COMMANDE_LABELS dans labels.ts)
    lib/actions/{auth,commandes,factures}.ts
    lib/data/{client-access,commandes,factures}.ts  lib/data/portal/commandes.ts
    components/auth/owner-login-form.tsx  components/portail/commande-form.tsx
    components/facturation/{periode-nav,facture-*}.tsx  components/projets/invite-client-dialog.tsx
    e2e/auth.setup.ts  e2e/.auth/ (GITIGNORÉ — contient un cookie signé)
    ```
14. **E2E** : projects Playwright — `setup` (`e2e/auth.setup.ts` : login owner par le formulaire → storageState `e2e/.auth/owner.json`) → `chromium` (`dependencies: ['setup']`, `use.storageState`, `testIgnore` du setup). Tests anonymes : `test.use({ storageState: { cookies: [], origins: [] } })`. **Ordre alphabétique + workers 1 : le spec portail s'appelle `z-espace-client.spec.ts`** (les specs v1 supposent une base vierge à leur passage). Env webServer : `OWNER_PASSWORD=e2e-owner-pass`, `SESSION_SECRET=e2e-session-secret-32chars-min!` (valeurs de test assumées). Les specs v1 repassent sans modification de leurs assertions.

## Hors périmètre v2

Stripe/paiement ; emails ; multi-utilisateurs par client ; modification/annulation côté client ; TVA/HT ; lib PDF ; framework d'auth ; invalidation de session individuelle côté serveur (logout = cookie local, révocation = check DB du guard) ; numérotation par client.

---

# Steps (1 commit chacun ; push noté explicitement)

## V1 — Moteur de prix pur
TDD `tests/unit/pricing.test.ts` : 60 valeurs unitaires du PDF, totaux (3 simples = 8400c), longue 7000c/u, q>30 = palier 30, q hors [1,50] → throw, `formatCents(8400)` = « 84,00 € » (NBSP), `centsToNumeric` ; impl `lib/pricing.ts` (`TYPES_PRESTATION`, `PRESTATION_LABELS` + descriptions, `unitPriceCents`, `lineTotalCents`, `formatCents`, `NBSP_EURO`, `centsToNumeric`). **Exit** : tests ✓ lint ✓, fichier pur (aucun import serveur). Commit, pas de push.

## V2 — Schéma + data (+ migration Neon AVANT push)
TDD `tests/unit/data-v2.test.ts` (PGlite ; **`TRUNCATE … RESTART IDENTITY CASCADE` en beforeEach** — `db.delete` ne reset pas les identity) : cycle invitation (hash ≠ clair, validate, lastUsedAt, revoke, expiré), commande+lignes (numéros, snapshot), `listCommandesForPeriode` (+ bord de mois APP_TZ), factures (FAC-…-001/002, revision = toutes les commandes de la période, JSONB figé), isolation A/B ; étendre `migrations.test.ts` aux tables v2. Impl : décisions 7–8, `pnpm db:generate` (0001 additive — grep ALTER → 0), data layers (déc. 13), `STATUT_COMMANDE_LABELS`. **Exit** : tests ✓, migration rejouable, build ✓ sans `.pglite/`, `grep -rn "@/lib/db" app components lib/actions lib/validation lib/pricing.ts lib/auth` → 0 ; **`pnpm db:migrate` ×2 contre Neon (2ᵉ = no-op)** ; commit + push (rien en prod ne lit encore ces tables, mais elles existent désormais).

## V3a — Lib auth pure
TDD `tests/unit/auth.test.ts` : session sign/verify (round-trip, exp, altération, mauvais secret), lazy secrets (pas de throw à l'import ; throw simulé prod sans secret), rate-limiter (fenêtre/reset). Impl : `lib/auth/session.ts`, `rate-limit.ts`, base de `guards.ts` (lecture cookie → payload ; le check DB client arrive en V3b). **Exit** : tests ✓, `pnpm build` local SANS secrets ✓. Commit, pas de push.

## V3b — Actions auth + pages + guards partout
TDD : actions (login owner ok/ko, invite → {url contenant le token, expiresAt}, revoke, logout) avec cookies/headers mockés ; RTL `tests/ui/owner-login-form.test.tsx`. Impl : déc. 11 (ActionResult<T>), `lib/actions/auth.ts`, `requireClient` avec check DB (déc. 6), `app/connexion` (+ `OwnerLoginForm`), `app/espace/connexion` (bouton POST, déc. 5), guards dans le layout `(app)` ET chaque page v1 (`/`, `/dashboard`, `/projets`), squelette `(portail)` gardé. **Exit** : tests ✓, build ✓ sans `.pglite/`. Commit, pas de push.

## V3c — Infra e2e + secrets Vercel + push verrouillant
Impl : déc. 14 (projects/setup/storageState/env, `.gitignore` += `e2e/.auth/`), spec `auth.spec.ts` : anonyme `/dashboard` → redirect `/connexion` (contexte vierge), owner connecté sur `/connexion` → `/dashboard`, axe `/connexion`. **AVANT push : générer et poser sur Vercel (prod+preview+dev) `SESSION_SECRET` et `OWNER_PASSWORD` à haute entropie — valeurs jamais écrites nulle part.** **Exit** : `pnpm e2e` vert (specs v1 inclus), secrets posés, commit + push → **la prod se verrouille** (interne owner-only, portail squelette).

## V4 — Actions commande + facture
TDD `tests/unit/actions-v2.test.ts` (guards mockés via `vi.mock`) : commande client A (3 simples + 1 longue → commande + projet « Commande #1 — … » + 4 missions en 1 insert + montants serveur 8400/7000 même avec prix client bidons — absents du schéma) ; quantite 0/51/type inconnu → fieldErrors ; sans session → ko ; `generateFactureAction` owner only, mois vide → erreur propre, génération → FAC-2026-MM-001 + commandes facturee + total 15400c, régénération après nouvelle commande → revision 2 = TOUTES les commandes, factureId re-pointés. Impl : `lib/validation/commandes.ts`, `lib/actions/{commandes,factures}.ts` (déc. 9–11). **Exit** : `pnpm test` 100 % vert, build ✓. Commit, pas de push.

## DS-P — Extension design system (impeccable, avant l'UI)
Registre portail (même langue encre, en-tête « ReNew Editing — Espace client », PAS la nav interne, aéré : le client est un invité), formulaire de commande (lignes réglées, prix tabular-nums, récap = addition de devis papier), facture print (A4, marges 15 mm, table hairline, totaux à droite, `@media print` masque shell/boutons), états vides portail. Doc dans `plans/design-system.md` + tokens print `globals.css`. **Exit** : doc + build ✓. Commit, pas de push.

## V5 — UI interne
`InviteClientDialog` (génère → champ lien + copier + expiration ; liste + révocation des accès), `/facturation` (periode-nav `?mois=`, sections client : commandes, total, générer / facture existante + révision), `/facturation/[id]` print-ready + bouton Imprimer, lien nav header. RTL : invite-dialog, parsing `?mois=`. **Exit** : tests ✓ build ✓ ; checklist preview : (a) inviter → copier → révoquer, (b) générer une facture 2 commandes, (c) aperçu impression sans shell, (d) nav mois. Commit, pas de push.

## V6 — UI portail
Layout portail (header ReNew Editing + nom client + déconnexion, AUCUN lien interne), `CommandeForm` (`onSubmit` injecté — testable jsdom sans lib/db ; lignes dynamiques {type select natif, quantite, brief}, prix live `lib/pricing` affichage seul, récap, succès → « Commande #N reçue »), historique commandes (numéro, date, lignes, total, `STATUT_COMMANDE_LABELS`). RTL : prix live 3 simples = « 84,00 € » (NBSP_EURO), validation, soumission sans prix dans le payload. **Exit** : tests ✓ build ✓ ; checklist preview : commande complète, état vide, déconnexion. Commit, pas de push.

## V7 — E2E v2
`e2e/z-espace-client.spec.ts` (multi-contextes) : owner crée « Client A » → invite → lien ; contexte vierge : lien → bouton → `/espace` → 3 reels simples (84,00 €) + 1 longue (70,00 €) → total **154,00 €** → confirme → owner : dashboard liste 4 missions « Commande #1 » → `/facturation` générer → 154,00 € → page facture ok ; client B invité → espace vide (isolation) ; **accès révoqué → session client existante refusée à la navigation suivante** ; client connecté sur `/dashboard` → redirect `/connexion` ; axe 0 serious/critical sur `/espace` + facture. **Exit** : `pnpm e2e` ×2 consécutifs verts (v1 inclus). Commit, pas de push.

## V8 — Security review (bloquant)
`/security-review` + revue ciblée : cookies (flags), tokens (hash, expiry, révocation EFFECTIVE via guard), guards sur chaque page ET action, isolation (aucune requête portail sans clientId de session), secrets (grep repo : 0 hors valeurs e2e commentées), erreurs sans fuite. Corriger critique/majeur. **Exit** : 0 finding critique/majeur ouvert, tests+e2e verts. Commit, pas de push.

## SHIP v2
1. Vérif env Vercel ; migrations Neon déjà appliquées (V2) — re-vérifier no-op.
2. Push final → auto-deploy ; **vérif PROD** : anonyme `/dashboard` → `/connexion` ; login owner ; inviter un client test ; commande test → missions au dashboard ; facture ; **supprimer les données de test** (ordre FK : la cascade clients suffit).
3. Tag `v2.0.0`, README (Espace client, env), mémoire.
**Exit** : prod verrouillée et fonctionnelle, tag poussé.

## Graphe : V1 → V2 → V3a → V3b → V3c → V4 → DS-P → V5 → V6 → V7 → V8 → SHIP.

## Pièges v2

- `cookies()`/`headers()` **async** (Next 15) ; mutation de cookies UNIQUEMENT dans actions/route handlers — jamais dans un Server Component (d'où le bouton POST du lien magique).
- Les actions ne passent pas par les layouts ; les layouts ne re-rendent pas toujours → guard dans CHAQUE page + CHAQUE action.
- Secrets : lecture lazy, jamais au top-level d'un module (sinon `pnpm build` local casse).
- neon-http sans transactions : ordre commande→lignes→projet→missions (insert multi-values unique), cleanup best-effort.
- Identity columns : `TRUNCATE … RESTART IDENTITY CASCADE` dans les tests ; trous de numérotation possibles en prod (assumé).
- Argent : centimes int ; NBSP avant € (`NBSP_EURO`) dans TOUTES les assertions.
- E2E : conventions de nommage (`z-` pour le spec portail), storageState owner par défaut → `test.use({storageState: vide})` pour l'anonyme.
- Auto-deploy : jamais de push avec des migrations non appliquées sur Neon ou des secrets manquants.
- Repo public : `e2e/.auth/` gitignoré ; jamais une vraie valeur de secret dans repo/chat/logs.
- Vitest : RTL → `tests/ui/*.test.tsx`, node → `tests/unit/*.test.ts` — sinon le test ne tourne pas (faux vert).
