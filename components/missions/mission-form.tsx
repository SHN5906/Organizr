"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateField } from "@/components/forms/date-field";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/types";
import {
  STATUT_LABELS,
  STATUTS,
  type TypeProjet,
} from "@/lib/validation/labels";
import {
  missionFormSchema,
  type MissionFormValues,
} from "@/lib/validation/missions";

export type ProjetOption = {
  id: string;
  titre: string;
  clientNom: string;
  type: TypeProjet;
};

type MissionFormProps = {
  projets: ProjetOption[];
  mode?: "create" | "edit";
  defaultProjetId?: string;
  defaultValues?: Partial<MissionFormValues>;
  submitLabel?: string;
  onSubmit: (values: MissionFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

export function MissionForm({
  projets,
  mode = "create",
  defaultProjetId,
  defaultValues,
  submitLabel = "Ajouter",
  onSubmit,
  onSuccess,
}: MissionFormProps) {
  const uid = React.useId();
  const form = useForm<MissionFormValues>({
    resolver: zodResolver(missionFormSchema),
    defaultValues: {
      projetId: defaultProjetId ?? projets[0]?.id ?? "",
      titre: "",
      statut: "a_faire",
      datePlanifiee: null,
      deadline: null,
      notes: "",
      ...defaultValues,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const byClient = new Map<string, ProjetOption[]>();
  for (const p of projets) {
    byClient.set(p.clientNom, [...(byClient.get(p.clientNom) ?? []), p]);
  }

  const submit = form.handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof MissionFormValues, {
            message: messages[0],
          });
        }
      } else {
        form.setError("root", { message: result.error });
      }
      return;
    }
    form.reset();
    onSuccess?.();
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-titre`}>Titre</Label>
        <Input
          id={`${uid}-titre`}
          autoFocus
          autoComplete="off"
          placeholder="Derush interview, maquette accueil…"
          aria-invalid={!!errors.titre}
          {...form.register("titre")}
        />
        <FieldError message={errors.titre?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-projet`}>Projet</Label>
        <NativeSelect
          id={`${uid}-projet`}
          aria-invalid={!!errors.projetId}
          {...form.register("projetId")}
        >
          {[...byClient.entries()].map(([clientNom, options]) => (
            <optgroup key={clientNom} label={clientNom}>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titre}
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
        <FieldError message={errors.projetId?.message} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-date`}>Planifiée le</Label>
          <Controller
            control={form.control}
            name="datePlanifiee"
            render={({ field }) => (
              <DateField
                id={`${uid}-date`}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <FieldError message={errors.datePlanifiee?.message} />
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
      </div>

      {mode === "edit" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-statut`}>Statut</Label>
            <NativeSelect id={`${uid}-statut`} {...form.register("statut")}>
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {STATUT_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-notes`}>Notes</Label>
            <Textarea
              id={`${uid}-notes`}
              rows={3}
              placeholder="Retours client, liens, détails…"
              {...form.register("notes")}
            />
          </div>
        </>
      )}

      <FieldError message={errors.root?.message} />

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ajout en cours…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
