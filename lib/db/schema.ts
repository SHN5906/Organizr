import {
  bigint,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
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

export type Client = typeof clients.$inferSelect;
export type Projet = typeof projets.$inferSelect;
export type Mission = typeof missions.$inferSelect;
