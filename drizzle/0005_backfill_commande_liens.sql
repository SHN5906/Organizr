-- v2.4 : les liens de partage vivent désormais dans commande_liens (titres,
-- liens multiples). Recopie des anciens liens uniques pour ne rien perdre ;
-- la colonne commandes.lien_swisstransfer est conservée (dépréciée) et ne
-- doit plus être écrite.
INSERT INTO "commande_liens" ("commande_id", "url")
SELECT "id", "lien_swisstransfer"
FROM "commandes"
WHERE "lien_swisstransfer" IS NOT NULL;
