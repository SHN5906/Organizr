"use client";

import * as React from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/types";
import {
  formatCents,
  lineTotalCents,
  PRESTATION_LABELS,
  QUANTITE_MAX,
  TYPES_PRESTATION,
  unitPriceCents,
} from "@/lib/pricing";

// Schéma du FORMULAIRE (affichage) : AUCUN champ prix — le serveur recalcule
// tout via lib/validation/commandes + lib/pricing.
const ligneFormSchema = z.object({
  type: z.enum(TYPES_PRESTATION),
  quantite: z
    .number({ error: "Quantité requise" })
    .int("Quantité entière requise")
    .min(1, "Quantité minimale : 1")
    .max(QUANTITE_MAX, `Quantité maximale : ${QUANTITE_MAX}`),
  brief: z.string(),
});

const commandeFormSchema = z.object({
  lignes: z.array(ligneFormSchema).min(1, "Ajoute au moins une ligne").max(20),
  tipEuros: z
    .number("Tip invalide")
    .min(0, "Le tip ne peut pas être négatif")
    .max(1000, "Tip maximum : 1 000 €")
    .optional(),
  lienSwisstransfer: z
    .string()
    .max(500, "Lien trop long")
    .refine(
      (v) => v === "" || v.startsWith("https://"),
      "Le lien doit commencer par https://",
    ),
});

const BRIEF_MAX_OCTETS = 5 * 1024 * 1024;

type CommandeFormValues = z.infer<typeof commandeFormSchema>;

function safeLineCents(type: CommandeFormValues["lignes"][number]["type"], quantite: unknown) {
  if (
    typeof quantite !== "number" ||
    !Number.isInteger(quantite) ||
    quantite < 1 ||
    quantite > QUANTITE_MAX
  ) {
    return null;
  }
  return {
    unit: unitPriceCents(type, quantite),
    total: lineTotalCents(type, quantite),
  };
}

