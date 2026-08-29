import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/db";
import { accounts, categories } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { createTransaction } from "../actions";
import { TransactionForm } from "../transaction-form";

export default async function NewTransactionPage() {
  const user = await requireUser();
  const [userAccounts, userCategories] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, user.id)).orderBy(asc(accounts.name)),
    db.select().from(categories).where(eq(categories.userId, user.id)).orderBy(asc(categories.name)),
  ]);

  if (userAccounts.length === 0) {
    return (
      <EmptyState
        title="Add an account first"
        description="You need at least one account before recording transactions."
        action={
          <Link href="/accounts/new" className="text-sm font-medium text-indigo-600 hover:underline">
            Create an account
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">New transaction</h1>
      <Card>
        <TransactionForm accounts={userAccounts} categories={userCategories} action={createTransaction} />
      </Card>
    </div>
  );
}
