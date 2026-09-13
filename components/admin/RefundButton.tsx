// components/admin/RefundButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefundButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleRefund() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/payments/${paymentId}/refund`, { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Refund failed.");
      return;
    }

    setDone(true);
    setConfirming(false);
    router.refresh();
  }

  if (done) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400">Refunded</span>;
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <button onClick={handleRefund} disabled={loading} className="font-semibold text-red-600 dark:text-red-400">
          {loading ? "…" : "Confirm refund"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-text-secondary">
          Cancel
        </button>
        {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-xs font-medium text-text-secondary hover:text-text-primary">
      Refund
    </button>
  );
}
