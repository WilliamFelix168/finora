import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TransactionEffect = {
  accountId: string;
  transferAccountId: string | null;
  type: "income" | "expense" | "transfer";
  amount: number;
};

/**
 * Applies (direction = 1) or reverses (direction = -1) a transaction's
 * effect on account balances, using atomic SQL increments to avoid
 * read-modify-write races between concurrent mutations.
 */
export async function applyBalanceDelta(
  tx: DbTx,
  effect: TransactionEffect,
  direction: 1 | -1,
) {
  const delta = effect.amount * direction;

  if (effect.type === "income") {
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${delta}` })
      .where(eq(accounts.id, effect.accountId));
  } else if (effect.type === "expense") {
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${delta}` })
      .where(eq(accounts.id, effect.accountId));
  } else if (effect.type === "transfer" && effect.transferAccountId) {
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${delta}` })
      .where(eq(accounts.id, effect.accountId));
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${delta}` })
      .where(eq(accounts.id, effect.transferAccountId));
  }
}
