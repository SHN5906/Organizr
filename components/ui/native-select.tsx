import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Select natif stylé : choisi sciemment (vs Radix Select) pour la saisie
 * clavier instantanée (taper une lettre saute à l'option) — au service de
 * l'objectif « mission en moins de 15 s ».
 */
function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <span className={cn("relative inline-flex w-full", className)}>
      {/* Mêmes conventions champ qu'Input : 16 px sur mobile (anti-zoom
          iOS), focus ring encre, invalide = bordure encre. */}
      <select
        data-slot="native-select"
        className="border-input h-9 w-full appearance-none rounded-md border bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-foreground md:text-sm"
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </span>
  );
}

export { NativeSelect };
