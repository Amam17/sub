// app/auth/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signUpSchema, signInSchema, validateBody } from "@/lib/validation/schemas";

export interface AuthActionState {
  error?: string;
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = validateBody(signUpSchema, {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error };
  }
  const { fullName, email, password } = parsed.data;

  const supabase = createServerSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/auth/verify-email");
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = validateBody(signInSchema, {
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error };
  }
  const { email, password } = parsed.data;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "That email and password don't match." };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
