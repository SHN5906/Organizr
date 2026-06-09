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
      <select
        data-slot="native-select"
        className="border-input h-9 w-full appearance-none rounded-md border bg-transparent py-1 pr-8 pl-3 text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
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
