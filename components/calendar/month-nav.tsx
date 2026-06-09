import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthParamOf, nextMonth, prevMonth } from "@/lib/calendar";

export function MonthNav({ month }: { month: Date }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight capitalize">
        {format(month, "LLLL yyyy", { locale: fr })}
      </h1>
      <nav aria-label="Navigation des mois" className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon" className="size-8">
          <Link
            href={`/?month=${monthParamOf(prevMonth(month))}`}
            aria-label="Mois précédent"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8">
          <Link href="/">Aujourd&apos;hui</Link>
        </Button>
        <Button asChild variant="outline" size="icon" className="size-8">
          <Link
            href={`/?month=${monthParamOf(nextMonth(month))}`}
            aria-label="Mois suivant"
          >
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </nav>
    </div>
  );
}
