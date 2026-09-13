// components/marketing/CheckoutButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WaitlistButton } from "./WaitlistButton";

export function CheckoutButton({ planId, serviceId }: { planId: string; serviceId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noCapacity, setNoCapacity] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "NO_CAPACITY_AVAILABLE") {
          setNoCapacity(true);
        } else if (res.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        } else {
          setError("Couldn't start checkout. Please try again.");
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

  if (noCapacity) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-text-secondary">
          No spots available right now — we'll notify you the moment one opens up.
        </p>
        <WaitlistButton serviceId={serviceId} />
      </div>
    );
  }

  return (
    <div>
      <Button size="lg" className="w-full" onClick={handleCheckout} disabled={loading}>
        {loading ? "Starting checkout…" : "Get Access"}
      </Button>
      {error && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
