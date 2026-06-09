CREATE TYPE "public"."statut" AS ENUM('a_faire', 'en_cours', 'en_revue', 'termine');--> statement-breakpoint
CREATE TYPE "public"."type_projet" AS ENUM('montage_video', 'site_web');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projet_id" uuid NOT NULL,
	"titre" text NOT NULL,
	"statut" "statut" DEFAULT 'a_faire' NOT NULL,
	"date_planifiee" date,
	"deadline" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" "type_projet" NOT NULL,
	"titre" text NOT NULL,
	"description" text,
	"statut" "statut" DEFAULT 'a_faire' NOT NULL,
	"deadline" date,
	"share_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "projets_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1)
);
--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_projet_id_projets_id_fk" FOREIGN KEY ("projet_id") REFERENCES "public"."projets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projets" ADD CONSTRAINT "projets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "missions_projet_id_idx" ON "missions" USING btree ("projet_id");--> statement-breakpoint
CREATE INDEX "missions_date_planifiee_idx" ON "missions" USING btree ("date_planifiee");--> statement-breakpoint
CREATE INDEX "missions_deadline_idx" ON "missions" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "projets_client_id_idx" ON "projets" USING btree ("client_id");