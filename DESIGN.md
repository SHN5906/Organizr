# Organizr — DESIGN.md

Source de vérité : `app/globals.css` (tokens) + `plans/design-system.md` (doc
détaillée). Résumé opérationnel :

## Identité

« Encre sur papier » : planning imprimé, filets hairline, blanc généreux.
Thème clair unique. Élévation par bordures, pas d'ombres portées. Coins à
peine cassés (radius 4 px). Pas de sidebar : top bar fine + contenu.

## Couleur

Strictement achromatique (OKLCH chroma 0). Encre `oklch(0.18 0 0)` sur papier
blanc. UN gris d'accent pour les états : `--accent oklch(0.94 0 0)` (hover,
sélection, aujourd'hui). Texte secondaire `--muted-foreground oklch(0.49 0 0)`
(AA sur blanc). Interdits : tout chroma > 0, gradients, glassmorphism, ombres
colorées, emojis décoratifs.

## Typographie

Geist Sans partout (Geist Mono réservé aux données techniques si besoin).
Échelle produit resserrée : page-title 24/semibold/tracking-tight, section 16/
medium, body 14, caption 12.5 muted. Dates en `tabular-nums`.

## États par la forme, jamais par la teinte

- Statuts : ○ à faire · ◐ en cours · ◌ (pointillé) en revue · ● terminé
- Calendrier : ● mission planifiée · ○ deadline mission · ◇ deadline projet
- Terminé : titre atténué (muted), jamais barré dans les listes denses.

## Motion

150 ms (hover/focus) et 200 ms (ouvertures) max, `--ease-out-quart` —
appliqués PAR DÉFAUT via `--default-transition-*` dans `@theme` (pas
d'opt-in par composant). `prefers-reduced-motion` coupe tout (globals.css).

## Composants

Boutons : primary = encre pleine ; outline = filet ; ghost = nu (hover et
aria-expanded : `--accent`, jamais un gris inventé). Suppression = outline +
dialogue de confirmation (le sens vient du texte, pas d'un rouge).
Hauteurs : champs ET bouton default à h-9 (même règle) ; sm h-8 ; xs/icon-xs
compacts (h-7) avec zone de clic étendue (after:-inset-1) pour tenir le
plancher tactile. Raccourcis clavier : composant partagé `<Kbd>` (variante
`inverse` sur fond encre), masqué sous `sm` (pas de conseil clavier au
tactile). Liste missions : rangées réglées par filets (PAS le <Table> shadcn
par défaut), hover `bg-accent`. Rangée de commande : composant partagé
`components/commandes/commande-row.tsx` (facturation + espace client).
États vides : une ligne d'explication + l'action suivante, jamais
d'illustration. Focus visible : outline 2 px encre, offset 2 px (inversé en
inset là où un conteneur `overflow-hidden` le rognerait : grille du
calendrier, date-picker). Pages force-dynamic : chaque groupe de routes a un
`loading.tsx` squelette (filets + pulsation motion-safe). Dates affichées
depuis un timestamptz : TOUJOURS `formatInstantDayFr` (fuseau Europe/Paris),
jamais `toISOString().slice` (jour UTC).
