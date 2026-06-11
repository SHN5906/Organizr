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
  // useTransition : en cas de succès l'action redirige — le pending tient
  // jusqu'à l'arrivée sur la page suivante (pas de bouton ré-armé à vide).
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get("password");
    startTransition(async () => {
      setError(null);
      const result = await action({ password });
      if (result && !result.ok) setError(result.error);
    });
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
