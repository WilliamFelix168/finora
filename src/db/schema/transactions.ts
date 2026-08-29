import { sql } from "drizzle-orm";
import { date, index, numeric, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUid, authenticatedRole } from "drizzle-orm/supabase";
import { transactionType } from "./enums";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { profiles } from "./profiles";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** Destination account, only set when `type` is `transfer`. */
    transferAccountId: uuid("transfer_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    /** Required for income/expense, always null for transfers. */
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: transactionType("type").notNull(),
    /** Always stored positive; sign is derived from `type`. */
    amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
    occurredOn: date("occurred_on").notNull().defaultNow(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transactions_user_occurred_idx").on(table.userId, table.occurredOn),
    index("transactions_account_idx").on(table.accountId),
    index("transactions_category_idx").on(table.categoryId),
    pgPolicy("transactions_crud_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
