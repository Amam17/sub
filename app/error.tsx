// app/error.tsx
"use client";

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Logo />
      <h1 className="font-heading text-xl font-bold text-text-primary">
        Something went wrong.
      </h1>
      <p className="max-w-sm text-sm text-text-secondary">
        We couldn't complete that action. Please try again — if it keeps happening, reach out to
        support.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <a
          href="/support"
          className="rounded-button border border-border px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
