import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateBudget } from "../../actions";
import { BudgetForm } from "../../budget-form";

export default async function EditBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [budget, expenseCategories] = await Promise.all([
    db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, user.id)))
      .then((rows) => rows[0]),
    db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, user.id), eq(categories.kind, "expense")))
      .orderBy(asc(categories.name)),
  ]);

  if (!budget) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Edit budget</h1>
      <Card>
        <BudgetForm
          budget={budget}
          categories={expenseCategories}
          action={updateBudget.bind(null, budget.id)}
        />
      </Card>
    </div>
  );
}
