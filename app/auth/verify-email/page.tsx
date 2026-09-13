// app/auth/verify-email/page.tsx
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function VerifyEmailPage() {
  return (
    <AuthLayout title="Check your email" subtitle="One more step before you can log in.">
      <p className="text-sm text-text-secondary">
        We&apos;ve sent a confirmation link to your email address. Click it to verify your
        account, then come back and log in.
      </p>
    </AuthLayout>
  );
}
