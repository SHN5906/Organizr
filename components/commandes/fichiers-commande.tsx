type Lien = { id: string; titre: string | null; url: string };

/**
 * Liens de partage + brief PDF d'une commande — affiché côté interne
 * (facturation, projets) et côté client (historique).
 */
export function FichiersCommande({
  liens,
  briefNom,
  commandeId,
}: {
  liens: Lien[];
  briefNom: string | null;
  commandeId: string;
}) {
  if (liens.length === 0 && !briefNom) return null;
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {liens.map((lien, index) => (
        <a
          key={lien.id}
          href={lien.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {lien.titre || `Lien ${index + 1}`}
        </a>
      ))}
      {briefNom && (
        <a
          href={`/api/briefs/${commandeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Brief PDF — {briefNom}
        </a>
      )}
    </p>
  );
}
