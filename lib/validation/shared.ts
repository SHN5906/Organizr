import { z } from "zod";

export const requiredText = z.string().trim().min(1, "Champ requis");

/** Champ texte optionnel : absent / vide / espaces → null. */
export const optionalText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().min(1).nullable(),
);

/** Date optionnelle au format YYYY-MM-DD : absent / vide → null. */
export const optionalDate = z.preprocess(
  (v) => (v == null || v === "" ? null : v),
  z.iso.date("Date invalide (AAAA-MM-JJ)").nullable(),
);

// Variantes PATCH (schémas d'update) : une clé ABSENTE reste undefined
// (champ non touché) ; null / chaîne vide = effacement explicite.
// Ne jamais réutiliser les variantes de création (absent → null) dans un
// update : cela transformerait un payload partiel en reset destructif.

export const patchDate = z.preprocess(
  (v) => (v === "" ? null : v),
  z.iso.date("Date invalide (AAAA-MM-JJ)").nullable().optional(),
);

export const patchText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().min(1).nullable().optional(),
);
