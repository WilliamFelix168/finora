"use client";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input, Label, Select } from "@/components/ui/input";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { useActionState } from "react";
import type { AccountFormState } from "./actions";

type Account = { id: string; name: string; type: string; balance: number };

export function AccountForm({
  account,
  action,
}: {
  account?: Account;
  action: (prevState: AccountFormState, formData: FormData) => Promise<AccountFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={account?.name} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" name="type" defaultValue={account?.type ?? "cash"}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="balance">{account ? "Balance" : "Starting balance"}</Label>
          <Input
            id="balance"
            name="balance"
            type="number"
            step="0.01"
            min="0"
            defaultValue={account?.balance ?? 0}
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : account ? "Save changes" : "Add account"}
      </Button>
    </form>
  );
}
