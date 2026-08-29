"use server";

import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { transactionSchema } from "@/lib/validation";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyBalanceDelta, type TransactionEffect } from "./balance";

export type TransactionFormState = { error?: string };

class OwnershipError extends Error {}

function parseTransactionForm(formData: FormData) {
  return transactionSchema.safeParse({
    accountId: formData.get("accountId"),
    transferAccountId: formData.get("transferAccountId") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    type: formData.get("type"),
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    note: formData.get("note") || undefined,
  });
}

/** Confirms accountId/transferAccountId/categoryId belong to the caller before trusting them. */
async function assertOwnedRefs(
  userId: string,
  refs: { accountId: string; transferAccountId?: string; categoryId?: string },
) {
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, refs.accountId), eq(accounts.userId, userId)));
  if (!account) throw new OwnershipError("Selected account is invalid.");

  if (refs.transferAccountId) {
    const [transferAccount] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, refs.transferAccountId), eq(accounts.userId, userId)));
    if (!transferAccount) throw new OwnershipError("Selected destination account is invalid.");
  }

  if (refs.categoryId) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, refs.categoryId), eq(categories.userId, userId)));
    if (!category) throw new OwnershipError("Selected category is invalid.");
  }
}

export async function createTransaction(
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const user = await requireUser();
  const parsed = parseTransactionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  try {
    await db.transaction(async (tx) => {
      await assertOwnedRefs(user.id, data);

      const effect: TransactionEffect = {
        accountId: data.accountId,
        transferAccountId: data.transferAccountId || null,
        type: data.type,
        amount: data.amount,
      };

      await tx.insert(transactions).values({
        userId: user.id,
        accountId: data.accountId,
        transferAccountId: data.transferAccountId || null,
        categoryId: data.type === "transfer" ? null : data.categoryId || null,
        type: data.type,
        amount: data.amount,
        occurredOn: data.occurredOn,
        note: data.note || null,
      });

      await applyBalanceDelta(tx, effect, 1);
    });
  } catch (error) {
    if (error instanceof OwnershipError) return { error: error.message };
    throw error;
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function updateTransaction(
  transactionId: string,
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const user = await requireUser();
  const parsed = parseTransactionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)));
      if (!existing) throw new OwnershipError("Transaction not found.");

      await assertOwnedRefs(user.id, data);

      await applyBalanceDelta(
        tx,
        {
          accountId: existing.accountId,
          transferAccountId: existing.transferAccountId,
          type: existing.type,
          amount: existing.amount,
        },
        -1,
      );

      const newEffect: TransactionEffect = {
        accountId: data.accountId,
        transferAccountId: data.transferAccountId || null,
        type: data.type,
        amount: data.amount,
      };
      await applyBalanceDelta(tx, newEffect, 1);

      await tx
        .update(transactions)
        .set({
          accountId: data.accountId,
          transferAccountId: data.transferAccountId || null,
          categoryId: data.type === "transfer" ? null : data.categoryId || null,
          type: data.type,
          amount: data.amount,
          occurredOn: data.occurredOn,
          note: data.note || null,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, transactionId));
    });
  } catch (error) {
    if (error instanceof OwnershipError) return { error: error.message };
    throw error;
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function deleteTransaction(transactionId: string) {
  const user = await requireUser();

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)));
    if (!existing) return;

    await applyBalanceDelta(
      tx,
      {
        accountId: existing.accountId,
        transferAccountId: existing.transferAccountId,
        type: existing.type,
        amount: existing.amount,
      },
      -1,
    );

    await tx.delete(transactions).where(eq(transactions.id, transactionId));
  });

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
