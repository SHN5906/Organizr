import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OwnerLoginForm } from "@/components/auth/owner-login-form";
import { isOwner } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage() {
  if (await isOwner()) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Organizr</h1>
        <p className="text-sm text-muted-foreground">
          Espace de travail privé. Connecte-toi pour continuer.
        </p>
      </div>
      <OwnerLoginForm />
    </main>
  );
}
