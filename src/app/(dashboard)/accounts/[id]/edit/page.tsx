import { Card } from "@/components/ui/card";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AccountForm } from "../../account-form";
import { updateAccount } from "../../actions";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
    .limit(1);

  if (!account) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Edit account</h1>
      <Card>
        <AccountForm account={account} action={updateAccount.bind(null, account.id)} />
      </Card>
    </div>
  );
}
