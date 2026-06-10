import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("envoie plusieurs liens SwissTransfer titrés et le brief PDF", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { numero: 4 } });
    render(<CommandeForm moisLabel="juin 2026" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: /ajouter un lien/i }));
    const lien1 = screen.getByRole("group", { name: "Lien 1" });
    await userEvent.type(
      within(lien1).getByLabelText(/titre du lien/i),
      "Rushs jour 1",
    );
    await userEvent.type(
      within(lien1).getByLabelText(/url/i),
      "https://www.swisstransfer.com/d/abc123",
    );

    await userEvent.click(screen.getByRole("button", { name: /ajouter un lien/i }));
    const lien2 = screen.getByRole("group", { name: "Lien 2" });
    await userEvent.type(
      within(lien2).getByLabelText(/url/i),
      "https://www.swisstransfer.com/d/def456",
    );

    const file = new File(["%PDF-1.4 fake"], "brief.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(screen.getByLabelText(/brief pdf/i), file);
    expect(screen.getByText(/brief\.pdf/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));
    const fd = onSubmit.mock.calls[0][0] as FormData;
    expect(JSON.parse(String(fd.get("payload")))).toMatchObject({
      liens: [
        { titre: "Rushs jour 1", url: "https://www.swisstransfer.com/d/abc123" },
        { titre: "", url: "https://www.swisstransfer.com/d/def456" },
      ],
    });
    expect((fd.get("brief") as File).name).toBe("brief.pdf");
  });

  it("bloque un lien non-https et permet de retirer un lien", async () => {
    const onSubmit = vi.fn();
    render(<CommandeForm moisLabel="juin 2026" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /ajouter un lien/i }));
    await userEvent.type(
      screen.getByLabelText(/url/i),
      "http://pas-https.com/x",
    );
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));
    expect(await screen.findByText(/https:\/\//)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: /retirer le lien 1/i }),
    );
    expect(screen.queryByLabelText(/url/i)).not.toBeInTheDocument();
  });

  it("borne le titre d'un lien à 100 caractères, avec erreur visible", async () => {
    const onSubmit = vi.fn();
    render(<CommandeForm moisLabel="juin 2026" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /ajouter un lien/i }));
    const titre = screen.getByLabelText(/titre du lien/i);
    // maxLength bloque la saisie clavier à 100 ; on force la valeur
    // (collage / DOM) pour vérifier le filet Zod et son message.
    expect(titre).toHaveAttribute("maxlength", "100");
    fireEvent.change(titre, { target: { value: "x".repeat(101) } });
    await userEvent.type(
      screen.getByLabelText(/url/i),
      "https://www.swisstransfer.com/d/abc",
    );
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));
    expect(await screen.findByText(/titre trop long/i)).toBeInTheDocument();
    expect(titre).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("plafonne à 10 liens : le bouton d'ajout se désactive", async () => {
    render(<CommandeForm moisLabel="juin 2026" onSubmit={vi.fn()} />);
    const ajouter = screen.getByRole("button", { name: /ajouter un lien/i });
    for (let i = 0; i < 10; i++) {
      await userEvent.click(ajouter);
    }
    expect(screen.getByRole("group", { name: "Lien 10" })).toBeInTheDocument();
    expect(ajouter).toBeDisabled();
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
