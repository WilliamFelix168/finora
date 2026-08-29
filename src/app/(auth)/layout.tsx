import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Finora</span>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track income, expenses, and budgets.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
