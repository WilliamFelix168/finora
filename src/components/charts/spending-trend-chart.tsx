"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { month: string; income: number; expense: number };

export function SpendingTrendChart({ data, currency }: { data: Point[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value: number) =>
            new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency }).format(
              value,
            )
          }
        />
        <Tooltip
          formatter={(value: number | string | ReadonlyArray<number | string> | undefined) =>
            new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value))
          }
        />
        <Legend />
        <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
