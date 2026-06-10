import type { Metadata } from "next";
import { requireClient } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Espace client" };

// Squelette V3 : le formulaire de commande arrive en V6.
export default async function EspacePage() {
  await requireClient();
  return (
    <p className="text-sm text-muted-foreground">
      Ton espace de commande arrive très bientôt.
    </p>
  );
}
