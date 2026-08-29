"use server";

import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { accountSchema } from "@/lib/validation";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AccountFormState = { error?: string };

function parseAccountForm(formData: FormData) {
  return accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    balance: formData.get("balance"),
  });
}

export async function createAccount(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = parseAccountForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.insert(accounts).values({ userId: user.id, ...parsed.data });
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function updateAccount(
  accountId: string,
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = parseAccountForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [updated] = await db
    .update(accounts)
    .set(parsed.data)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)))
    .returning({ id: accounts.id });

  if (!updated) {
    return { error: "Account not found." };
  }

  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function deleteAccount(accountId: string) {
  const user = await requireUser();
  await db.delete(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)));
  revalidatePath("/accounts");
}
