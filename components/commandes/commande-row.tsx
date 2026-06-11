import { FichiersCommande } from "@/components/commandes/fichiers-commande";
import { formatInstantDayFr } from "@/lib/format";
import {
  formatCents,
  numericToCents,
  PRESTATION_LABELS,
  type TypePrestation,
} from "@/lib/pricing";
import {
  STATUT_COMMANDE_LABELS,
  type StatutCommande,
} from "@/lib/validation/labels";

type LigneResume = { quantite: number; type: TypePrestation; total: string };
type Lien = { id: string; titre: string | null; url: string };

export function totalCommandeCents(lignes: LigneResume[], tip: string): number {
  return (
    lignes.reduce((s, l) => s + numericToCents(l.total), 0) +
    numericToCents(tip)
  );
}

/**
 * Rangée de commande — LE gabarit partagé entre /facturation et l'espace
 * client (même anatomie, mêmes graisses ; toute dérive se corrige ici).
 */
export function CommandeRow({
  commandeId,
  numero,
  createdAt,
  lignes,
  tip,
  statut,
  liens,
  briefNom,
}: {
  commandeId: string;
  numero: number;
  createdAt: Date;
  lignes: LigneResume[];
  tip: string;
  statut: StatutCommande;
  liens: Lien[];
  briefNom: string | null;
}) {
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-1 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium tabular-nums">
          Commande #{numero}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {formatInstantDayFr(createdAt)}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[
            ...lignes.map(
              (l) => `${l.quantite} × ${PRESTATION_LABELS[l.type]}`,
            ),
            ...(numericToCents(tip) > 0 ? ["Tip"] : []),
          ].join(" · ")}
        </p>
        <FichiersCommande
          liens={liens}
          briefNom={briefNom}
          commandeId={commandeId}
        />
      </div>
      {/* min-w : les statuts de largeurs différentes restent en colonne. */}
      <span className="min-w-16 text-right text-xs text-muted-foreground">
        {STATUT_COMMANDE_LABELS[statut]}
      </span>
      <span className="min-w-20 text-right text-sm font-medium tabular-nums">
        {formatCents(totalCommandeCents(lignes, tip))}
      </span>
    </li>
  );
}
