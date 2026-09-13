// components/support/OrderLookupForm.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface LookupResult {
  id: string;
  service: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  createdAt: string;
}

export function OrderLookupForm() {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/support/order-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: form.get("orderId"),
        email: form.get("email"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("We couldn't find an order matching those details.");
      return;
    }

    const data = await res.json();
    setResult(data.order);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <Input name="orderId" placeholder="Order ID" required className="min-w-[220px] flex-1" />
        <Input name="email" type="email" placeholder="Email on the order" required className="min-w-[220px] flex-1" />
        <Button type="submit" disabled={loading}>
          {loading ? "Looking up…" : "Look Up"}
        </Button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <Card className="mt-4 p-4">
          <p className="font-medium text-text-primary">{result.service}</p>
          <p className="mt-1 text-sm text-text-secondary">
            Payment: {result.paymentStatus} · Fulfilment: {result.fulfilmentStatus}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Placed {new Date(result.createdAt).toLocaleString()}
          </p>
        </Card>
      )}
    </div>
  );
}
