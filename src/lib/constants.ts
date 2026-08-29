export const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "e_wallet", label: "E-Wallet" },
  { value: "other", label: "Other" },
] as const;

export const CATEGORY_KINDS = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const;

export const TRANSACTION_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
] as const;

export const CATEGORY_COLOR_PRESETS = [
  "#6366f1",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#0ea5e9",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
] as const;
