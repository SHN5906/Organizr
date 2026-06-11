"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Bouton de déconnexion avec pending — à placer DANS un <form action={…}>. */
export function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      variant="ghost"
      size="icon"
      type="submit"
      disabled={pending}
      aria-label="Se déconnecter"
    >
      <LogOut aria-hidden className="size-4" />
    </Button>
  );
}
