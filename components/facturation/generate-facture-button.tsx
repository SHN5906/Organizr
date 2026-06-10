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
          try {
            const result = await generateFactureAction({ clientId, periode });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/facturation/${result.data.factureId}`);
          } finally {
            setPending(false);
          }
        }}
      >
        {pending
          ? "Génération…"
          : revisionSuivante > 1
            ? `Régénérer (révision ${revisionSuivante})`
            : "Générer la facture"}
      </Button>
      {error && (
        <span role="alert" className="text-xs font-medium">
          {error}
        </span>
      )}
    </div>
  );
}
