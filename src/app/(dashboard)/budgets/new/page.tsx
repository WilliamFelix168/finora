import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { createBudget } from "../actions";
import { BudgetForm } from "../budget-form";

export default async function NewBudgetPage() {
  const user = await requireUser();
  const expenseCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, user.id), eq(categories.kind, "expense")))
    .orderBy(asc(categories.name));

  if (expenseCategories.length === 0) {
    return (
      <EmptyState
        title="Add an expense category first"
        description="Budgets are set per expense category."
        action={
          <Link href="/categories/new" className="text-sm font-medium text-indigo-600 hover:underline">
            Create a category
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">New budget</h1>
      <Card>
        <BudgetForm categories={expenseCategories} action={createBudget} />
      </Card>
    </div>
  );
}
