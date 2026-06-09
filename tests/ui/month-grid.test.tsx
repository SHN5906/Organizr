import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthGrid } from "@/components/calendar/month-grid";
import { buildMonthGrid } from "@/lib/calendar";
import type { CalendarItem } from "@/lib/data/missions";

const TODAY = new Date(2026, 5, 9);
const GRID = buildMonthGrid(new Date(2026, 5, 1), TODAY);

function item(
  kind: CalendarItem["kind"],
  date: string,
  titre: string,
): CalendarItem {
  return {
    kind,
    date,
    titre,
    projetId: "p1",
    statut: "en_cours",
    clientNom: "ACME",
    projetTitre: "Refonte site",
    ...(kind !== "deadline_projet" ? { missionId: "m1" } : {}),
  };
}

const ITEMS: Record<string, CalendarItem[]> = {
  "2026-06-09": [item("mission_planifiee", "2026-06-09", "Derush rushes")],
  "2026-06-12": [item("deadline_mission", "2026-06-12", "Export final")],
  "2026-06-30": [item("deadline_projet", "2026-06-30", "Refonte site")],
  "2026-06-15": [
    item("mission_planifiee", "2026-06-15", "A"),
    item("mission_planifiee", "2026-06-15", "B"),
    item("mission_planifiee", "2026-06-15", "C"),
    item("mission_planifiee", "2026-06-15", "D"),
  ],
};

function renderGrid() {
  return render(<MonthGrid grid={GRID} itemsByDay={ITEMS} />);
}

function cell(date: string) {
  const el = document.querySelector(`[data-date="${date}"]`);
  expect(el).not.toBeNull();
  return el as HTMLElement;
}

describe("MonthGrid", () => {
  it("rend chaque jour avec data-date (contrat e2e)", () => {
    renderGrid();
    expect(document.querySelectorAll("[data-date]")).toHaveLength(35);
  });

  it("mission planifiée : marqueur plein au bon jour", () => {
    renderGrid();
    const c = cell("2026-06-09");
    expect(within(c).getByText("Derush rushes")).toBeInTheDocument();
    expect(c.querySelector("[data-kind='mission_planifiee']")).not.toBeNull();
  });

  it("deadline mission et deadline projet : marqueurs creux aux bons jours", () => {
    renderGrid();
    const dm = cell("2026-06-12");
    expect(within(dm).getByText("Export final")).toBeInTheDocument();
    expect(dm.querySelector("[data-kind='deadline_mission']")).not.toBeNull();

    const dp = cell("2026-06-30");
    expect(within(dp).getByText("Refonte site")).toBeInTheDocument();
    expect(dp.querySelector("[data-kind='deadline_projet']")).not.toBeNull();
  });

  it("tronque à 3 items avec un compteur +N", () => {
    renderGrid();
    const c = cell("2026-06-15");
    expect(within(c).getByText("+1")).toBeInTheDocument();
    expect(within(c).queryByText("D")).not.toBeInTheDocument();
  });

  it("un jour avec items est activable et ouvre le détail du jour", async () => {
    renderGrid();
    const button = within(cell("2026-06-09")).getByRole("button");
    await userEvent.click(button);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Derush rushes")).toBeInTheDocument();
    expect(within(dialog).getByText(/refonte site · acme/i)).toBeInTheDocument();
  });

  it("un jour sans item n'est pas activable", () => {
    renderGrid();
    expect(within(cell("2026-06-10")).queryByRole("button")).toBeNull();
  });

  it("annonce le nombre de missions dans l'aria-label du jour", () => {
    renderGrid();
    const button = within(cell("2026-06-15")).getByRole("button");
    expect(button).toHaveAccessibleName(/15 juin/i);
    expect(button).toHaveAccessibleName(/4/);
  });
});
