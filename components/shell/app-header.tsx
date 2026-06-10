"use client";

import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/shell/nav-link";
import { useQuickAdd } from "@/components/missions/quick-add";
import { logoutOwnerAction } from "@/lib/actions/auth";

export function AppHeader() {
  const { openQuickAdd } = useQuickAdd();
  return (
    <header className="border-b print:hidden">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-6 px-4 md:px-8">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          Organizr
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-1">
          <NavLink href="/">Calendrier</NavLink>
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/projets">Projets</NavLink>
          <NavLink href="/facturation">Facturation</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Button size="sm" onClick={openQuickAdd} aria-label="Nouvelle mission">
            <Plus aria-hidden data-icon="inline-start" />
            <span className="hidden sm:inline">Nouvelle mission</span>
            <kbd
              aria-hidden
              className="hidden rounded-sm border border-primary-foreground/40 px-1 font-sans text-[11px] leading-4 text-primary-foreground/80 sm:inline-block"
            >
              n
            </kbd>
          </Button>
          <form action={logoutOwnerAction}>
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              aria-label="Se déconnecter"
            >
              <LogOut aria-hidden className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
