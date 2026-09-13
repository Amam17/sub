// components/dashboard/CancelButton.tsx
"use client";

import { useState } from "react";

export function CancelButton({ subscriptionId }: { subscriptionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, { method: "POST" });
      if (res.ok) setDone(true);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (done) {
    return <p className="text-xs text-text-secondary">Auto-renew turned off.</p>;
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-text-secondary">Stop auto-renew?</span>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="font-semibold text-red-600 dark:text-red-400"
        >
          {loading ? "…" : "Yes"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-text-secondary">
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
    >
      Manage
    </button>
  );
}
