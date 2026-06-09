"use client";

import * as React from "react";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { StatutDot } from "@/components/missions/statut-badge";
import {
  MissionForm,
  type ProjetOption,
} from "@/components/missions/mission-form";
import {
  deleteMissionAction,
  updateMissionAction,
  updateMissionStatutAction,
} from "@/lib/actions/missions";
import type { MissionWithProjet } from "@/lib/data/missions";
import { formatDayFr } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  STATUT_LABELS,
  STATUTS,
  TYPE_LABELS,
  type Statut,
} from "@/lib/validation/labels";

function StatutSelect({ mission }: { mission: MissionWithProjet }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <StatutDot statut={mission.statut} />
      <NativeSelect
        aria-label={`Statut de « ${mission.titre} »`}
        className="w-32"
        value={mission.statut}
        disabled={pending}
        onChange={(e) => {
          const statut = e.target.value as Statut;
          startTransition(async () => {
            await updateMissionStatutAction({ id: mission.id, statut });
          });
        }}
      >
        {STATUTS.map((s) => (
          <option key={s} value={s}>
            {STATUT_LABELS[s]}
          </option>
        ))}
      </NativeSelect>
    </span>
  );
}

export function MissionRow({
  mission,
  projets,
}: {
  mission: MissionWithProjet;
  projets: ProjetOption[];
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pendingDelete, startDelete] = React.useTransition();
  const termine = mission.statut === "termine";

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_auto_auto_auto] md:gap-x-6">
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-medium",
            termine && "text-muted-foreground",
          )}
        >
          {mission.titre}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {mission.projet.titre} · {mission.client.nom} ·{" "}
          {TYPE_LABELS[mission.projet.type]}
        </p>
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums md:col-span-1 md:justify-end">
        {mission.datePlanifiee && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden className="size-3.5" />
            {formatDayFr(mission.datePlanifiee, "EEE d MMM")}
          </span>
        )}
        {mission.deadline && (
          <span
            className="inline-flex items-center gap-1.5"
            title="Deadline"
          >
            <span
              aria-hidden
              className="inline-block size-2 rounded-full border border-foreground"
            />
            {formatDayFr(mission.deadline, "EEE d MMM")}
          </span>
        )}
      </div>

      <div>
        <StatutSelect mission={mission} />
      </div>

      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Modifier « ${mission.titre} »`}
          onClick={() => setEditOpen(true)}
        >
          <Pencil aria-hidden className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Supprimer « ${mission.titre} »`}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la mission</DialogTitle>
            <DialogDescription>{mission.titre}</DialogDescription>
          </DialogHeader>
          <MissionForm
            mode="edit"
            projets={projets}
            submitLabel="Enregistrer"
            defaultValues={{
              projetId: mission.projetId,
              titre: mission.titre,
              statut: mission.statut,
              datePlanifiee: mission.datePlanifiee,
              deadline: mission.deadline,
              notes: mission.notes ?? "",
            }}
            onSubmit={(values) =>
              updateMissionAction({ id: mission.id, ...values })
            }
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la mission ?</DialogTitle>
            <DialogDescription>
              « {mission.titre} » sera définitivement supprimée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={pendingDelete}
              onClick={() =>
                startDelete(async () => {
                  await deleteMissionAction({ id: mission.id });
                  setDeleteOpen(false);
                })
              }
            >
              {pendingDelete ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
