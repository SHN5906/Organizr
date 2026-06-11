"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { DashboardParams } from "@/lib/search-params";
import {
  STATUT_LABELS,
  STATUTS,
  TYPE_LABELS,
  TYPES_PROJET,
} from "@/lib/validation/labels";

type ClientOption = { id: string; nom: string };

export function MissionFilters({
  params,
  clients,
}: {
  params: DashboardParams;
  clients: ClientOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  // Optimiste : les selects contrôlés par l'URL re-snapperaient sur
  // l'ancienne valeur pendant la navigation serveur (pénible au clavier,
  // où chaque flèche déclenche un change).
  const [optimistic, setOptimistic] = React.useOptimistic(params);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      setOptimistic({
        ...optimistic,
        type: key === "type" ? (value as DashboardParams["type"]) || undefined : optimistic.type,
        statut: key === "statut" ? (value as DashboardParams["statut"]) || undefined : optimistic.statut,
        clientId: key === "client" ? value || undefined : optimistic.clientId,
        sort: key === "sort" ? (value as DashboardParams["sort"]) : optimistic.sort,
      });
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  const sortAsc = optimistic.sort === "deadline_asc";

  return (
    // data-pending : la liste (sibling) s'atténue pendant la navigation
    // serveur — voir le group-has-[]: posé par la page.
    <div
      data-pending={isPending || undefined}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="filtre-type" className="text-xs text-muted-foreground">
          Type
        </Label>
        <NativeSelect
          id="filtre-type"
          className="w-40"
          value={optimistic.type ?? ""}
          onChange={(e) => setParam("type", e.target.value)}
        >
          <option value="">Tous</option>
          {TYPES_PROJET.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="filtre-statut"
          className="text-xs text-muted-foreground"
        >
          Statut
        </Label>
        <NativeSelect
          id="filtre-statut"
          className="w-36"
          value={optimistic.statut ?? ""}
          onChange={(e) => setParam("statut", e.target.value)}
        >
          <option value="">Tous</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="filtre-client"
          className="text-xs text-muted-foreground"
        >
          Client
        </Label>
        <NativeSelect
          id="filtre-client"
          className="w-44"
          value={optimistic.clientId ?? ""}
          onChange={(e) => setParam("client", e.target.value)}
        >
          <option value="">Tous</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </NativeSelect>
      </div>

      <Button
        variant="outline"
        onClick={() =>
          setParam("sort", sortAsc ? "deadline_desc" : "deadline_asc")
        }
      >
        {sortAsc ? (
          <ArrowUpNarrowWide aria-hidden data-icon="inline-start" />
        ) : (
          <ArrowDownNarrowWide aria-hidden data-icon="inline-start" />
        )}
        Deadline {sortAsc ? "croissante" : "décroissante"}
      </Button>
    </div>
  );
}
