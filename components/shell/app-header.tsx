"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/shell/nav-link";
import { useQuickAdd } from "@/components/missions/quick-add";

export function AppHeader() {
  const { openQuickAdd } = useQuickAdd();
  return (
    <header className="border-b">
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
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <kbd className="rounded-sm border px-1.5 py-0.5 font-sans text-[11px]">
              n
            </kbd>
            nouvelle mission
          </span>
          <Button size="sm" onClick={openQuickAdd}>
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle mission
          </Button>
        </div>
      </div>
    </header>
  );
}
