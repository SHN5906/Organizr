import type { Metadata } from "next";
import {
  CommandeRow,
  totalCommandeCents,
} from "@/components/commandes/commande-row";
import { CommandeForm } from "@/components/portail/commande-form";
import { periodeLabel } from "@/components/facturation/periode-nav";
import { createCommandeAction } from "@/lib/actions/commandes";
import { requireClient } from "@/lib/auth/guards";
import { listCommandesForClient } from "@/lib/data/portal/commandes";
import { periodeOf } from "@/lib/format";
import {
  formatCents,
  isDegressif,
  PRESTATION_DESCRIPTIONS,
  PRESTATION_LABELS,
  TYPES_PRESTATION_AFFICHAGE,
  unitPriceCents,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";

// Titre absolu : l'onglet du client ne mentionne pas l'outil interne.
export const metadata: Metadata = {
  title: { absolute: "Espace client · ReNew Editing" },
};

export default async function EspacePage() {
  const clientId = await requireClient();
  const commandes = await listCommandesForClient(clientId);
  const moisLabel = periodeLabel(periodeOf(new Date()));

  // Historique groupé par mois (les périodes 'YYYY-MM' se trient telles quelles).
  const parMois = new Map<string, typeof commandes>();
  for (const commande of commandes) {
    const periode = periodeOf(commande.createdAt);
    const list = parMois.get(periode) ?? [];
    list.push(commande);
    parMois.set(periode, list);
  }
  const mois = [...parMois.keys()].sort().reverse();
  const totalCommande = (commande: (typeof commandes)[number]) =>
    totalCommandeCents(commande.lignes, commande.tip);

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Ajouter à {moisLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tout ce que tu ajoutes ce mois-ci part sur la facture de{" "}
            {moisLabel}.
          </p>
        </div>

        {/* Grille tarifaire : rangées réglées, prix alignés à droite —
            le scan d'un tarif imprimé, pas un paragraphe à déchiffrer. */}
        <ul className="divide-y border-y">
          {TYPES_PRESTATION_AFFICHAGE.map((t) => (
            <li
              key={t}
              className="flex items-baseline justify-between gap-6 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{PRESTATION_LABELS[t]}</p>
                <p className="text-xs text-muted-foreground">
                  {PRESTATION_DESCRIPTIONS[t]}
                </p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="text-sm">
                  {formatCents(unitPriceCents(t, 1))}{" "}
                  <span className="text-muted-foreground">/ vidéo</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {isDegressif(t)
                    ? `dégressif par ligne : jusqu'à ${formatCents(unitPriceCents(t, 30))} à 30 vidéos`
                    : "tarif unique"}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <CommandeForm moisLabel={moisLabel} onSubmit={createCommandeAction} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Tes commandes</h2>
        {commandes.length === 0 ? (
          <p className="border-y py-12 text-center text-sm text-muted-foreground">
            Aucune commande pour l&apos;instant. Compose ta première commande
            ci-dessus.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {mois.map((periode) => {
              const commandesDuMois = parMois.get(periode)!;
              const totalMois = commandesDuMois.reduce(
                (sum, c) => sum + totalCommande(c),
                0,
              );
              return (
                <div key={periode} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-medium capitalize">
                      {periodeLabel(periode)}
                    </h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {commandesDuMois.length} commande
                      {commandesDuMois.length > 1 ? "s" : ""} ·{" "}
                      {formatCents(totalMois)}
                    </span>
                  </div>
                  <ul className="divide-y border-y">
                    {commandesDuMois.map((commande) => (
                      <CommandeRow
                        key={commande.id}
                        commandeId={commande.id}
                        numero={commande.numero}
                        createdAt={commande.createdAt}
                        lignes={commande.lignes}
                        tip={commande.tip}
                        statut={commande.statut}
                        liens={commande.liens}
                        briefNom={commande.briefNom}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
