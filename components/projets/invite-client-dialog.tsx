"use client";

import * as React from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  inviteClientAction,
  revokeInvitationAction,
} from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/actions/types";
import { formatDayFr } from "@/lib/format";

export type InvitationRow = {
  id: string;
  createdAt: string; // ISO
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type InviteAction = (
  input: unknown,
) => Promise<ActionResult<{ url: string; expiresAt: string }>>;

export function InviteClientDialog({
  clientId,
  clientNom,
  invitations,
  action = inviteClientAction,
  revokeAction = revokeInvitationAction,
}: {
  clientId: string;
  clientNom: string;
  invitations: InvitationRow[];
  action?: InviteAction;
  revokeAction?: (input: unknown) => Promise<ActionResult>;
}) {
  const [generated, setGenerated] = React.useState<{
    url: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const actifs = invitations.filter(
    (i) => !i.revokedAt && new Date(i.expiresAt).getTime() > Date.now(),
  );

  return (
    <Dialog onOpenChange={() => setCopied(false)}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Inviter ${clientNom}`}
        >
          <UserPlus aria-hidden className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Accès espace client</DialogTitle>
          <DialogDescription>
            {clientNom} — génère un lien d&apos;accès et envoie-le toi-même
            (le lien n&apos;est montré qu&apos;une fois).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {generated ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Input
                  readOnly
                  value={generated.url}
                  aria-label="Lien d'accès à copier"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  aria-label="Copier le lien"
                  onClick={async () => {
                    await navigator.clipboard.writeText(generated.url);
                    setCopied(true);
                  }}
                >
                  {copied ? (
                    <Check aria-hidden data-icon="inline-start" />
                  ) : (
                    <Copy aria-hidden data-icon="inline-start" />
                  )}
                  {copied ? "Copié" : "Copier"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Valable jusqu&apos;au{" "}
                {formatDayFr(generated.expiresAt.slice(0, 10))} — la session du
                client durera ensuite 90 jours.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <Button
                disabled={pending}
                onClick={async () => {
                  setError(null);
                  setPending(true);
                  try {
                    const result = await action({ clientId });
                    if (result.ok) setGenerated(result.data);
                    else setError(result.error);
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {pending ? "Génération…" : "Générer un lien d'accès"}
              </Button>
              {error && (
                <p role="alert" className="text-xs font-medium">
                  {error}
                </p>
              )}
            </div>
          )}

          {actifs.length > 0 && (
            <div className="flex flex-col gap-1 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Accès actifs ({actifs.length})
              </p>
              <ul className="divide-y">
                {actifs.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-3 py-2 text-xs"
                  >
                    <span className="text-muted-foreground tabular-nums">
                      créé le {formatDayFr(inv.createdAt.slice(0, 10))} ·
                      expire le {formatDayFr(inv.expiresAt.slice(0, 10))}
                      {inv.lastUsedAt ? " · utilisé" : " · jamais utilisé"}
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => revokeAction({ id: inv.id })}
                    >
                      Révoquer
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Révoquer coupe l&apos;accès immédiatement, sessions en cours
                comprises.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
