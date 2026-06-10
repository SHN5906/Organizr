import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addPeriode } from "@/lib/format";

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function periodeLabel(periode: string): string {
  const [y, m] = periode.split("-").map(Number);
  return `${MOIS[m - 1]} ${y}`;
}

export function PeriodeNav({ periode }: { periode: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight capitalize">
        {periodeLabel(periode)}
      </h1>
      <nav aria-label="Navigation des périodes" className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon" className="size-8">
          <Link
            href={`/facturation?mois=${addPeriode(periode, -1)}`}
            aria-label="Période précédente"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8">
          <Link href="/facturation">Ce mois-ci</Link>
        </Button>
        <Button asChild variant="outline" size="icon" className="size-8">
          <Link
            href={`/facturation?mois=${addPeriode(periode, 1)}`}
            aria-label="Période suivante"
          >
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </nav>
    </div>
  );
}
