import { Card } from "@/components/ui/card";
import { AccountForm } from "../account-form";
import { createAccount } from "../actions";

export default function NewAccountPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">New account</h1>
      <Card>
        <AccountForm action={createAccount} />
      </Card>
    </div>
  );
}
