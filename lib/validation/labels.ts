export const STATUTS = ["a_faire", "en_cours", "en_revue", "termine"] as const;
export type Statut = (typeof STATUTS)[number];

export const TYPES_PROJET = ["montage_video", "site_web"] as const;
export type TypeProjet = (typeof TYPES_PROJET)[number];

export const STATUT_LABELS: Record<Statut, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  en_revue: "En revue",
  termine: "Terminé",
};

export const TYPE_LABELS: Record<TypeProjet, string> = {
  montage_video: "Montage vidéo",
  site_web: "Site web",
};

export const STATUTS_COMMANDE = ["recue", "facturee"] as const;
export type StatutCommande = (typeof STATUTS_COMMANDE)[number];

export const STATUT_COMMANDE_LABELS: Record<StatutCommande, string> = {
  recue: "Reçue",
  facturee: "Facturée",
};
