ALTER TYPE "public"."type_prestation" ADD VALUE 'video_essentiel';--> statement-breakpoint
CREATE TABLE "commande_liens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commande_id" uuid NOT NULL,
	"ordre" bigint GENERATED ALWAYS AS IDENTITY (sequence name "commande_liens_ordre_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"titre" text,
	"url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commande_liens" ADD CONSTRAINT "commande_liens_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commande_liens_commande_id_idx" ON "commande_liens" USING btree ("commande_id");