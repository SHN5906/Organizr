import { cn } from "@/lib/utils";
import { STATUT_LABELS, type Statut } from "@/lib/validation/labels";

/**
 * Les statuts se distinguent par la FORME, jamais par la teinte :
 * ○ à faire · ◐ en cours · ◌ pointillé en revue · ● terminé.
 */
export function StatutDot({
  statut,
  className,
}: {
  statut: Statut;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-statut={statut}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full border border-foreground",
        statut === "en_revue" && "border-dashed",
        statut === "termine" && "bg-foreground",
        className,
      )}
      style={
        statut === "en_cours"
          ? {
              background:
                "linear-gradient(90deg, var(--foreground) 50%, transparent 50%)",
            }
          : undefined
      }
    />
  );
}

export function StatutBadge({
  statut,
  className,
}: {
  statut: Statut;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        statut === "termine" ? "text-muted-foreground" : "text-foreground",
        className,
      )}
    >
      <StatutDot statut={statut} />
      {STATUT_LABELS[statut]}
    </span>
  );
}
