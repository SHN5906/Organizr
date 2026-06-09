# Organizr — Design system N&B (étape DS, fait foi pour P3–P5)

Fixé AVANT toute UI (pass « impeccable », register product). Tokens dans
`app/globals.css`. Toute déviation doit être justifiée ici.

## 1. Identité : « encre sur papier »

Un planning de production imprimé : encre noire, filets fins, blanc généreux.
- **Thème clair unique** (scène : planification le matin, bureau lumineux,
  scan du mois en 5 s). Pas de dark mode en v1.
- **Élévation par filets**, zéro ombre portée. Les dialogs se détachent par un
  filet `--border-strong` + voile `bg-foreground/20` en overlay.
- **Radius 4 px** (`--radius: 0.25rem`) : coins à peine cassés, papeterie, pas
  de pills SaaS.
- **Anti-réflexes** : ni template admin (sidebar/cards/chips colorées), ni
  brutalisme terminal (le 2ᵉ réflexe du monochrome). Top bar fine, contenu
  réglé comme une page.

## 2. Nuancier (OKLCH, chroma 0 partout — vérifiable par grep)

| Token | L | Rôle |
|---|---|---|
| `--background` | 1.00 | papier |
| `--secondary` / `--muted` | 0.962 | surfaces discrètes (en-têtes de groupes, rangée header) |
| `--accent` | 0.94 | **LE gris d'accent** : hover, sélection, « aujourd'hui » |
| `--border` | 0.90 | filet hairline par défaut |
| `--input` | 0.84 | contour des champs |
| `--border-strong` | 0.74 | filets appuyés (dialog, grille calendrier extérieure) |
| `--muted-foreground` | 0.49 | texte secondaire (AA sur blanc) |
| `--destructive` | 0.205 | = encre ; le sens destructif vient de la confirmation |
| `--primary` | 0.205 | action principale (encre pleine) |
| `--foreground` / `--ring` | 0.18 | encre / focus |

Règle : jamais de `text-*`/`bg-*` Tailwind colorés (red-500…) ; uniquement les
tokens ci-dessus.

## 3. Typographie (Geist, échelle produit resserrée)

| Usage | Classe | Détail |
|---|---|---|
| Titre de page | `text-2xl font-semibold tracking-tight` | 24 px, un seul par page |
| Titre de section / dialog | `text-base font-medium` | 16 px |
| Corps / rangées | `text-sm` | 14 px |
| Métadonnées, captions | `text-xs text-muted-foreground` | 12 px |
| Dates, compteurs | + `tabular-nums` | alignement de planning |
| Numéro du jour (calendrier) | `text-sm font-medium tabular-nums` | |

Geist Mono : réservé (identifiants techniques), pas de mono décoratif.

## 4. Espacement

Échelle Tailwind 4/8 : rangées denses `py-2 px-3` (32–36 px de haut), sections
`gap-8`, page `px-4 md:px-8, max-w-6xl mx-auto`. Le calendrier respire :
cellules `min-h-24` desktop / `min-h-14` mobile.

## 5. États par la FORME, jamais par la teinte

### Statuts (composant `StatutDot`, 10 px, inline avant le label)
- `a_faire` : ○ cercle creux (`border` encre, fond transparent)
- `en_cours` : ◐ demi-disque (moitié encre — conic-gradient 2 stops N&B, autorisé : achromatique)
- `en_revue` : ◌ cercle pointillé (`border-dashed`)
- `termine` : ● disque plein + label en `text-muted-foreground`

Badge statut = `StatutDot` + label texte, **sans fond pill**.

### Calendrier (P4)
- mission planifiée : **● pastille pleine** + titre
- deadline mission : **○ pastille creuse** + titre
- deadline projet : **◇ losange creux** + titre projet
- « aujourd'hui » : numéro du jour sur pastille encre (cercle plein, chiffre blanc)
- jours hors-mois : numéro `text-muted-foreground/50`, fond `--muted` léger

## 6. Motion

- 150 ms : hover, focus, statut (couleur de fond/bordure)
- 200 ms : ouverture dialog/popover (fade + translation 4 px max)
- Courbe : `--ease-out-quart`. Jamais de bounce, jamais d'animation de layout,
  pas de séquence d'entrée de page.

## 7. Composants (adaptation shadcn — aucun style par défaut visible)

- **Button** : primary encre pleine ; `outline` filet `--input` ; `ghost` nu.
  Suppression : `outline` + AlertDialog-like de confirmation (pattern Dialog).
- **Liste missions** : PAS `<Table>` shadcn. Rangées custom séparées par
  filets `divide-y`, header en `text-xs uppercase tracking-wide
  text-muted-foreground` SANS fond, hover `bg-accent`.
- **Champs** : Input/Select/Textarea shadcn, contour `--input`, focus ring encre.
- **Dialogs** : Radix, filet fort, overlay `bg-foreground/20`, pas de blur.
- **États vides** : 1 phrase (quoi) + 1 action (suite). Pas d'illustration,
  pas d'emoji. Ex : « Aucune mission. Appuie sur n pour en créer une. »

## 8. Focus & a11y

- `:focus-visible` global : `outline: 2px solid var(--ring); offset 2px`.
- Cibles ≥ 32 px, contrastes AA (muted 0.49 sur blanc ≈ 4.9:1 ✓).
- Raccourci « n » documenté dans l'UI (hint visible dans le header).

## 9. Vérification monochrome (exit criterion DS, re-vérifié en P5)

```bash
# 0 hit attendu : tout oklch non achromatique, hex coloré ou couleur nommée
grep -nE "oklch\([0-9.]+ (0\.[0-9]+|[1-9])" app/globals.css
grep -rnE "(text|bg|border|ring)-(red|blue|green|amber|yellow|orange|violet|purple|pink|rose|emerald|teal|cyan|sky|indigo|lime|fuchsia)-" app components
```
