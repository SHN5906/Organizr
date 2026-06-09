"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarMarker,
  KIND_LABELS,
} from "@/components/calendar/calendar-marker";
import { StatutBadge } from "@/components/missions/statut-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MonthGridDay } from "@/lib/calendar";
import type { CalendarItem } from "@/lib/data/missions";
import { parseDay } from "@/lib/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  ["lun", "lundi"],
  ["mar", "mardi"],
  ["mer", "mercredi"],
  ["jeu", "jeudi"],
  ["ven", "vendredi"],
  ["sam", "samedi"],
  ["dim", "dimanche"],
] as const;

const MAX_VISIBLE = 3;

function dayLabel(day: MonthGridDay, count: number): string {
  const date = format(parseDay(day.date), "EEEE d MMMM yyyy", { locale: fr });
  if (count === 0) return `${date}, aucune mission`;
  return `${date}, ${count} élément${count > 1 ? "s" : ""}`;
}

function CellContent({
  day,
  items,
}: {
  day: MonthGridDay;
  items: CalendarItem[];
}) {
  const overflow = items.length - MAX_VISIBLE;
  return (
    <>
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center text-sm tabular-nums",
          day.isToday
            ? "rounded-full bg-foreground font-medium text-background"
            : day.inMonth
              ? "font-medium text-foreground"
              : "text-muted-foreground",
        )}
      >
        {day.dayOfMonth}
      </span>
      {items.length > 0 && (
        // Pas de <ul> ici : ce contenu vit parfois dans un <button>
        // (phrasing content uniquement) — des <span> stylés suffisent.
        <span className="mt-0.5 flex flex-col gap-0.5">
          {items.slice(0, MAX_VISIBLE).map((item, i) => (
            <span
              key={`${item.kind}-${item.missionId ?? item.projetId}-${i}`}
              className={cn(
                "flex items-center gap-1.5 text-xs leading-tight",
                item.statut === "termine" && "text-muted-foreground",
              )}
            >
              <CalendarMarker kind={item.kind} />
              <span className="hidden truncate sm:inline">{item.titre}</span>
            </span>
          ))}
          {overflow > 0 && (
            <span className="text-xs text-muted-foreground">+{overflow}</span>
          )}
        </span>
      )}
    </>
  );
}

export function MonthGrid({
  grid,
  itemsByDay,
}: {
  grid: MonthGridDay[][];
  itemsByDay: Record<string, CalendarItem[]>;
}) {
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const selectedItems = selectedDay ? (itemsByDay[selectedDay] ?? []) : [];

  return (
    <>
      {/* Sémantique table STATIQUE (pas role=grid : ce widget n'implémente
          pas le modèle clavier des grilles ARIA — Tab + Entrée suffisent). */}
      <div
        role="table"
        aria-label="Calendrier du mois"
        className="border-border-strong overflow-hidden rounded-md border"
      >
        <div role="row" className="grid grid-cols-7 border-b">
          {WEEKDAYS.map(([abbr, full]) => (
            <div
              role="columnheader"
              key={abbr}
              className="text-muted-foreground px-2 py-1.5 text-xs"
            >
              <span aria-hidden>{abbr}</span>
              <span className="sr-only">{full}</span>
            </div>
          ))}
        </div>
        {grid.map((week, w) => (
          <div
            role="row"
            key={w}
            className="grid grid-cols-7 not-last:border-b"
          >
            {week.map((day) => {
              const items = itemsByDay[day.date] ?? [];
              const interactive = items.length > 0;
              return (
                <div
                  role="cell"
                  key={day.date}
                  data-date={day.date}
                  className={cn(
                    "min-h-14 not-last:border-r sm:min-h-24",
                    !day.inMonth && "bg-muted/50",
                  )}
                >
                  {interactive ? (
                    <button
                      type="button"
                      aria-label={dayLabel(day, items.length)}
                      onClick={() => setSelectedDay(day.date)}
                      className="hover:bg-accent block h-full w-full p-1.5 text-left transition-colors duration-150"
                    >
                      <CellContent day={day} items={items} />
                    </button>
                  ) : (
                    <div className="h-full p-1.5">
                      <CellContent day={day} items={items} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <Dialog
        open={selectedDay !== null}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selectedDay &&
                format(parseDay(selectedDay), "EEEE d MMMM yyyy", {
                  locale: fr,
                })}
            </DialogTitle>
            <DialogDescription>
              {selectedItems.length} élément
              {selectedItems.length > 1 ? "s" : ""} ce jour-là.
            </DialogDescription>
          </DialogHeader>
          <ul className="divide-y border-y">
            {selectedItems.map((item, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <CalendarMarker kind={item.kind} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      item.statut === "termine" && "text-muted-foreground",
                    )}
                  >
                    {item.titre}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {KIND_LABELS[item.kind]} · {item.projetTitre} ·{" "}
                    {item.clientNom}
                  </p>
                </div>
                <StatutBadge statut={item.statut} />
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
