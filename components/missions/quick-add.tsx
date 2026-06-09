"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createMissionAction } from "@/lib/actions/missions";
import {
  MissionForm,
  type ProjetOption,
} from "@/components/missions/mission-form";

type QuickAddContextValue = {
  openQuickAdd: () => void;
  projets: ProjetOption[];
};

const QuickAddContext = React.createContext<QuickAddContextValue | null>(null);

export function useQuickAdd(): QuickAddContextValue {
  const ctx = React.useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd doit être utilisé sous QuickAddProvider");
  return ctx;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [role='combobox']",
    ),
  );
}

/**
 * Monté dans le layout (app) : raccourci global « n » → dialog de création,
 * avec la liste des projets pré-chargée côté serveur (zéro fetch à l'ouverture).
 */
export function QuickAddProvider({
  projets,
  children,
}: {
  projets: ProjetOption[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const openRef = React.useRef(open);
  openRef.current = open;

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "n" || e.metaKey || e.ctrlKey || e.altKey || e.isComposing)
        return;
      if (openRef.current) return;
      // Un autre dialog ouvert (édition, suppression, projets…) ? On laisse.
      if (document.querySelector("[role='dialog']")) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = React.useMemo(
    () => ({ openQuickAdd: () => setOpen(true), projets }),
    [projets],
  );

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle mission</DialogTitle>
            <DialogDescription>
              {projets.length > 0
                ? "Titre, projet, Entrée. C'est tout."
                : "Une mission appartient à un projet."}
            </DialogDescription>
          </DialogHeader>
          {projets.length > 0 ? (
            <MissionForm
              projets={projets}
              onSubmit={createMissionAction}
              onSuccess={() => setOpen(false)}
            />
          ) : (
            <div className="flex flex-col items-start gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Aucun projet pour l&apos;instant. Crée d&apos;abord un client
                et un projet, la mission suivra.
              </p>
              <Button asChild onClick={() => setOpen(false)}>
                <Link href="/projets">Créer un projet</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </QuickAddContext.Provider>
  );
}
