import { Card } from "@/components/ui/card";
import { CategoryForm } from "../category-form";
import { createCategory } from "../actions";

export default function NewCategoryPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">New category</h1>
      <Card>
        <CategoryForm action={createCategory} />
      </Card>
    </div>
  );
}
