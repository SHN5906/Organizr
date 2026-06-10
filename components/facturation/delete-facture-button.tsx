"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteFactureAction } from "@/lib/actions/factures";

/** Corbeille des ANCIENNES révisions — la dernière n'est jamais proposée. */
export function DeleteFactureButton({
  factureId,
  numero,
}: {
  factureId: string;
  numero: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        aria-label={`Supprimer ${numero}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden className="size-3.5" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cette révision ?</DialogTitle>
            <DialogDescription>
              {numero} (révision remplacée) sera définitivement supprimée.
              Son numéro ne sera pas réutilisé.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-xs font-medium">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteFactureAction({ id: factureId });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setOpen(false);
                })
              }
            >
              {pending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
