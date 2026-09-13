// app/dashboard/error.tsx
"use client";

import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-10 text-center">
      <p className="font-medium text-text-primary">We couldn't load this page.</p>
      <p className="text-sm text-text-secondary">Please try again in a moment.</p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
