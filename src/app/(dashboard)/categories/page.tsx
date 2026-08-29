import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { deleteCategory } from "./actions";

export default async function CategoriesPage() {
  const user = await requireUser();
  const userCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, user.id))
    .orderBy(asc(categories.kind), asc(categories.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Categories</h1>
        <Link href="/categories/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> New category
          </Button>
        </Link>
      </div>

      {userCategories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create income and expense categories to organize your transactions."
          action={
            <Link href="/categories/new">
              <Button size="sm">Add your first category</Button>
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {userCategories.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {category.name}
                </span>
                <Badge tone={category.kind === "income" ? "income" : "expense"}>
                  {category.kind}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={`/categories/${category.id}/edit`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <DeleteButton
                  action={deleteCategory.bind(null, category.id)}
                  confirmMessage={`Delete "${category.name}"? Transactions using it will lose their category.`}
                />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
