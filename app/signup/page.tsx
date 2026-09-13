// app/signup/page.tsx
"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signUpAction, type AuthActionState } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Input } from "@/components/ui/Input";

const initialState: AuthActionState = {};

export default function SignupPage() {
  const [state, formAction] = useFormState(signUpAction, initialState);

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It's free and takes less than a minute."
    >
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="text-sm font-medium text-text-primary">
            Full name
          </label>
          <Input id="fullName" name="fullName" type="text" autoComplete="name" required className="mt-1.5" />
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-text-primary">
            Email address
          </label>
          <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-text-primary">
            Password
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
          <p className="mt-1 text-xs text-text-secondary">At least 8 characters.</p>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <SubmitButton>Create Account →</SubmitButton>
      </form>

      <div className="mt-5">
        <OAuthButtons next="/dashboard" />
      </div>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-primary">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
