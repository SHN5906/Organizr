import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MissionForm, type ProjetOption } from "@/components/missions/mission-form";

const PROJETS: ProjetOption[] = [
  { id: "11111111-1111-4111-8111-111111111111", titre: "Site vitrine", clientNom: "ACME", type: "site_web" },
  { id: "22222222-2222-4222-8222-222222222222", titre: "Aftermovie", clientNom: "Zénith", type: "montage_video" },
];

describe("MissionForm (création)", () => {
  it("présélectionne le projet fourni et autofocus le titre", () => {
    render(<MissionForm projets={PROJETS} defaultProjetId={PROJETS[1].id} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/projet/i)).toHaveValue(PROJETS[1].id);
    expect(screen.getByLabelText(/titre/i)).toHaveFocus();
  });

  it("bloque la soumission sans titre et affiche l'erreur", async () => {
    const onSubmit = vi.fn();
    render(<MissionForm projets={PROJETS} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /ajouter/i }));
    expect(await screen.findByText(/champ requis/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("soumet titre + projet et signale le succès", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    const onSuccess = vi.fn();
    render(<MissionForm projets={PROJETS} onSubmit={onSubmit} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/titre/i), "Derush interview");
    await userEvent.selectOptions(screen.getByLabelText(/projet/i), PROJETS[0].id);
    await userEvent.click(screen.getByRole("button", { name: /ajouter/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      titre: "Derush interview",
      projetId: PROJETS[0].id,
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("affiche les fieldErrors retournées par le serveur", async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      ok: false,
      error: "Saisie invalide",
      fieldErrors: { titre: ["Trop long pour un titre"] },
    });
    render(<MissionForm projets={PROJETS} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/titre/i), "X");
    await userEvent.click(screen.getByRole("button", { name: /ajouter/i }));
    expect(await screen.findByText(/trop long pour un titre/i)).toBeInTheDocument();
  });

  it("désactive le bouton pendant la soumission", async () => {
    let resolve!: (v: { ok: true }) => void;
    const onSubmit = vi.fn().mockImplementation(() => new Promise((r) => (resolve = r)));
    render(<MissionForm projets={PROJETS} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/titre/i), "Mix");
    await userEvent.click(screen.getByRole("button", { name: /ajouter/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /ajout/i })).toBeDisabled(),
    );
    resolve({ ok: true });
  });
});

describe("MissionForm (édition)", () => {
  it("expose le statut et pré-remplit les champs", async () => {
    render(
      <MissionForm
        projets={PROJETS}
        mode="edit"
        submitLabel="Enregistrer"
        defaultValues={{
          projetId: PROJETS[1].id,
          titre: "Montage v1",
          statut: "en_revue",
          datePlanifiee: "2026-06-18",
          deadline: null,
          notes: "retours client",
        }}
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );
    expect(screen.getByLabelText(/titre/i)).toHaveValue("Montage v1");
    expect(screen.getByLabelText(/statut/i)).toHaveValue("en_revue");
    expect(screen.getByLabelText(/notes/i)).toHaveValue("retours client");
    expect(screen.getByRole("button", { name: /enregistrer/i })).toBeInTheDocument();
  });

  it("le statut n'apparaît pas en création", () => {
    render(<MissionForm projets={PROJETS} onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/statut/i)).not.toBeInTheDocument();
  });
});
