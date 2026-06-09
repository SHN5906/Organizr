import { AppHeader } from "@/components/shell/app-header";
import { QuickAddProvider } from "@/components/missions/quick-add";
import type { ProjetOption } from "@/components/missions/mission-form";
import { listProjets } from "@/lib/data/projets";

// Ce layout (et pas le layout racine) touche la DB : le groupe (app) ne
// contient que des pages force-dynamic, donc jamais de PGlite au build.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projets = await listProjets();
  const options: ProjetOption[] = projets.map((p) => ({
    id: p.id,
    titre: p.titre,
    clientNom: p.client.nom,
    type: p.type,
  }));

  return (
    <QuickAddProvider projets={options}>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        {children}
      </main>
    </QuickAddProvider>
  );
}
