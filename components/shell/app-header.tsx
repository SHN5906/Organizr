"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { LogoutButton } from "@/components/shell/logout-button";
import { NavLink } from "@/components/shell/nav-link";
import { useQuickAdd } from "@/components/missions/quick-add";
import { logoutOwnerAction } from "@/lib/actions/auth";

export function AppHeader() {
  const { openQuickAdd } = useQuickAdd();
  return (
    <header className="border-b print:hidden">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4 md:gap-6 md:px-8">
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold tracking-tight text-foreground"
        >
          Organizr
        </Link>
        {/* La nav défile sous ~620px ; les actions restent toujours visibles. */}
        <nav
          aria-label="Navigation principale"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <NavLink href="/">Calendrier</NavLink>
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/projets">Projets</NavLink>
          <NavLink href="/facturation">Facturation</NavLink>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <Button size="sm" onClick={openQuickAdd} aria-label="Nouvelle mission">
            <Plus aria-hidden data-icon="inline-start" />
            <span className="hidden sm:inline">Nouvelle mission</span>
            <Kbd aria-hidden inverse className="hidden sm:inline-block">
              n
            </Kbd>
          </Button>
          <form action={logoutOwnerAction}>
            <LogoutButton />
          </form>
        </div>
      </div>
    </header>
  );
}
