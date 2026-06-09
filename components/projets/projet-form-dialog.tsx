"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DateField } from "@/components/forms/date-field";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createProjetAction } from "@/lib/actions/projets";
import {
  TYPE_LABELS,
  TYPES_PROJET,
} from "@/lib/validation/labels";

const projetFormSchema = z.object({
  clientId: z.uuid("Client requis"),
  type: z.enum(TYPES_PROJET),
  titre: z.string().trim().min(1, "Champ requis"),
  description: z.string(),
  deadline: z.iso.date("Date invalide").nullable(),
});

type ProjetFormValues = z.infer<typeof projetFormSchema>;
type ClientOption = { id: string; nom: string };

export function ProjetFormDialog({
  clients,
  trigger,
}: {
  clients: ClientOption[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const uid = React.useId();
  const form = useForm<ProjetFormValues>({
    resolver: zodResolver(projetFormSchema),
    defaultValues: {
      clientId: clients[0]?.id ?? "",
      type: "montage_video",
      titre: "",
      description: "",
      deadline: null,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    const result = await createProjetAction(values);
    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof ProjetFormValues, {
            message: messages[0],
          });
        }
      } else {
        form.setError("root", { message: result.error });
      }
      return;
    }
    form.reset();
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Nouveau projet</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
          <DialogDescription>
            Un projet appartient à un client et porte des missions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-titre`}>Titre</Label>
            <Input
              id={`${uid}-titre`}
              autoFocus
              autoComplete="off"
              placeholder="Refonte site, aftermovie…"
              aria-invalid={!!errors.titre}
              aria-describedby={errors.titre ? `${uid}-titre-error` : undefined}
              {...form.register("titre")}
            />
            <FieldError
              id={`${uid}-titre-error`}
              message={errors.titre?.message}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-client`}>Client</Label>
              <NativeSelect
                id={`${uid}-client`}
                aria-invalid={!!errors.clientId}
                aria-describedby={
                  errors.clientId ? `${uid}-client-error` : undefined
                }
                {...form.register("clientId")}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </NativeSelect>
              <FieldError
                id={`${uid}-client-error`}
                message={errors.clientId?.message}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-type`}>Type</Label>
              <NativeSelect id={`${uid}-type`} {...form.register("type")}>
                {TYPES_PROJET.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-deadline`}>Deadline</Label>
            <Controller
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <DateField
                  id={`${uid}-deadline`}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError message={errors.deadline?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-description`}>Description</Label>
            <Textarea
              id={`${uid}-description`}
              rows={2}
              placeholder="Périmètre, livrables…"
              {...form.register("description")}
            />
          </div>

          <FieldError message={errors.root?.message} />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Création…" : "Créer le projet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
