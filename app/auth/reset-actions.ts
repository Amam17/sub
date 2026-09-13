// app/auth/reset-actions.ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { validateBody } from "@/lib/validation/schemas";

export interface ResetActionState {
  error?: string;
  success?: boolean;
}

const requestResetSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function requestPasswordResetAction(
  _prevState: ResetActionState,
  formData: FormData
): Promise<ResetActionState> {
  const parsed = validateBody(requestResetSchema, { email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error };

  const supabase = createServerSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Always return success regardless of whether the email exists —
  // confirming or denying an account's existence here is an
  // enumeration risk.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/update-password`,
  });

  return { success: true };
}

export async function updatePasswordAction(
  _prevState: ResetActionState,
  formData: FormData
): Promise<ResetActionState> {
  const parsed = validateBody(updatePasswordSchema, {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error };

  const supabase = createServerSupabaseClient();

  // Requires an active recovery session, established by the
  // /auth/callback redirect from the reset email link.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "This reset link has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}
