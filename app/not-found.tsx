import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-3 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Page introuvable
      </h1>
      <p className="text-sm text-muted-foreground">
        Cette page n&apos;existe pas ou n&apos;existe plus.
      </p>
      <p className="text-sm">
        <Link
          href="/"
          className="underline underline-offset-4 hover:text-muted-foreground"
        >
          Retour au calendrier
        </Link>
      </p>
    </main>
  );
}
