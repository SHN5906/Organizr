import { LogoutButton } from "@/components/shell/logout-button";
import { logoutClientAction } from "@/lib/actions/auth";
import { requireClient } from "@/lib/auth/guards";
import { getClientById } from "@/lib/data/clients";

// Guard UX au layout ; chaque page et chaque action re-vérifient (les
// layouts ne sont pas une frontière de sécurité).
export default async function PortailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clientId = await requireClient();
  const client = await getClientById(clientId);

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-3 px-4 md:px-8">
          <span className="shrink-0 text-sm font-semibold tracking-tight">
            ReNew Editing
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            Espace client
          </span>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              {client?.nom}
            </span>
            <form action={logoutClientAction} className="shrink-0">
              <LogoutButton />
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        {children}
      </main>
    </>
  );
}
