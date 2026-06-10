import type { Metadata } from "next";
import { ClientLoginGate } from "@/components/auth/client-login-gate";
import type { SearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

// Le token reste dans l'URL (limite assumée du lien magique) : on coupe au
// moins le Referer sortant.
export const metadata: Metadata = {
  title: "Espace client",
  referrer: "no-referrer",
};

// AUCUN accès DB au rendu : la validation du token se fait dans l'action
// POST déclenchée par le bouton (jamais de cookie posé sur un GET).
export default async function EspaceConnexionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const token = (Array.isArray(sp.token) ? sp.token[0] : sp.token) ?? null;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          ReNew Editing
        </h1>
        <p className="text-sm text-muted-foreground">Espace client</p>
      </div>
      {token ? (
        <ClientLoginGate token={token} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Il te faut un lien d&apos;accès personnel pour entrer ici.
          Demande-le à ReNew Editing.
        </p>
      )}
    </main>
  );
}
