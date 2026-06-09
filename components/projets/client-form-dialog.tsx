"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientAction } from "@/lib/actions/clients";

const clientFormSchema = z.object({
  nom: z.string().trim().min(1, "Champ requis"),
  contact: z.string(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export function ClientFormDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const uid = React.useId();
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: { nom: "", contact: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    const result = await createClientAction(values);
    if (!result.ok) {
      if (result.fieldErrors?.nom)
        form.setError("nom", { message: result.fieldErrors.nom[0] });
      else form.setError("root", { message: result.error });
      return;
    }
    form.reset();
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Nouveau client</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
          <DialogDescription>
            Le nom suffit, le contact est optionnel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-nom`}>Nom</Label>
            <Input
              id={`${uid}-nom`}
              autoFocus
              autoComplete="off"
              placeholder="ACME Studio"
              aria-invalid={!!errors.nom}
              aria-describedby={errors.nom ? `${uid}-nom-error` : undefined}
              {...form.register("nom")}
            />
            <FieldError id={`${uid}-nom-error`} message={errors.nom?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-contact`}>Contact</Label>
            <Input
              id={`${uid}-contact`}
              autoComplete="off"
              placeholder="email, téléphone…"
              {...form.register("contact")}
            />
          </div>
          <FieldError message={errors.root?.message} />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Création…" : "Créer le client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
