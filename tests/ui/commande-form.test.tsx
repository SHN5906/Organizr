import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandeForm } from "@/components/portail/commande-form";

// RTL normalise le texte DOM (l'insécable de NBSP_EURO devient une espace
// simple) mais PAS les matchers : on matche donc la forme normalisée.
const EURO = (montant: string) => `${montant} €`;
const SUBMIT = /ajouter à ce mois/i;

describe("CommandeForm", () => {
  it("calcule le prix en direct : 3 reels simples + 1 longue = 154,00 €", async () => {
    render(<CommandeForm moisLabel="juin 2026" onSubmit={vi.fn()} />);

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

  it("le tip entre dans le total live et dans le payload", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { numero: 3 } });
    render(<CommandeForm moisLabel="juin 2026" onSubmit={onSubmit} />);

    const ligne = screen.getAllByRole("group")[0];
    await userEvent.selectOptions(
      within(ligne).getByLabelText(/prestation/i),
      "video_longue",
    );
    await userEvent.type(screen.getByLabelText(/tip/i), "6");
    expect(screen.getByText(/total ttc/i).parentElement).toHaveTextContent(
      EURO("76,00"), // 70 + 6
    );

    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const fd = onSubmit.mock.calls[0][0] as FormData;
    expect(JSON.parse(String(fd.get("payload")))).toMatchObject({
      tipEuros: 6,
    });
  });

  it("envoie le lien SwissTransfer et le brief PDF dans le FormData", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { numero: 4 } });
    render(<CommandeForm moisLabel="juin 2026" onSubmit={onSubmit} />);

    await userEvent.type(
      screen.getByLabelText(/lien swisstransfer/i),
      "https://www.swisstransfer.com/d/abc123",
    );
    const file = new File(["%PDF-1.4 fake"], "brief.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(screen.getByLabelText(/brief pdf/i), file);
    expect(screen.getByText(/brief\.pdf/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));
    const fd = onSubmit.mock.calls[0][0] as FormData;
    expect(JSON.parse(String(fd.get("payload")))).toMatchObject({
      lienSwisstransfer: "https://www.swisstransfer.com/d/abc123",
    });
    expect((fd.get("brief") as File).name).toBe("brief.pdf");
  });

  it("bloque une quantité hors bornes", async () => {
    const onSubmit = vi.fn();
    render(<CommandeForm moisLabel="juin 2026" onSubmit={onSubmit} />);
    const qte = screen.getByLabelText(/quantité/i);
    await userEvent.clear(qte);
    await userEvent.type(qte, "0");
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));
    expect(await screen.findByText(/quantité minimale/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("soumet les lignes SANS prix et confirme l'ajout au mois", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { numero: 7 } });
    render(<CommandeForm moisLabel="juin 2026" onSubmit={onSubmit} />);

    const ligne = screen.getAllByRole("group")[0];
    const qte = within(ligne).getByLabelText(/quantité/i);
    await userEvent.clear(qte);
    await userEvent.type(qte, "3");
    await userEvent.type(
      within(ligne).getByLabelText(/brief/i),
      "3 reels événement",
    );
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const fd = onSubmit.mock.calls[0][0] as FormData;
    const payload = JSON.parse(String(fd.get("payload"))) as {
      lignes: Array<Record<string, unknown>>;
    };
    expect(payload.lignes).toEqual([
      { type: "reel_simple", quantite: 3, brief: "3 reels événement" },
    ]);
    expect(String(fd.get("payload"))).not.toMatch(/prix|total/i);
    expect(fd.get("brief")).toBeNull();

    expect(
      await screen.findByText(/commande #7 ajoutée à juin 2026/i),
    ).toBeInTheDocument();
  });

  it("affiche l'erreur serveur", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "Une erreur est survenue." });
    render(<CommandeForm moisLabel="juin 2026" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));
    expect(
      await screen.findByText(/une erreur est survenue/i),
    ).toBeInTheDocument();
  });
});
