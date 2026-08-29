import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUid, authenticatedRole } from "drizzle-orm/supabase";
import { categoryKind } from "./enums";
import { profiles } from "./profiles";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKind("kind").notNull(),
    color: text("color").notNull().default("#6366f1"),
    icon: text("icon").notNull().default("circle"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_user_name_kind_key").on(table.userId, table.name, table.kind),
    pgPolicy("categories_crud_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
