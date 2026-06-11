import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth/guards";
import { ClientFormDialog } from "@/components/projets/client-form-dialog";
import {
  InviteClientDialog,
  type InvitationRow,
} from "@/components/projets/invite-client-dialog";
import { ProjetFormDialog } from "@/components/projets/projet-form-dialog";
import { CalendarMarker } from "@/components/calendar/calendar-marker";
import { StatutBadge } from "@/components/missions/statut-badge";
import { Button } from "@/components/ui/button";
import { FichiersCommande } from "@/components/commandes/fichiers-commande";
import { listInvitations } from "@/lib/data/client-access";
import { listCommandesForProjets } from "@/lib/data/commandes";
import { listClients } from "@/lib/data/clients";
import { listProjets } from "@/lib/data/projets";
import { formatDayFr } from "@/lib/format";
import { TYPE_LABELS } from "@/lib/validation/labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Projets" };

export default async function ProjetsPage() {
  await requireOwner();
  const [clients, projets] = await Promise.all([listClients(), listProjets()]);
  const clientOptions = clients.map((c) => ({ id: c.id, nom: c.nom }));
  const fichiersCommandes = await listCommandesForProjets(
    projets.map((p) => p.id),
  );
  const fichiersParProjet = new Map<string, typeof fichiersCommandes>();
  for (const f of fichiersCommandes) {
    const list = fichiersParProjet.get(f.projetId) ?? [];
    list.push(f);
    fichiersParProjet.set(f.projetId, list);
  }
  const invitationsParClient = new Map<string, InvitationRow[]>(
    await Promise.all(
      clients.map(async (c) => {
        const rows = await listInvitations(c.id);
        return [
          c.id,
          rows.map((r) => ({
            id: r.id,
            createdAt: r.createdAt.toISOString(),
            expiresAt: r.expiresAt.toISOString(),
            lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
            revokedAt: r.revokedAt?.toISOString() ?? null,
          })),
        ] as const;
      }),
    ),
  );

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
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-medium">{client.nom}</h2>
                  {client.contact && (
                    <span className="text-xs text-muted-foreground">
                      {client.contact}
                    </span>
                  )}
                  <InviteClientDialog
                    clientId={client.id}
                    clientNom={client.nom}
                    invitations={invitationsParClient.get(client.id) ?? []}
                  />
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
                          {(fichiersParProjet.get(p.id) ?? []).map((f) => (
                            <FichiersCommande
                              key={f.commandeId}
                              label={`Commande #${f.numero}`}
                              liens={f.liens}
                              briefNom={f.briefNom}
                              commandeId={f.commandeId}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {p.deadline ? (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarMarker kind="deadline_projet" />
                              <span className="sr-only">Deadline le</span>
                              {formatDayFr(p.deadline)}
                            </span>
                          ) : (
                            <span aria-hidden>–</span>
                          )}
                        </div>
                        <StatutBadge
                          statut={p.statut}
                          className="col-span-2 justify-self-end md:col-span-1"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center justify-between gap-3 border-y py-3">
                    <p className="text-xs text-muted-foreground">
                      Aucun projet pour ce client.
                    </p>
                    <ProjetFormDialog
                      clients={[
                        { id: client.id, nom: client.nom },
                        ...clientOptions.filter((c) => c.id !== client.id),
                      ]}
                      trigger={
                        <Button variant="outline" size="sm">
                          Créer un projet
                        </Button>
                      }
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
