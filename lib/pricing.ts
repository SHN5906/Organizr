/**
 * Grille tarifaire ReNew Editing 2025 TTC (« Tableau Tarifaaire Shorts »).
 * Module PUR, partagé client/serveur : tout est en CENTIMES entiers,
 * jamais de float. Le PDF fait foi — la table 1→30 complète est verrouillée
 * par tests/unit/pricing.test.ts.
 */

export const TYPES_PRESTATION = [
  "reel_simple",
  "reel_complexe",
  "video_longue",
] as const;

export type TypePrestation = (typeof TYPES_PRESTATION)[number];

export const PRESTATION_LABELS: Record<TypePrestation, string> = {
  reel_simple: "Reel — montage simple",
  reel_complexe: "Reel — montage complexe",
  video_longue: "Vidéo longue",
};

export const PRESTATION_DESCRIPTIONS: Record<TypePrestation, string> = {
  reel_simple: "Cuts, transitions, colorimétrie légère ou LUT fournie.",
  reel_complexe:
    "Cuts, transitions, sous-titres, colorimétrie avancée, short créatif.",
  video_longue: "Montage de vidéo longue — tarif unique.",
};

/** Quantité maximale par ligne de commande. */
export const QUANTITE_MAX = 50;

/** Au-delà de 30, le prix unitaire reste celui du palier 30. */
const PALIER_MAX = 30;

const COMPLEXE_SUPPLEMENT_CENTS = 1000; // +10 €/u à toute quantité
const VIDEO_LONGUE_CENTS = 7000; // 70 €/u flat

function assertQuantite(quantite: number): void {
  if (
    !Number.isInteger(quantite) ||
    quantite < 1 ||
    quantite > QUANTITE_MAX
  ) {
    throw new Error(`Quantité invalide : ${quantite} (attendu 1 à ${QUANTITE_MAX})`);
  }
}

/** Prix unitaire dégressif d'un reel simple, en centimes. */
function simpleUnitCents(quantite: number): number {
  const q = Math.min(quantite, PALIER_MAX);
  if (q <= 6) return 3000 - (q - 1) * 100; // 30 € → 25 €
  if (q <= 16) return 2500 - (q - 6) * 50; // 24,50 € → 20 €
  return 2000 - (q - 16) * 25; // 19,75 € → 16,50 €
}

export function unitPriceCents(
  type: TypePrestation,
  quantite: number,
): number {
  assertQuantite(quantite);
  switch (type) {
    case "reel_simple":
      return simpleUnitCents(quantite);
    case "reel_complexe":
      return simpleUnitCents(quantite) + COMPLEXE_SUPPLEMENT_CENTS;
    case "video_longue":
      return VIDEO_LONGUE_CENTS;
  }
}

/** Total d'une ligne : unitaire(q) × q. Dégressivité PAR LIGNE. */
export function lineTotalCents(
  type: TypePrestation,
  quantite: number,
): number {
  return unitPriceCents(type, quantite) * quantite;
}

/** Espace insécable + € — à réutiliser dans TOUTES les assertions de tests. */
export const NBSP_EURO = " €";

/** 8400 → « 84,00 € » (FR, espace insécable). */
export function formatCents(cents: number): string {
  const euros = Math.trunc(cents / 100);
  const reste = Math.abs(cents % 100).toString().padStart(2, "0");
  return `${euros},${reste}${NBSP_EURO}`;
}

/** 8400 → « 84.00 » (colonnes numeric(10,2)). */
export function centsToNumeric(cents: number): string {
  const euros = Math.trunc(cents / 100);
  const reste = Math.abs(cents % 100).toString().padStart(2, "0");
  return `${euros}.${reste}`;
}
