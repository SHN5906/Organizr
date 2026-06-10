"use client";

import * as React from "react";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginOwnerAction } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/actions/types";

export function OwnerLoginForm({
  action = loginOwnerAction,
}: {
  action?: (input: unknown) => Promise<ActionResult>;
}) {
  const uid = React.useId();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get("password");
    setError(null);
    setPending(true);
    try {
      const result = await action({ password });
      // En cas de succès l'action redirige et ne retourne jamais.
      if (result && !result.ok) setError(result.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-password`}>Mot de passe</Label>
        <Input
          id={`${uid}-password`}
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          aria-invalid={!!error}
          aria-describedby={error ? `${uid}-error` : undefined}
        />
        <FieldError id={`${uid}-error`} message={error ?? undefined} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
