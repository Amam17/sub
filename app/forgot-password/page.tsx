// app/forgot-password/page.tsx
"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { requestPasswordResetAction, type ResetActionState } from "@/app/auth/reset-actions";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/Input";

const initialState: ResetActionState = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(requestPasswordResetAction, initialState);

  if (state.success) {
    return (
      <AuthLayout title="Check your email" subtitle="If that account exists, a reset link is on its way.">
        <p className="text-sm text-text-secondary">
          Follow the link in the email to choose a new password. It may take a minute to
          arrive.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-primary">
          Back to log in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to reset it.">
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-text-primary">
            Email address
          </label>
          <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <SubmitButton>Send Reset Link</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-brand-primary">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