export function CommandeForm({
  moisLabel,
  onSubmit,
  onSuccess,
}: {
  /** Mois de facturation courant, ex. « juin 2026 ». */
  moisLabel: string;
  onSubmit: (input: unknown) => Promise<ActionResult<{ numero: number }>>;
  onSuccess?: () => void;
}) {
  const uid = React.useId();
  const [confirme, setConfirme] = React.useState<number | null>(null);
  const [briefFile, setBriefFile] = React.useState<File | null>(null);
  const [briefError, setBriefError] = React.useState<string | null>(null);
  const briefInputRef = React.useRef<HTMLInputElement>(null);
  const form = useForm<CommandeFormValues>({
    resolver: zodResolver(commandeFormSchema),
    defaultValues: {
      lignes: [{ type: "reel_simple", quantite: 1, brief: "" }],
      tipEuros: undefined,
      lienSwisstransfer: "",
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lignes",
  });
  const lignes = useWatch({ control: form.control, name: "lignes" });
  const tipEuros = useWatch({ control: form.control, name: "tipEuros" });
  const { errors, isSubmitting } = form.formState;

  const tipCents =
    typeof tipEuros === "number" && tipEuros >= 0 && tipEuros <= 1000
      ? Math.round(tipEuros * 100)
      : 0;
  const totalCents =
    (lignes ?? []).reduce((sum: number, l) => {
      const cents = l ? safeLineCents(l.type, l.quantite) : null;
      return cents ? sum + cents.total : sum;
    }, 0) + tipCents;

  if (confirme !== null) {
    return (
      <div className="flex flex-col items-start gap-3 border-y py-8">
        <p className="text-base font-medium">
          Commande #{confirme} ajoutée à {moisLabel}.
        </p>
        <p className="text-sm text-muted-foreground">
          Elle apparaît dans ton historique ci-dessous et partira sur la
          facture de {moisLabel} — le montage démarre de notre côté.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            form.reset();
            setConfirme(null);
          }}
        >
          Ajouter d&apos;autres vidéos
        </Button>
      </div>
    );
  }

  const submit = form.handleSubmit(async (values) => {
    if (briefError) return;
    // FormData : payload JSON + brief PDF — le serveur re-valide tout.
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        lignes: values.lignes.map((l) => ({
          type: l.type,
          quantite: l.quantite,
          brief: l.brief,
        })),
        ...(values.tipEuros !== undefined && values.tipEuros > 0
          ? { tipEuros: values.tipEuros }
          : {}),
        ...(values.lienSwisstransfer
          ? { lienSwisstransfer: values.lienSwisstransfer }
          : {}),
      }),
    );
    if (briefFile) fd.set("brief", briefFile);

    const result = await onSubmit(fd);
    if (!result.ok) {
      if (result.fieldErrors?.brief) {
        setBriefError(result.fieldErrors.brief[0]);
      } else {
        form.setError("root", { message: result.error });
      }
      return;
    }
    setBriefFile(null);
    setConfirme(result.data.numero);
    onSuccess?.();
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <ul className="flex flex-col divide-y border-y">
        {fields.map((field, index) => {
          const ligne = lignes?.[index];
          const cents = ligne ? safeLineCents(ligne.type, ligne.quantite) : null;
          const ligneErrors = errors.lignes?.[index];
          return (
            <li
              key={field.id}
              role="group"
              aria-label={`Ligne ${index + 1}`}
              className="flex flex-col gap-3 py-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.6fr)_auto_auto]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${uid}-type-${index}`}>Prestation</Label>
                  <NativeSelect
                    id={`${uid}-type-${index}`}
                    {...form.register(`lignes.${index}.type`)}
                  >
                    {TYPES_PRESTATION.map((t) => (
                      <option key={t} value={t}>
                        {PRESTATION_LABELS[t]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${uid}-qte-${index}`}>Quantité</Label>
                  <Input
                    id={`${uid}-qte-${index}`}
                    type="number"
                    min={1}
                    max={QUANTITE_MAX}
                    className="w-24 tabular-nums"
                    aria-invalid={!!ligneErrors?.quantite}
                    aria-describedby={
                      ligneErrors?.quantite ? `${uid}-qte-${index}-error` : undefined
                    }
                    {...form.register(`lignes.${index}.quantite`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="flex flex-col items-end justify-end gap-0.5 text-right">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {cents ? `${formatCents(cents.unit)} / vidéo` : "—"}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {cents ? formatCents(cents.total) : "—"}
                  </span>
                </div>
              </div>
              <FieldError
                id={`${uid}-qte-${index}-error`}
                message={ligneErrors?.quantite?.message}
              />
              <div className="flex items-start gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={`${uid}-brief-${index}`}>
                    Brief{" "}
                    <span className="font-normal text-muted-foreground">
                      (optionnel)
                    </span>
                  </Label>
                  <Textarea
                    id={`${uid}-brief-${index}`}
                    rows={2}
                    placeholder="Liens rushs, ambiance, références…"
                    {...form.register(`lignes.${index}.brief`)}
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    aria-label={`Retirer la ligne ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <fieldset className="flex flex-col gap-3 border-y py-4">
        <legend className="sr-only">Tes fichiers</legend>
        <p className="text-sm font-medium">
          Tes fichiers{" "}
          <span className="font-normal text-muted-foreground">(optionnel)</span>
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-lien`}>Lien SwissTransfer</Label>
            <Input
              id={`${uid}-lien`}
              type="url"
              inputMode="url"
              placeholder="https://www.swisstransfer.com/d/…"
              autoComplete="off"
              aria-invalid={!!errors.lienSwisstransfer}
              aria-describedby={
                errors.lienSwisstransfer ? `${uid}-lien-error` : undefined
              }
              {...form.register("lienSwisstransfer")}
            />
            <FieldError
              id={`${uid}-lien-error`}
              message={errors.lienSwisstransfer?.message}
            />
            <p className="text-xs text-muted-foreground">
              Tes rushs, exports ou maquettes — colle le lien de partage.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-brief-pdf`}>Brief PDF</Label>
            <Input
              id={`${uid}-brief-pdf`}
              ref={briefInputRef}
              type="file"
              accept="application/pdf,.pdf"
              aria-invalid={!!briefError}
              aria-describedby={briefError ? `${uid}-brief-pdf-error` : undefined}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setBriefError(null);
                if (file && file.size > BRIEF_MAX_OCTETS) {
                  setBriefError("Le brief PDF dépasse 5 Mo.");
                  setBriefFile(null);
                  return;
                }
                setBriefFile(file);
              }}
            />
            <FieldError id={`${uid}-brief-pdf-error`} message={briefError ?? undefined} />
            {briefFile && !briefError && (
              <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{briefFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setBriefFile(null);
                    if (briefInputRef.current) briefInputRef.current.value = "";
                  }}
                >
                  Retirer
                </Button>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Un seul PDF, 5 Mo max — cadrages, exemples, consignes.
            </p>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ type: "reel_simple", quantite: 1, brief: "" })}
        >
          <Plus aria-hidden data-icon="inline-start" />
          Ajouter une ligne
        </Button>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={`${uid}-tip`} className="text-muted-foreground">
              Tip{" "}
              <span className="font-normal">(optionnel)</span>
            </Label>
            <Input
              id={`${uid}-tip`}
              type="number"
              min={0}
              max={1000}
              step={1}
              placeholder="0"
              className="w-20 text-right tabular-nums"
              aria-invalid={!!errors.tipEuros}
              aria-describedby={errors.tipEuros ? `${uid}-tip-error` : undefined}
              {...form.register("tipEuros", {
                setValueAs: (v) =>
                  v === "" || v == null ? undefined : Number(v),
              })}
            />
            <span className="text-sm text-muted-foreground">€</span>
          </div>
          <FieldError id={`${uid}-tip-error`} message={errors.tipEuros?.message} />
          <p className="flex items-baseline gap-3 border-t-2 border-foreground pt-2">
            <span className="text-sm font-medium">Total TTC</span>
            <span className="text-base font-semibold tabular-nums">
              {formatCents(totalCents)}
            </span>
          </p>
        </div>
      </div>

      <FieldError message={errors.lignes?.root?.message ?? errors.lignes?.message} />
      <FieldError message={errors.root?.message} />

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ajout…" : "Ajouter à ce mois"}
        </Button>
      </div>
    </form>
  );
}
