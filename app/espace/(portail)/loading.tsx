/** Squelette du portail client : gabarit réglé par filets, sans spinner. */
export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement"
      className="flex flex-col gap-6 motion-safe:animate-pulse"
    >
      <div className="flex flex-col gap-3">
        <div className="h-8 w-56 rounded-sm bg-accent" />
        <div className="h-4 w-72 max-w-full rounded-sm bg-accent/60" />
      </div>
      <ul className="divide-y border-y">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex items-center justify-between gap-6 py-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="h-4 w-48 max-w-full rounded-sm bg-accent" />
              <div className="h-3 w-32 rounded-sm bg-accent/60" />
            </div>
            <div className="h-3 w-16 shrink-0 rounded-sm bg-accent/60" />
          </li>
        ))}
      </ul>
    </div>
  );
}
