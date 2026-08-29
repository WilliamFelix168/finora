import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CategoryForm } from "../../category-form";
import { updateCategory } from "../../actions";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);

  if (!category) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Edit category</h1>
      <Card>
        <CategoryForm category={category} action={updateCategory.bind(null, category.id)} />
      </Card>
    </div>
  );
}
