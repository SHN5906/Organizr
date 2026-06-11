"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateFactureAction } from "@/lib/actions/factures";

export function GenerateFactureButton({
  clientId,
  periode,
  revisionSuivante,
}: {
  clientId: string;
  periode: string;
  revisionSuivante: number;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={revisionSuivante > 1 ? "outline" : "default"}
        size="sm"
        disabled={pending}
        onClick={async () => {
          setError(null);
          setPending(true);
          const result = await generateFactureAction({ clientId, periode });
          if (!result.ok) {
            setError(result.error);
            setPending(false);
            return;
          }
          // PAS de finally : le bouton reste désarmé jusqu'à ce que la
          // navigation le démonte — aucun double-clic possible entre-temps.
          router.push(`/facturation/${result.data.factureId}`);
        }}
      >
        {pending
          ? "Génération…"
          : revisionSuivante > 1
            ? `Régénérer (révision ${revisionSuivante})`
            : "Générer la facture"}
      </Button>
      {error && (
        <span role="alert" className="text-xs font-medium text-foreground">
          {error}
        </span>
      )}
    </div>
  );
}
