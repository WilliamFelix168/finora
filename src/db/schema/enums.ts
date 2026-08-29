import { pgEnum } from "drizzle-orm/pg-core";

export const accountType = pgEnum("account_type", [
  "cash",
  "bank",
  "e_wallet",
  "other",
]);

export const categoryKind = pgEnum("category_kind", ["income", "expense"]);

export const transactionType = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);
