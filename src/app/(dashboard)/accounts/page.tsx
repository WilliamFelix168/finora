import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { getProfile } from "@/lib/profile";
import { desc, eq } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { deleteAccount } from "./actions";

export default async function AccountsPage() {
  const user = await requireUser();
  const [profile, userAccounts] = await Promise.all([
    getProfile(user.id),
    db.select().from(accounts).where(eq(accounts.userId, user.id)).orderBy(desc(accounts.createdAt)),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Accounts</h1>
        <Link href="/accounts/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> New account
          </Button>
        </Link>
      </div>

      {userAccounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add a cash, bank, or e-wallet account to start tracking transactions."
          action={
            <Link href="/accounts/new">
              <Button size="sm">Add your first account</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userAccounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle>{ACCOUNT_TYPES.find((t) => t.value === account.type)?.label}</CardTitle>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/accounts/${account.id}/edit`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <DeleteButton
                    action={deleteAccount.bind(null, account.id)}
                    confirmMessage={`Delete "${account.name}"? This also deletes its transactions.`}
                  />
                </div>
              </CardHeader>
              <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">{account.name}</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(account.balance, profile.currency)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
