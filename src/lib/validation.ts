import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const signUpSchema = authSchema.extend({
  fullName: z.string().trim().min(1, "Name is required.").max(100),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  type: z.enum(["cash", "bank", "e_wallet", "other"]),
  balance: z.coerce
    .number({ error: "Enter a valid amount." })
    .min(0, "Starting balance cannot be negative."),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60),
  kind: z.enum(["income", "expense"]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #6366f1."),
  icon: z.string().trim().min(1).max(40),
});

export const transactionSchema = z
  .object({
    accountId: z.uuid("Select an account."),
    transferAccountId: z.uuid().optional().or(z.literal("")),
    categoryId: z.uuid().optional().or(z.literal("")),
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.coerce.number({ error: "Enter a valid amount." }).positive("Amount must be greater than zero."),
    occurredOn: z.string().min(1, "Date is required."),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.type === "transfer" || Boolean(data.categoryId), {
    message: "Select a category.",
    path: ["categoryId"],
  })
  .refine((data) => data.type !== "transfer" || Boolean(data.transferAccountId), {
    message: "Select a destination account.",
    path: ["transferAccountId"],
  })
  .refine(
    (data) => data.type !== "transfer" || data.transferAccountId !== data.accountId,
    { message: "Destination account must differ from the source account.", path: ["transferAccountId"] },
  );

export const budgetSchema = z.object({
  categoryId: z.uuid("Select a category."),
  amount: z.coerce.number({ error: "Enter a valid amount." }).positive("Budget must be greater than zero."),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "Invalid period."),
});
