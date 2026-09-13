// app/auth/update-password/page.tsx
"use client";

import { useFormState } from "react-dom";
import { updatePasswordAction, type ResetActionState } from "@/app/auth/reset-actions";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/Input";

const initialState: ResetActionState = {};

export default function UpdatePasswordPage() {
  const [state, formAction] = useFormState(updatePasswordAction, initialState);

  return (
    <AuthLayout title="Choose a new password" subtitle="Make it at least 8 characters.">
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="text-sm font-medium text-text-primary">
            New password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1.5"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium text-text-primary">
            Confirm password
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1.5"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <SubmitButton>Update Password</SubmitButton>
      </form>
    </AuthLayout>
  );
}
