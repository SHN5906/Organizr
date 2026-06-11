import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/auth/guards";
import { MissionFilters } from "@/components/missions/mission-filters";
import { MissionRow } from "@/components/missions/mission-row";
import type { ProjetOption } from "@/components/missions/mission-form";
import { Kbd } from "@/components/ui/kbd";
import { listClients } from "@/lib/data/clients";
import { listMissions } from "@/lib/data/missions";
import { listProjets } from "@/lib/data/projets";
import { parseDashboardParams, type SearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOwner();
  const params = parseDashboardParams(await searchParams);
  const [missions, clients, projets] = await Promise.all([
    listMissions(params),
    listClients(),
    listProjets(),
  ]);
  const projetOptions: ProjetOption[] = projets.map((p) => ({
    id: p.id,
    titre: p.titre,
    clientNom: p.client.nom,
    type: p.type,
  }));
  const filtered =
    params.type || params.statut || params.clientId ? "filtrée" : null;

  return (
    <div className="group flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground tabular-nums">
          {missions.length} mission{missions.length > 1 ? "s" : ""}
          {filtered ? ` (liste ${filtered})` : ""}
        </p>
      </div>

      <MissionFilters
        params={params}
        clients={clients.map((c) => ({ id: c.id, nom: c.nom }))}
      />

      {missions.length > 0 ? (
        // Pendant un changement de filtre, la liste encore affichée est
        // l'ancienne : on l'atténue (data-pending posé par MissionFilters).
        <ul className="divide-y border-y transition-opacity group-has-[[data-pending]]:opacity-50">
          {missions.map((m) => (
            <MissionRow key={m.id} mission={m} projets={projetOptions} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 border-y py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {filtered ? (
              "Aucune mission ne correspond à ces filtres."
            ) : (
              <>
                Aucune mission.{" "}
                <span className="hidden sm:inline">
                  Appuie sur <Kbd>n</Kbd> pour en créer une.
                </span>
                <span className="sm:hidden">
                  Crée-en une avec le bouton +.
                </span>
              </>
            )}
          </p>
          {filtered && (
            <Link
              href="/dashboard"
              className="text-sm underline underline-offset-4 hover:text-muted-foreground"
            >
              Réinitialiser les filtres
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
