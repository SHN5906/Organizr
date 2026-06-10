import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { TYPES_PRESTATION, type TypePrestation } from "@/lib/pricing";
import { STATUTS, TYPES_PROJET } from "@/lib/validation/labels";

export const statutEnum = pgEnum("statut", STATUTS);
export const typeProjetEnum = pgEnum("type_projet", TYPES_PROJET);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  contact: text("contact"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projets = pgTable(
  "projets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    type: typeProjetEnum("type").notNull(),
    titre: text("titre").notNull(),
    description: text("description"),
    statut: statutEnum("statut").notNull().default("a_faire"),
    deadline: date("deadline", { mode: "string" }),
    // Réservé au futur portail client /share/[token] — inutilisé en v1.
    shareToken: text("share_token"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Ordre d'insertion strict : les timestamps PGlite sont à la milliseconde,
    // insuffisant pour « le plus récent d'abord » (présélection QuickAdd).
    seq: bigint("seq", { mode: "number" }).notNull().generatedAlwaysAsIdentity(),
  },
  (t) => [index("projets_client_id_idx").on(t.clientId)],
);

export const missions = pgTable(
  "missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projetId: uuid("projet_id")
      .notNull()
      .references(() => projets.id, { onDelete: "cascade" }),
    titre: text("titre").notNull(),
    statut: statutEnum("statut").notNull().default("a_faire"),
    datePlanifiee: date("date_planifiee", { mode: "string" }),
    deadline: date("deadline", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("missions_projet_id_idx").on(t.projetId),
    index("missions_date_planifiee_idx").on(t.datePlanifiee),
    index("missions_deadline_idx").on(t.deadline),
  ],
);

// ---------------------------------------------------------------------------
// v2 — espace client : accès, commandes, facturation
// ---------------------------------------------------------------------------

export const typePrestationEnum = pgEnum("type_prestation", TYPES_PRESTATION);
export const statutCommandeEnum = pgEnum("statut_commande", [
  "recue",
  "facturee",
]);

export const clientAccess = pgTable(
  "client_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    // sha256(token) hex — le token clair n'est JAMAIS stocké ; son entropie
    // (256 bits) est la sécurité, aucun pepper nécessaire.
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("client_access_client_id_idx").on(t.clientId)],
);

/** Ligne snapshotée dans une facture — figée à la génération. */
export type FactureLigneSnapshot = {
  commandeNumero: number;
  type: TypePrestation;
  label: string;
  quantite: number;
  prixUnitaire: string; // "28.00"
  total: string; // "84.00"
};

export const factures = pgTable(
  "factures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    periode: text("periode").notNull(), // YYYY-MM (fuseau applicatif)
    numero: text("numero").notNull().unique(), // FAC-AAAA-MM-XXX (compteur par période)
    revision: integer("revision").notNull().default(1), // par client × période
    lignes: jsonb("lignes").$type<FactureLigneSnapshot[]>().notNull(),
    totalTtc: numeric("total_ttc", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("factures_client_periode_idx").on(t.clientId, t.periode)],
);

export const commandes = pgTable(
  "commandes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    // Numéro global « Commande #N » (assumé : révèle le volume total, ok solo).
    numero: bigint("numero", { mode: "number" })
      .notNull()
      .generatedAlwaysAsIdentity(),
    statut: statutCommandeEnum("statut").notNull().default("recue"),
    projetId: uuid("projet_id").references(() => projets.id, {
      onDelete: "set null",
    }),
    factureId: uuid("facture_id").references(() => factures.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("commandes_client_id_idx").on(t.clientId)],
);

export const commandeLignes = pgTable(
  "commande_lignes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commandeId: uuid("commande_id")
      .notNull()
      .references(() => commandes.id, { onDelete: "cascade" }),
    // Séquence GLOBALE à la table : sert uniquement au tri, ne jamais l'afficher.
    ordre: bigint("ordre", { mode: "number" })
      .notNull()
      .generatedAlwaysAsIdentity(),
    type: typePrestationEnum("type").notNull(),
    quantite: integer("quantite").notNull(),
    prixUnitaire: numeric("prix_unitaire", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    brief: text("brief"),
  },
  (t) => [index("commande_lignes_commande_id_idx").on(t.commandeId)],
);

export type Client = typeof clients.$inferSelect;
export type Projet = typeof projets.$inferSelect;
export type Mission = typeof missions.$inferSelect;
export type ClientAccess = typeof clientAccess.$inferSelect;
export type Commande = typeof commandes.$inferSelect;
export type CommandeLigne = typeof commandeLignes.$inferSelect;
export type Facture = typeof factures.$inferSelect;
