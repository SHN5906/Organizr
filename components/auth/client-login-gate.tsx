"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { loginClientAction } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/actions/types";

/**
 * Le lien magique ne pose JAMAIS de cookie au GET : l'échange token →
 * session se fait par cette action POST, déclenchée par le bouton.
 */
export function ClientLoginGate({
  token,
  action = loginClientAction,
}: {
  token: string;
  action?: (input: unknown) => Promise<ActionResult>;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        disabled={pending}
        onClick={async () => {
          setError(null);
          setPending(true);
          try {
            const result = await action({ token });
            if (result && !result.ok) setError(result.error);
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Ouverture…" : "Accéder à mon espace"}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
