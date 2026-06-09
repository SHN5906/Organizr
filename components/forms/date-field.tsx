"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function toDate(value: string | null): Date | undefined {
  // Jamais `new Date("YYYY-MM-DD")` (décalage UTC) : parse en local.
  return value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
}

/** Date-picker react-day-picker contrôlé en string YYYY-MM-DD (ou null). */
export function DateField({
  id,
  value,
  onChange,
  placeholder = "Choisir…",
}: {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = toDate(value);

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "h-9 flex-1 justify-start px-3 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon aria-hidden className="size-4" />
            <span className="tabular-nums">
              {selected
                ? format(selected, "EEE d MMM yyyy", { locale: fr })
                : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={fr}
            selected={selected}
            defaultMonth={selected}
            onSelect={(day) => {
              onChange(day ? format(day, "yyyy-MM-dd") : null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Effacer la date"
          onClick={() => onChange(null)}
        >
          <X aria-hidden className="size-4" />
        </Button>
      )}
    </div>
  );
}
