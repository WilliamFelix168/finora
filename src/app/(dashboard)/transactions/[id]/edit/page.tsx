import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateTransaction } from "../../actions";
import { TransactionForm } from "../../transaction-form";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [transaction, userAccounts, userCategories] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .then((rows) => rows[0]),
    db.select().from(accounts).where(eq(accounts.userId, user.id)).orderBy(asc(accounts.name)),
    db.select().from(categories).where(eq(categories.userId, user.id)).orderBy(asc(categories.name)),
  ]);

  if (!transaction) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Edit transaction</h1>
      <Card>
        <TransactionForm
          transaction={transaction}
          accounts={userAccounts}
          categories={userCategories}
          action={updateTransaction.bind(null, transaction.id)}
        />
      </Card>
    </div>
  );
}
