import { NavLinks } from "@/components/layout/nav-links";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Finora</span>
            <div className="flex items-center gap-1 sm:hidden">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
          <NavLinks />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {profile.fullName ?? user.email}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
