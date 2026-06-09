import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CalendarItem } from "@/lib/data/missions";

export type MonthGridDay = {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
};

const WEEK = { weekStartsOn: 1 as const }; // lundi

/** "2026-06" → 1er juin 2026 ; absent/invalide → mois de `today`. */
export function parseMonthParam(
  param: string | undefined,
  today: Date,
): Date {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const parsed = parse(param, "yyyy-MM", new Date());
    if (isValid(parsed)) return startOfMonth(parsed);
  }
  return startOfMonth(today);
}

export function monthParamOf(date: Date): string {
  return format(date, "yyyy-MM");
}

/** Bornes de la GRILLE (lundi → dimanche), pas du mois. */
export function monthGridInterval(month: Date): {
  start: string;
  end: string;
} {
  const start = startOfWeek(startOfMonth(month), WEEK);
  const end = endOfWeek(endOfMonth(month), WEEK);
  return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
}

/** Grille mensuelle : semaines complètes lun→dim couvrant le mois. */
export function buildMonthGrid(month: Date, today: Date): MonthGridDay[][] {
  const start = startOfWeek(startOfMonth(month), WEEK);
  const end = endOfWeek(endOfMonth(month), WEEK);
  const days = eachDayOfInterval({ start, end });

  const weeks: MonthGridDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(
      days.slice(i, i + 7).map((day) => ({
        date: format(day, "yyyy-MM-dd"),
        dayOfMonth: day.getDate(),
        inMonth: isSameMonth(day, month),
        isToday: isSameDay(day, today),
      })),
    );
  }
  return weeks;
}

const KIND_ORDER: Record<CalendarItem["kind"], number> = {
  mission_planifiee: 0,
  deadline_mission: 1,
  deadline_projet: 2,
};

/** Items par jour (YYYY-MM-DD), missions planifiées avant les deadlines. */
export function groupCalendarItems(
  items: CalendarItem[],
): Record<string, CalendarItem[]> {
  const grouped: Record<string, CalendarItem[]> = {};
  for (const item of items) {
    (grouped[item.date] ??= []).push(item);
  }
  for (const day of Object.values(grouped)) {
    day.sort(
      (a, b) =>
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.titre.localeCompare(b.titre),
    );
  }
  return grouped;
}

export function nextMonth(month: Date): Date {
  return startOfMonth(addDays(endOfMonth(month), 1));
}

export function prevMonth(month: Date): Date {
  return startOfMonth(addDays(startOfMonth(month), -1));
}
