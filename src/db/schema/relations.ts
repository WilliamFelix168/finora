import { relations } from "drizzle-orm";
import { accounts } from "./accounts";
import { budgets } from "./budgets";
import { categories } from "./categories";
import { profiles } from "./profiles";
import { transactions } from "./transactions";

export const profilesRelations = relations(profiles, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  owner: one(profiles, { fields: [accounts.userId], references: [profiles.id] }),
  transactions: many(transactions, { relationName: "accountTransactions" }),
  incomingTransfers: many(transactions, { relationName: "transferTransactions" }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  owner: one(profiles, { fields: [categories.userId], references: [profiles.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  owner: one(profiles, { fields: [transactions.userId], references: [profiles.id] }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
    relationName: "accountTransactions",
  }),
  transferAccount: one(accounts, {
    fields: [transactions.transferAccountId],
    references: [accounts.id],
    relationName: "transferTransactions",
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  owner: one(profiles, { fields: [budgets.userId], references: [profiles.id] }),
  category: one(categories, { fields: [budgets.categoryId], references: [categories.id] }),
}));
