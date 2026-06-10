import type { Metadata } from "next";
import { FichiersCommande } from "@/components/commandes/fichiers-commande";
import { CommandeForm } from "@/components/portail/commande-form";
import { periodeLabel } from "@/components/facturation/periode-nav";
import { createCommandeAction } from "@/lib/actions/commandes";
import { requireClient } from "@/lib/auth/guards";
import { listCommandesForClient } from "@/lib/data/portal/commandes";
import { formatInstantDayFr, periodeOf } from "@/lib/format";
import {
  formatCents,
  isDegressif,
  numericToCents,
  PRESTATION_DESCRIPTIONS,
  PRESTATION_LABELS,
  TYPES_PRESTATION_AFFICHAGE,
  unitPriceCents,
} from "@/lib/pricing";
import { STATUT_COMMANDE_LABELS } from "@/lib/validation/labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Espace client" };

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
    commande.lignes.reduce((s, l) => s + numericToCents(l.total), 0) +
    numericToCents(commande.tip);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ajouter à {moisLabel}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tout ce que tu ajoutes ce mois-ci part sur la facture de {moisLabel}.
        </p>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {TYPES_PRESTATION_AFFICHAGE.map((t) => (
            <li key={t}>
              <span className="font-medium text-foreground">
                {PRESTATION_LABELS[t]}
              </span>{" "}
              — {PRESTATION_DESCRIPTIONS[t]}{" "}
              <span className="tabular-nums">
                {!isDegressif(t)
                  ? `${formatCents(unitPriceCents(t, 1))} / vidéo.`
                  : `dès ${formatCents(unitPriceCents(t, 1))} / vidéo, dégressif
                     jusqu'à ${formatCents(unitPriceCents(t, 30))} à partir de
                     30 vidéos (par ligne de commande).`}
              </span>
            </li>
          ))}
        </ul>
        <CommandeForm moisLabel={moisLabel} onSubmit={createCommandeAction} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Tes commandes</h2>
        {commandes.length === 0 ? (
          <p className="border-y py-8 text-sm text-muted-foreground">
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
                      <li
                        key={commande.id}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-1 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium tabular-nums">
                            Commande #{commande.numero}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {formatInstantDayFr(commande.createdAt)}
                            </span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[
                              ...commande.lignes.map(
                                (l) =>
                                  `${l.quantite} × ${PRESTATION_LABELS[l.type]}`,
                              ),
                              ...(numericToCents(commande.tip) > 0
                                ? ["tip"]
                                : []),
                            ].join(" · ")}
                          </p>
                          <FichiersCommande
                            liens={commande.liens}
                            briefNom={commande.briefNom}
                            commandeId={commande.id}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {STATUT_COMMANDE_LABELS[commande.statut]}
                        </span>
                        <span className="text-sm font-medium tabular-nums">
                          {formatCents(totalCommande(commande))}
                        </span>
                      </li>
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
