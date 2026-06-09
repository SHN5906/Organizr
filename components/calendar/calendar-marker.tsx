import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/lib/data/missions";

export const KIND_LABELS: Record<CalendarItem["kind"], string> = {
  mission_planifiee: "Planifiée",
  deadline_mission: "Deadline mission",
  deadline_projet: "Deadline projet",
};

/**
 * Distinction purement par la forme (monochrome) :
 * ● plein = mission planifiée · ○ creux = deadline mission ·
 * ◇ losange creux = deadline projet.
 */
export function CalendarMarker({
  kind,
  className,
}: {
  kind: CalendarItem["kind"];
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-kind={kind}
      className={cn(
        "inline-block size-2 shrink-0",
        kind === "mission_planifiee" && "rounded-full bg-foreground",
        kind === "deadline_mission" && "rounded-full border border-foreground",
        kind === "deadline_projet" && "rotate-45 border border-foreground",
        className,
      )}
    />
  );
}
