CREATE TYPE "public"."statut_commande" AS ENUM('recue', 'facturee');--> statement-breakpoint
CREATE TYPE "public"."type_prestation" AS ENUM('reel_simple', 'reel_complexe', 'video_longue');--> statement-breakpoint
CREATE TABLE "client_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_access_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "commande_lignes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commande_id" uuid NOT NULL,
	"ordre" bigint GENERATED ALWAYS AS IDENTITY (sequence name "commande_lignes_ordre_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type" "type_prestation" NOT NULL,
	"quantite" integer NOT NULL,
	"prix_unitaire" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"brief" text
);
--> statement-breakpoint
CREATE TABLE "commandes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"numero" bigint GENERATED ALWAYS AS IDENTITY (sequence name "commandes_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"statut" "statut_commande" DEFAULT 'recue' NOT NULL,
	"projet_id" uuid,
	"facture_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"periode" text NOT NULL,
	"numero" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lignes" jsonb NOT NULL,
	"total_ttc" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "factures_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
ALTER TABLE "client_access" ADD CONSTRAINT "client_access_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commande_lignes" ADD CONSTRAINT "commande_lignes_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_projet_id_projets_id_fk" FOREIGN KEY ("projet_id") REFERENCES "public"."projets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_facture_id_factures_id_fk" FOREIGN KEY ("facture_id") REFERENCES "public"."factures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_access_client_id_idx" ON "client_access" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "commande_lignes_commande_id_idx" ON "commande_lignes" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "commandes_client_id_idx" ON "commandes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "factures_client_periode_idx" ON "factures" USING btree ("client_id","periode");