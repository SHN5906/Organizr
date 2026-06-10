import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OwnerLoginForm } from "@/components/auth/owner-login-form";

describe("OwnerLoginForm", () => {
  it("affiche l'erreur retournée par l'action", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "Mot de passe incorrect" });
    render(<OwnerLoginForm action={action} />);

    await userEvent.type(screen.getByLabelText(/mot de passe/i), "faux");
    await userEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(await screen.findByText(/mot de passe incorrect/i)).toBeInTheDocument();
    expect(action).toHaveBeenCalledWith({ password: "faux" });
  });

  it("le champ a le focus au rendu", () => {
    render(<OwnerLoginForm action={vi.fn()} />);
    expect(screen.getByLabelText(/mot de passe/i)).toHaveFocus();
  });
});
