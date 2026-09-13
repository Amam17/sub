// components/dashboard/RenewButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RenewButton({ subscriptionId }: { subscriptionId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRenew() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/renew`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "NO_CAPACITY_AVAILABLE") {
          setError("No capacity available right now. You've been offered the waitlist.");
        } else {
          setError("Couldn't start renewal. Please try again.");
        }
        setLoading(false);
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" size="md" onClick={handleRenew} disabled={loading}>
        {loading ? "Starting…" : "Renew"}
      </Button>
      {error && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
