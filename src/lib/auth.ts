import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Verifies the caller has an active Supabase session. Every Server Action
 * and protected Server Component must call this directly — the `proxy.ts`
 * route matcher does not cover Server Function POSTs on excluded paths.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
