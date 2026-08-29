"use server";

import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { budgetSchema } from "@/lib/validation";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BudgetFormState = { error?: string };

function parseBudgetForm(formData: FormData) {
  const month = String(formData.get("periodMonth") || "");
  return budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    periodMonth: month.length === 7 ? `${month}-01` : month,
  });
}

async function assertOwnedCategory(userId: string, categoryId: string) {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  return Boolean(category);
}

export async function createBudget(
  _prevState: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const user = await requireUser();
  const parsed = parseBudgetForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (!(await assertOwnedCategory(user.id, parsed.data.categoryId))) {
    return { error: "Selected category is invalid." };
  }

  try {
    await db.insert(budgets).values({ userId: user.id, ...parsed.data });
  } catch {
    return { error: "A budget for this category and month already exists." };
  }

  revalidatePath("/budgets");
  redirect("/budgets");
}

export async function updateBudget(
  budgetId: string,
  _prevState: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const user = await requireUser();
  const parsed = parseBudgetForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (!(await assertOwnedCategory(user.id, parsed.data.categoryId))) {
    return { error: "Selected category is invalid." };
  }

  try {
    const [updated] = await db
      .update(budgets)
      .set(parsed.data)
      .where(and(eq(budgets.id, budgetId), eq(budgets.userId, user.id)))
      .returning({ id: budgets.id });
    if (!updated) return { error: "Budget not found." };
  } catch {
    return { error: "A budget for this category and month already exists." };
  }

  revalidatePath("/budgets");
  redirect("/budgets");
}

export async function deleteBudget(budgetId: string) {
  const user = await requireUser();
  await db.delete(budgets).where(and(eq(budgets.id, budgetId), eq(budgets.userId, user.id)));
  revalidatePath("/budgets");
}
