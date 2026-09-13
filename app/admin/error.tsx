// app/admin/error.tsx
"use client";

import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-10 text-center">
      <p className="font-medium text-text-primary">This section failed to load.</p>
      <p className="text-sm text-text-secondary">{error.message || "An unexpected error occurred."}</p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
