export const dynamic = "force-dynamic";

// Placeholder P3 : le calendrier mensuel custom arrive en P4.
export default function HomePage() {
  return (
    <div className="flex flex-col gap-2 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Calendrier</h1>
      <p className="text-sm text-muted-foreground">
        La vue mensuelle arrive à la phase P4.
      </p>
    </div>
  );
}
