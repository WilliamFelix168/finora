import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { db } from "@/db";
import { budgets, transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { currentPeriodMonth, formatCurrency, nextPeriodMonth } from "@/lib/format";
import { getProfile } from "@/lib/profile";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { deleteBudget } from "./actions";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const user = await requireUser();
  const periodMonth = month ? `${month}-01` : currentPeriodMonth();

  const [profile, monthBudgets] = await Promise.all([
    getProfile(user.id),
    db.query.budgets.findMany({
      where: and(eq(budgets.userId, user.id), eq(budgets.periodMonth, periodMonth)),
      with: { category: true },
      orderBy: (b, { asc }) => asc(b.createdAt),
    }),
  ]);

  const spentRows =
    monthBudgets.length > 0
      ? await db
          .select({
            categoryId: transactions.categoryId,
            spent: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, user.id),
              eq(transactions.type, "expense"),
              gte(transactions.occurredOn, periodMonth),
              lt(transactions.occurredOn, nextPeriodMonth(periodMonth)),
            ),
          )
          .groupBy(transactions.categoryId)
      : [];

  const spentByCategory = new Map(spentRows.map((row) => [row.categoryId, Number(row.spent)]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Budgets</h1>
        <Link href="/budgets/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> New budget
          </Button>
        </Link>
      </div>

      <Card>
        <form className="flex items-end gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="month">
              Month
            </label>
            <Input id="month" type="month" name="month" defaultValue={periodMonth.slice(0, 7)} />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            View
          </Button>
        </form>
      </Card>

      {monthBudgets.length === 0 ? (
        <EmptyState
          title="No budgets for this month"
          description="Set a monthly spending target per category to track progress."
          action={
            <Link href="/budgets/new">
              <Button size="sm">Add your first budget</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {monthBudgets.map((budget) => {
            const spent = spentByCategory.get(budget.categoryId) ?? 0;
            const pct = Math.min(100, Math.round((spent / budget.amount) * 100));
            const over = spent > budget.amount;
            return (
              <Card key={budget.id}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {budget.category.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/budgets/${budget.id}/edit`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <DeleteButton
                      action={deleteBudget.bind(null, budget.id)}
                      confirmMessage={`Delete the budget for "${budget.category.name}"?`}
                    />
                  </div>
                </div>
                <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={cn("h-full rounded-full", over ? "bg-red-500" : "bg-indigo-600")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatCurrency(spent, profile.currency)} of {formatCurrency(budget.amount, profile.currency)}{" "}
                  {over && <span className="font-medium text-red-600 dark:text-red-400">· over budget</span>}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
