import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandeForm } from "@/components/portail/commande-form";

// RTL normalise le texte DOM (l'insécable de NBSP_EURO devient une espace
// simple) mais PAS les matchers : on matche donc la forme normalisée.
const EURO = (montant: string) => `${montant} €`;

describe("CommandeForm", () => {
  it("calcule le prix en direct : 3 reels simples + 1 longue = 154,00 €", async () => {
    render(<CommandeForm onSubmit={vi.fn()} />);

    const ligne1 = screen.getAllByRole("group")[0];
    await userEvent.selectOptions(
      within(ligne1).getByLabelText(/prestation/i),
      "reel_simple",
    );
    const qte1 = within(ligne1).getByLabelText(/quantité/i);
    await userEvent.clear(qte1);
    await userEvent.type(qte1, "3");
    expect(within(ligne1).getByText(EURO("84,00"))).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /ajouter une ligne/i }),
    );
    const ligne2 = screen.getAllByRole("group")[1];
    await userEvent.selectOptions(
      within(ligne2).getByLabelText(/prestation/i),
      "video_longue",
    );

    expect(screen.getByText(/total ttc/i).parentElement).toHaveTextContent(
      EURO("154,00"),
    );
  });

  it("bloque une quantité hors bornes", async () => {
    const onSubmit = vi.fn();
    render(<CommandeForm onSubmit={onSubmit} />);
    const qte = screen.getByLabelText(/quantité/i);
    await userEvent.clear(qte);
    await userEvent.type(qte, "0");
    await userEvent.click(screen.getByRole("button", { name: /commander/i }));
    expect(await screen.findByText(/quantité minimale/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("soumet les lignes SANS prix et affiche la confirmation", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { numero: 7 } });
    render(<CommandeForm onSubmit={onSubmit} />);

    const ligne = screen.getAllByRole("group")[0];
    const qte = within(ligne).getByLabelText(/quantité/i);
    await userEvent.clear(qte);
    await userEvent.type(qte, "3");
    await userEvent.type(
      within(ligne).getByLabelText(/brief/i),
      "3 reels événement",
    );
    await userEvent.click(screen.getByRole("button", { name: /commander/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as {
      lignes: Array<Record<string, unknown>>;
    };
    expect(payload.lignes).toEqual([
      { type: "reel_simple", quantite: 3, brief: "3 reels événement" },
    ]);
    expect(JSON.stringify(payload)).not.toMatch(/prix|total/i);

    expect(
      await screen.findByText(/commande #7 reçue/i),
    ).toBeInTheDocument();
  });

  it("affiche l'erreur serveur", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "Une erreur est survenue." });
    render(<CommandeForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /commander/i }));
    expect(
      await screen.findByText(/une erreur est survenue/i),
    ).toBeInTheDocument();
  });
});
