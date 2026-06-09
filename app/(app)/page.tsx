import {
  CalendarMarker,
  KIND_LABELS,
} from "@/components/calendar/calendar-marker";
import { MonthGrid } from "@/components/calendar/month-grid";
import { MonthNav } from "@/components/calendar/month-nav";
import {
  buildMonthGrid,
  groupCalendarItems,
  monthGridInterval,
  parseMonthParam,
} from "@/lib/calendar";
import { getCalendarItems } from "@/lib/data/missions";
import type { SearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const monthParam = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const today = new Date();
  const month = parseMonthParam(monthParam, today);
  const { start, end } = monthGridInterval(month);
  const items = await getCalendarItems(start, end);
  const grid = buildMonthGrid(month, today);
  const itemsByDay = groupCalendarItems(items);

  return (
    <div className="flex flex-col gap-4">
      <MonthNav month={month} />

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Rien de planifié ce mois-ci. Appuie sur{" "}
          <kbd className="rounded-sm border px-1.5 py-0.5 font-sans text-[11px]">
            n
          </kbd>{" "}
          pour créer une mission.
        </p>
      )}

      <MonthGrid grid={grid} itemsByDay={itemsByDay} />

      <ul
        aria-label="Légende"
        className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground"
      >
        {(Object.keys(KIND_LABELS) as Array<keyof typeof KIND_LABELS>).map(
          (kind) => (
            <li key={kind} className="flex items-center gap-1.5">
              <CalendarMarker kind={kind} />
              {KIND_LABELS[kind]}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
