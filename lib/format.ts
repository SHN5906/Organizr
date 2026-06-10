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

function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

function zonedMonthStartUtc(
  year: number,
  monthIndex: number,
  timeZone: string,
): Date {
  // Minuit local du 1er du mois, exprimé en instant UTC (raffiné pour le DST).
  const guess = new Date(Date.UTC(year, monthIndex, 1));
  const refined = new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
  return new Date(guess.getTime() - tzOffsetMs(refined, timeZone));
}

/**
 * Bornes d'une période de facturation 'YYYY-MM' dans le fuseau applicatif :
 * [début du mois, début du mois suivant) en instants UTC.
 */
export function periodeBounds(
  periode: string,
  timeZone = process.env.APP_TZ || "Europe/Paris",
): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(periode);
  if (!match) throw new Error(`Période invalide : ${periode}`);
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return {
    start: zonedMonthStartUtc(year, monthIndex, timeZone),
    end: zonedMonthStartUtc(year, monthIndex + 1, timeZone),
  };
}

/** Instant → période 'YYYY-MM' dans le fuseau applicatif. */
export function periodeOf(
  instant: Date,
  timeZone = process.env.APP_TZ || "Europe/Paris",
): string {
  const day = dayInZone(instant, timeZone);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}`;
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
