CREATE TABLE "commande_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commande_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"taille" integer NOT NULL,
	"contenu" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commande_briefs_commande_id_unique" UNIQUE("commande_id")
);
--> statement-breakpoint
ALTER TABLE "commandes" ADD COLUMN "lien_swisstransfer" text;--> statement-breakpoint
ALTER TABLE "commande_briefs" ADD CONSTRAINT "commande_briefs_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE cascade ON UPDATE no action;