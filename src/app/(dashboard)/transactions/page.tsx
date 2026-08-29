import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { TRANSACTION_TYPES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { getProfile } from "@/lib/profile";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { ArrowLeftRight, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { deleteTransaction } from "./actions";

const AMOUNT_TONE = { income: "income", expense: "expense", transfer: "transfer" } as const;
const AMOUNT_SIGN = { income: "+", expense: "-", transfer: "" } as const;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const user = await requireUser();

  const conditions = [eq(transactions.userId, user.id)];
  if (filters.type) conditions.push(eq(transactions.type, filters.type as "income" | "expense" | "transfer"));
  if (filters.accountId) conditions.push(eq(transactions.accountId, filters.accountId));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.from) conditions.push(gte(transactions.occurredOn, filters.from));
  if (filters.to) conditions.push(lte(transactions.occurredOn, filters.to));

  const [profile, userAccounts, userCategories, rows] = await Promise.all([
    getProfile(user.id),
    db.select().from(accounts).where(eq(accounts.userId, user.id)).orderBy(asc(accounts.name)),
    db.select().from(categories).where(eq(categories.userId, user.id)).orderBy(asc(categories.name)),
    db.query.transactions.findMany({
      where: and(...conditions),
      with: { account: true, category: true, transferAccount: true },
      orderBy: [desc(transactions.occurredOn), desc(transactions.createdAt)],
      limit: 100,
    }),
  ]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Transactions</h1>
        <Link href="/transactions/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> New transaction
          </Button>
        </Link>
      </div>

      <Card>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select name="type" defaultValue={filters.type ?? ""}>
            <option value="">All types</option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select name="accountId" defaultValue={filters.accountId ?? ""}>
            <option value="">All accounts</option>
            {userAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select name="categoryId" defaultValue={filters.categoryId ?? ""}>
            <option value="">All categories</option>
            {userCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input type="date" name="from" defaultValue={filters.from ?? ""} />
          <Input type="date" name="to" defaultValue={filters.to ?? ""} />
          <div className="flex gap-2 lg:col-span-5">
            <Button type="submit" size="sm" variant="secondary">
              Apply filters
            </Button>
            {hasFilters && (
              <Link href="/transactions" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
                Clear
              </Link>
            )}
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No transactions match these filters" : "No transactions yet"}
          description={
            hasFilters
              ? "Try widening your filters."
              : "Record your first income or expense to see it here."
          }
          action={
            !hasFilters && (
              <Link href="/transactions/new">
                <Button size="sm">Add your first transaction</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {row.type === "transfer"
                      ? `${row.account.name} → ${row.transferAccount?.name ?? "—"}`
                      : (row.category?.name ?? "Uncategorized")}
                  </p>
                  <Badge tone={AMOUNT_TONE[row.type]}>{row.type}</Badge>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDate(row.occurredOn)} · {row.account.name}
                  {row.note ? ` · ${row.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    row.type === "income"
                      ? "font-semibold text-emerald-600 dark:text-emerald-400"
                      : row.type === "expense"
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : "font-semibold text-sky-600 dark:text-sky-400"
                  }
                >
                  {AMOUNT_SIGN[row.type]}
                  {formatCurrency(row.amount, profile.currency)}
                </span>
                {row.type === "transfer" && <ArrowLeftRight className="h-4 w-4 text-zinc-400" />}
                <Link
                  href={`/transactions/${row.id}/edit`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <DeleteButton
                  action={deleteTransaction.bind(null, row.id)}
                  confirmMessage="Delete this transaction? Account balances will be adjusted."
                />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
