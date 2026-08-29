"use server";

import { createClient } from "@/lib/supabase/server";
import { authSchema, signUpSchema } from "@/lib/validation";
import { redirect } from "next/navigation";

export type AuthState = {
  error?: string;
  message?: string;
};

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: error.message };
  }

  const redirectTo = String(formData.get("redirectTo") || "/dashboard");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { message: "Check your inbox to confirm your email before signing in." };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
