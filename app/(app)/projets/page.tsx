import type { Metadata } from "next";
import { ClientFormDialog } from "@/components/projets/client-form-dialog";
import { ProjetFormDialog } from "@/components/projets/projet-form-dialog";
import { StatutBadge } from "@/components/missions/statut-badge";
import { Button } from "@/components/ui/button";
import { listClients } from "@/lib/data/clients";
import { listProjets } from "@/lib/data/projets";
import { formatDayFr } from "@/lib/format";
import { TYPE_LABELS } from "@/lib/validation/labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Projets" };

export default async function ProjetsPage() {
  const [clients, projets] = await Promise.all([listClients(), listProjets()]);
  const clientOptions = clients.map((c) => ({ id: c.id, nom: c.nom }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Projets</h1>
        <div className="flex items-center gap-2">
          <ClientFormDialog />
          {clients.length > 0 && <ProjetFormDialog clients={clientOptions} />}
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="border-y py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Commence par créer un client : les projets s&apos;y rattachent,
            puis les missions.
          </p>
          <div className="mt-4 flex justify-center">
            <ClientFormDialog trigger={<Button>Créer un client</Button>} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {clients.map((client) => {
            const projetsClient = projets.filter(
              (p) => p.clientId === client.id,
            );
            return (
              <section key={client.id} className="flex flex-col gap-2">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-base font-medium">{client.nom}</h2>
                  {client.contact && (
                    <span className="text-xs text-muted-foreground">
                      {client.contact}
                    </span>
                  )}
                </div>
                {projetsClient.length > 0 ? (
                  <ul className="divide-y border-y">
                    {projetsClient.map((p) => (
                      <li
                        key={p.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 py-3 md:grid-cols-[minmax(0,2fr)_auto_auto]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {p.titre}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {TYPE_LABELS[p.type]}
                            {p.description ? ` · ${p.description}` : ""}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {p.deadline ? (
                            <span
                              className="inline-flex items-center gap-1.5"
                              title="Deadline projet"
                            >
                              <span
                                aria-hidden
                                className="inline-block size-2 rotate-45 border border-foreground"
                              />
                              {formatDayFr(p.deadline)}
                            </span>
                          ) : (
                            <span aria-hidden>—</span>
                          )}
                        </div>
                        <StatutBadge
                          statut={p.statut}
                          className="justify-self-end"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-y py-4 text-xs text-muted-foreground">
                    Aucun projet pour ce client.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
