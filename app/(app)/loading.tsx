/**
 * Squelette commun des pages internes (toutes force-dynamic) : un gabarit de
 * page réglé par filets, sans spinner, pulsation coupée si reduced-motion.
 */
export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement"
      className="flex flex-col gap-6 motion-safe:animate-pulse"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="h-8 w-44 rounded-sm bg-accent" />
        <div className="h-9 w-36 rounded-md bg-accent" />
      </div>
      <ul className="divide-y border-y">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="flex items-center justify-between gap-6 py-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="h-4 w-56 max-w-full rounded-sm bg-accent" />
              <div className="h-3 w-36 rounded-sm bg-accent/60" />
            </div>
            <div className="h-3 w-20 shrink-0 rounded-sm bg-accent/60" />
          </li>
        ))}
      </ul>
    </div>
  );
}
