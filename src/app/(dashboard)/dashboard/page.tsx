import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendingTrendChart } from "@/components/charts/spending-trend-chart";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { currentPeriodMonth, formatCurrency, nextPeriodMonth } from "@/lib/format";
import { getProfile } from "@/lib/profile";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";

function buildTrendMonths(count: number) {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(currentPeriodMonth(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return months;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const currentMonth = currentPeriodMonth();
  const trendMonths = buildTrendMonths(6);
  const windowStart = trendMonths[0];

  const [profile, userAccounts, monthTotals, trendRows] = await Promise.all([
    getProfile(user.id),
    db.select({ balance: accounts.balance }).from(accounts).where(eq(accounts.userId, user.id)),
    db
      .select({
        type: transactions.type,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          inArray(transactions.type, ["income", "expense"]),
          gte(transactions.occurredOn, currentMonth),
          lt(transactions.occurredOn, nextPeriodMonth(currentMonth)),
        ),
      )
      .groupBy(transactions.type),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${transactions.occurredOn}), 'YYYY-MM-01')`,
        type: transactions.type,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          inArray(transactions.type, ["income", "expense"]),
          gte(transactions.occurredOn, windowStart),
        ),
      )
      .groupBy(sql`date_trunc('month', ${transactions.occurredOn})`, transactions.type),
  ]);

  const totalBalance = userAccounts.reduce((sum, a) => sum + a.balance, 0);
  const monthIncome = Number(monthTotals.find((t) => t.type === "income")?.total ?? 0);
  const monthExpense = Number(monthTotals.find((t) => t.type === "expense")?.total ?? 0);

  const trendData = trendMonths.map((month) => ({
    month: new Date(`${month}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    income: Number(trendRows.find((r) => r.month === month && r.type === "income")?.total ?? 0),
    expense: Number(trendRows.find((r) => r.month === month && r.type === "expense")?.total ?? 0),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total balance</CardTitle>
          </CardHeader>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(totalBalance, profile.currency)}
          </p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Income this month</CardTitle>
          </CardHeader>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(monthIncome, profile.currency)}
          </p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expenses this month</CardTitle>
          </CardHeader>
          <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
            {formatCurrency(monthExpense, profile.currency)}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending trend (last 6 months)</CardTitle>
        </CardHeader>
        <SpendingTrendChart data={trendData} currency={profile.currency} />
      </Card>
    </div>
  );
}
