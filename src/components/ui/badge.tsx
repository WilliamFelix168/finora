import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

const TONE_CLASSES = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  income: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  expense: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
  transfer: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
} as const;

type BadgeProps = ComponentProps<"span"> & { tone?: keyof typeof TONE_CLASSES };

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
