"use client";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { TRANSACTION_TYPES } from "@/lib/constants";
import { useActionState, useState } from "react";
import type { TransactionFormState } from "./actions";

type Option = { id: string; name: string };
type Category = Option & { kind: "income" | "expense" };

type Transaction = {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  type: "income" | "expense" | "transfer";
  amount: number;
  occurredOn: string;
  note: string | null;
};

export function TransactionForm({
  transaction,
  accounts,
  categories,
  action,
}: {
  transaction?: Transaction;
  accounts: Option[];
  categories: Category[];
  action: (prevState: TransactionFormState, formData: FormData) => Promise<TransactionFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState<Transaction["type"]>(transaction?.type ?? "expense");

  const relevantCategories = categories.filter((c) => c.kind === type);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="type">Type</Label>
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as Transaction["type"])}
        >
          {TRANSACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="accountId">{type === "transfer" ? "From account" : "Account"}</Label>
        <Select id="accountId" name="accountId" defaultValue={transaction?.accountId} required>
          <option value="" disabled>
            Select an account
          </option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </div>

      {type === "transfer" ? (
        <div>
          <Label htmlFor="transferAccountId">To account</Label>
          <Select
            id="transferAccountId"
            name="transferAccountId"
            defaultValue={transaction?.transferAccountId ?? ""}
            required
          >
            <option value="" disabled>
              Select an account
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select id="categoryId" name="categoryId" defaultValue={transaction?.categoryId ?? ""} required>
            <option value="" disabled>
              Select a category
            </option>
            {relevantCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={transaction?.amount}
            required
          />
        </div>
        <div>
          <Label htmlFor="occurredOn">Date</Label>
          <Input
            id="occurredOn"
            name="occurredOn"
            type="date"
            defaultValue={transaction?.occurredOn ?? new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" defaultValue={transaction?.note ?? ""} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : transaction ? "Save changes" : "Add transaction"}
      </Button>
    </form>
  );
}
