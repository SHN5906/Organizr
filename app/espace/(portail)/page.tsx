import type { Metadata } from "next";
import { CommandeForm } from "@/components/portail/commande-form";
import { createCommandeAction } from "@/lib/actions/commandes";
import { requireClient } from "@/lib/auth/guards";
import { listCommandesForClient } from "@/lib/data/portal/commandes";
import { formatDayFr } from "@/lib/format";
import {
  formatCents,
  numericToCents,
  PRESTATION_DESCRIPTIONS,
  PRESTATION_LABELS,
  TYPES_PRESTATION,
  unitPriceCents,
} from "@/lib/pricing";
import { STATUT_COMMANDE_LABELS } from "@/lib/validation/labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Espace client" };

export default async function EspacePage() {
  const clientId = await requireClient();
  const commandes = await listCommandesForClient(clientId);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Commander</h1>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {TYPES_PRESTATION.map((t) => (
            <li key={t}>
              <span className="font-medium text-foreground">
                {PRESTATION_LABELS[t]}
              </span>{" "}
              — {PRESTATION_DESCRIPTIONS[t]}{" "}
              <span className="tabular-nums">
                {t === "video_longue"
                  ? `${formatCents(unitPriceCents(t, 1))} / vidéo.`
                  : `dès ${formatCents(unitPriceCents(t, 1))} / vidéo, dégressif
                     jusqu'à ${formatCents(unitPriceCents(t, 30))} à partir de
                     30 vidéos (par ligne de commande).`}
              </span>
            </li>
          ))}
        </ul>
        <CommandeForm onSubmit={createCommandeAction} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Tes commandes</h2>
        {commandes.length === 0 ? (
          <p className="border-y py-8 text-sm text-muted-foreground">
            Aucune commande pour l&apos;instant. Compose ta première commande
            ci-dessus.
          </p>
        ) : (
          <ul className="divide-y border-y">
            {commandes.map((commande) => (
              <li
                key={commande.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-1 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium tabular-nums">
                    Commande #{commande.numero}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {formatDayFr(
                        commande.createdAt.toISOString().slice(0, 10),
                      )}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {commande.lignes
                      .map(
                        (l) => `${l.quantite} × ${PRESTATION_LABELS[l.type]}`,
                      )
                      .join(" · ")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {STATUT_COMMANDE_LABELS[commande.statut]}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatCents(
                    commande.lignes.reduce(
                      (sum, l) => sum + numericToCents(l.total),
                      0,
                    ),
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
