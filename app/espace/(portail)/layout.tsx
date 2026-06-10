import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutClientAction, } from "@/lib/actions/auth";
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
          <span className="text-sm font-semibold tracking-tight">
            ReNew Editing
          </span>
          <span className="text-xs text-muted-foreground">Espace client</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {client?.nom}
            </span>
            <form action={logoutClientAction}>
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                aria-label="Se déconnecter"
              >
                <LogOut aria-hidden className="size-4" />
              </Button>
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
