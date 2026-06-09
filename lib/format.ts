import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Jour civil d'un instant dans un fuseau donné. Le serveur (Vercel) tourne
 * en UTC et `TZ` y est réservé : « aujourd'hui » doit être calculé avec le
 * fuseau de l'utilisateur (APP_TZ, défaut Europe/Paris), pas l'horloge OS.
 */
export function dayInZone(instant: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return new Date(get("year"), get("month") - 1, get("day"));
}

export function todayInAppZone(): Date {
  return dayInZone(new Date(), process.env.APP_TZ || "Europe/Paris");
}

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
