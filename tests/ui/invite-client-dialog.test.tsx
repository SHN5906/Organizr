import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteClientDialog } from "@/components/projets/invite-client-dialog";

describe("InviteClientDialog", () => {
  it("génère un lien et l'affiche pour copie", async () => {
    const action = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        url: "http://localhost:3000/espace/connexion?token=abc123",
        expiresAt: "2026-06-24T00:00:00.000Z",
      },
    });
    render(
      <InviteClientDialog
        clientId="6f9619ff-8b86-4d01-b42d-00cf4fc964ff"
        clientNom="Client A"
        invitations={[]}
        action={action}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /inviter/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /générer un lien/i }),
    );

    const input = await screen.findByDisplayValue(/espace\/connexion\?token=/);
    expect(input).toBeInTheDocument();
    expect(action).toHaveBeenCalledWith({
      clientId: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
    });
    expect(screen.getByRole("button", { name: /copier/i })).toBeInTheDocument();
  });

  it("affiche l'erreur de l'action", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, error: "Boom" });
    render(
      <InviteClientDialog
        clientId="6f9619ff-8b86-4d01-b42d-00cf4fc964ff"
        clientNom="Client A"
        invitations={[]}
        action={action}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /inviter/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /générer un lien/i }),
    );
    expect(await screen.findByText("Boom")).toBeInTheDocument();
  });
});
