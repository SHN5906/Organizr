import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/facturation/print-button";
import { Button } from "@/components/ui/button";
import { requireOwner } from "@/lib/auth/guards";
import { getFacture } from "@/lib/data/factures";
import { formatDayFr } from "@/lib/format";
import { formatCents, numericToCents } from "@/lib/pricing";
import { periodeLabel } from "@/components/facturation/periode-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Facture" };

export default async function FacturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOwner();
  const { id } = await params;
  const facture = await getFacture(id);
  if (!facture) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/facturation?mois=${facture.periode}`}>
            <ArrowLeft aria-hidden data-icon="inline-start" />
            Facturation
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article
        aria-label={`Facture ${facture.numero}`}
        className="mx-auto w-full max-w-2xl"
      >
        <header className="flex items-start justify-between gap-6 border-b-2 border-foreground pb-6">
          <div>
            <p className="text-lg font-semibold tracking-tight">
              ReNew Editing
            </p>
            <p className="text-xs text-muted-foreground">
              Montage vidéo — facture TTC
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {facture.numero}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {periodeLabel(facture.periode)}
            </p>
            {facture.revision > 1 && (
              <p className="text-xs text-muted-foreground">
                révision {facture.revision} — remplace la précédente
              </p>
            )}
          </div>
        </header>

        <div className="flex justify-between gap-6 py-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Facturé à</p>
            <p className="font-medium">{facture.client.nom}</p>
            {facture.client.contact && (
              <p className="text-xs text-muted-foreground">
                {facture.client.contact}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Émise le</p>
            <p className="tabular-nums">
              {formatDayFr(facture.createdAt.toISOString().slice(0, 10))}
            </p>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y text-left text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-normal">
                Prestation
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Commande
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Qté
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                PU TTC
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-normal">
                Total TTC
              </th>
            </tr>
          </thead>
          <tbody>
            {facture.lignes.map((ligne, i) => (
              <tr key={i} className="border-b">
                <td className="py-2.5 pr-3">{ligne.label}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  #{ligne.commandeNumero}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {ligne.quantite}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatCents(numericToCents(ligne.prixUnitaire))}
                </td>
                <td className="py-2.5 pl-3 text-right tabular-nums">
                  {formatCents(numericToCents(ligne.total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="flex w-56 items-baseline justify-between border-t-2 border-foreground pt-3">
            <span className="text-sm font-medium">Total TTC</span>
            <span className="text-base font-semibold tabular-nums">
              {formatCents(numericToCents(facture.totalTtc))}
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
