"use server";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CategoryFormState = { error?: string };

function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    color: formData.get("color"),
    icon: formData.get("icon"),
  });
}

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await requireUser();
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.insert(categories).values({ userId: user.id, ...parsed.data });
  } catch {
    return { error: "A category with this name and kind already exists." };
  }

  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategory(
  categoryId: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await requireUser();
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const [updated] = await db
      .update(categories)
      .set(parsed.data)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, user.id)))
      .returning({ id: categories.id });

    if (!updated) {
      return { error: "Category not found." };
    }
  } catch {
    return { error: "A category with this name and kind already exists." };
  }

  revalidatePath("/categories");
  redirect("/categories");
}

export async function deleteCategory(categoryId: string) {
  const user = await requireUser();
  await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, user.id)));
  revalidatePath("/categories");
}
