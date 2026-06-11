import { cn } from "@/lib/utils";

/**
 * Touche clavier — un seul rendu pour tout hint de raccourci.
 * `inverse` pour les fonds encre (bouton primary).
 */
function Kbd({
  className,
  inverse = false,
  ...props
}: React.ComponentProps<"kbd"> & { inverse?: boolean }) {
  return (
    <kbd
      className={cn(
        "rounded-sm border px-1 font-sans text-[11px] leading-4",
        inverse
          ? "border-primary-foreground/40 text-primary-foreground/80"
          : "border-border-strong text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
