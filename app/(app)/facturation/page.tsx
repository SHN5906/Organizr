import type { Metadata } from "next";
import Link from "next/link";
import {
  CommandeRow,
  totalCommandeCents,
} from "@/components/commandes/commande-row";
import { DeleteFactureButton } from "@/components/facturation/delete-facture-button";
import { GenerateFactureButton } from "@/components/facturation/generate-facture-button";
import { PeriodeNav } from "@/components/facturation/periode-nav";
import { requireOwner } from "@/lib/auth/guards";
import { listCommandesForPeriode } from "@/lib/data/commandes";
import { listFacturesForPeriode } from "@/lib/data/factures";
import { parsePeriodeParam, periodeOf, todayInAppZone } from "@/lib/format";
import { formatCents, numericToCents } from "@/lib/pricing";
import type { SearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Facturation" };

export default async function FacturationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOwner();
  const sp = await searchParams;
  const periode = parsePeriodeParam(sp.mois, todayInAppZone());
  const [commandes, factures] = await Promise.all([
    listCommandesForPeriode(periode),
    listFacturesForPeriode(periode),
  ]);

  const parClient = new Map<
    string,
    { nom: string; commandes: typeof commandes }
  >();
  for (const commande of commandes) {
    const entry = parClient.get(commande.clientId) ?? {
      nom: commande.client.nom,
      commandes: [],
    };
    entry.commandes.push(commande);
    parClient.set(commande.clientId, entry);
  }

  return (
    <div className="flex flex-col gap-6">
      <PeriodeNav periode={periode} />

      {parClient.size === 0 ? (
        <div className="flex flex-col items-center gap-3 border-y py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune commande sur cette période.
          </p>
          {periode !== periodeOf(new Date()) ? (
            <Link
              href="/facturation"
              className="text-sm underline underline-offset-4 hover:text-muted-foreground"
            >
              Revenir à ce mois-ci
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Les commandes arrivent via l&apos;espace client :{" "}
              <Link
                href="/projets"
                className="underline underline-offset-4 hover:text-foreground"
              >
                invite un client
              </Link>{" "}
              depuis Projets.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {[...parClient.entries()].map(([clientId, entry]) => {
            const totalCents = entry.commandes.reduce(
              (sum, c) => sum + totalCommandeCents(c.lignes, c.tip),
              0,
            );
            const facturesClient = factures.filter(
              (f) => f.clientId === clientId,
            );
            const derniere = facturesClient[0];
            return (
              <section key={clientId} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-medium">{entry.nom}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">
                      {formatCents(totalCents)}
                    </span>
                    <GenerateFactureButton
                      clientId={clientId}
                      periode={periode}
                      revisionSuivante={(derniere?.revision ?? 0) + 1}
                    />
                  </div>
                </div>

                <ul className="divide-y border-y">
                  {entry.commandes.map((commande) => (
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

                {facturesClient.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {facturesClient.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <span>
                          <Link
                            href={`/facturation/${f.id}`}
                            className="underline underline-offset-4 hover:text-foreground"
                          >
                            {f.numero}
                          </Link>{" "}
                          — révision {f.revision} ·{" "}
                          <span className="tabular-nums">
                            {formatCents(numericToCents(f.totalTtc))}
                          </span>
                          {derniere && f.id !== derniere.id && " (remplacée)"}
                        </span>
                        {derniere && f.id !== derniere.id && (
                          <DeleteFactureButton
                            factureId={f.id}
                            numero={f.numero}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
