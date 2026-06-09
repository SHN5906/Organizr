import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";

/** Parse local d'une date YYYY-MM-DD (jamais new Date(string) : décalage UTC). */
export function parseDay(value: string): Date {
  return parse(value, "yyyy-MM-dd", new Date());
}

export function formatDayFr(
  value: string | null,
  pattern = "d MMM yyyy",
): string | null {
  if (!value) return null;
  return format(parseDay(value), pattern, { locale: fr });
}
