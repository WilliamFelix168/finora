"use client";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input, Label, Select } from "@/components/ui/input";
import { currentPeriodMonth } from "@/lib/format";
import { useActionState } from "react";
import type { BudgetFormState } from "./actions";

type Category = { id: string; name: string };
type Budget = { id: string; categoryId: string; amount: number; periodMonth: string };

export function BudgetForm({
  budget,
  categories,
  action,
}: {
  budget?: Budget;
  categories: Category[];
  action: (prevState: BudgetFormState, formData: FormData) => Promise<BudgetFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const defaultMonth = (budget?.periodMonth ?? currentPeriodMonth()).slice(0, 7);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select id="categoryId" name="categoryId" defaultValue={budget?.categoryId} required>
          <option value="" disabled>
            Select an expense category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Monthly budget</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={budget?.amount}
            required
          />
        </div>
        <div>
          <Label htmlFor="periodMonth">Month</Label>
          <Input id="periodMonth" name="periodMonth" type="month" defaultValue={defaultMonth} required />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : budget ? "Save changes" : "Add budget"}
      </Button>
    </form>
  );
}
