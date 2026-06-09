import {
  STATUTS,
  TYPES_PROJET,
  type Statut,
  type TypeProjet,
} from "@/lib/validation/labels";
import type { MissionSort } from "@/lib/data/missions";

export type SearchParams = Record<string, string | string[] | undefined>;

export type DashboardParams = {
  type?: TypeProjet;
  statut?: Statut;
  clientId?: string;
  sort: MissionSort;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Filtres du dashboard depuis l'URL : valeurs invalides ignorées. */
export function parseDashboardParams(sp: SearchParams): DashboardParams {
  const type = first(sp.type);
  const statut = first(sp.statut);
  const client = first(sp.client);
  const sort = first(sp.sort);

  const params: DashboardParams = {
    sort: sort === "deadline_desc" ? "deadline_desc" : "deadline_asc",
  };
  if (type && (TYPES_PROJET as readonly string[]).includes(type)) {
    params.type = type as TypeProjet;
  }
  if (statut && (STATUTS as readonly string[]).includes(statut)) {
    params.statut = statut as Statut;
  }
  if (client && UUID_RE.test(client)) {
    params.clientId = client;
  }
  return params;
}
