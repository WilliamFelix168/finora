import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Not found</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        This item doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href="/dashboard">
        <Button size="sm" variant="secondary">
          Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
