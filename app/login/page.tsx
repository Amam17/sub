// app/login/page.tsx
"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signInAction, type AuthActionState } from "@/app/auth/actions";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Input } from "@/components/ui/Input";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction] = useFormState(signInAction, initialState);

  return (
    <AuthLayout title="Log in" subtitle="Welcome back — access your services.">
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-text-primary">
            Email address
          </label>
          <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-text-primary">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-brand-primary">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1.5"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <SubmitButton>Log In</SubmitButton>
      </form>

      <div className="mt-5">
        <OAuthButtons next="/dashboard" />
      </div>

      <p className="mt-6 text-center text-sm text-text-secondary">
        New to SubShare?{" "}
        <Link href="/signup" className="font-medium text-brand-primary">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
