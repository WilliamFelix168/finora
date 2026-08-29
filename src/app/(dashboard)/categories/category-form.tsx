"use client";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_PRESETS, CATEGORY_KINDS } from "@/lib/constants";
import { useActionState, useState } from "react";
import type { CategoryFormState } from "./actions";

type Category = { id: string; name: string; kind: string; color: string; icon: string };

export function CategoryForm({
  category,
  action,
}: {
  category?: Category;
  action: (prevState: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLOR_PRESETS[0]);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={category?.name} required />
      </div>
      <div>
        <Label htmlFor="kind">Kind</Label>
        <Select id="kind" name="kind" defaultValue={category?.kind ?? "expense"}>
          {CATEGORY_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="icon">Icon (lucide name)</Label>
        <Input id="icon" name="icon" defaultValue={category?.icon ?? "circle"} required />
      </div>
      <div>
        <Label>Color</Label>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              aria-label={`Choose color ${preset}`}
              style={{ backgroundColor: preset }}
              className={cn(
                "h-7 w-7 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-zinc-900",
                color === preset && "ring-2 ring-zinc-900 dark:ring-zinc-100",
              )}
            />
          ))}
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : category ? "Save changes" : "Add category"}
      </Button>
    </form>
  );
}
