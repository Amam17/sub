// components/admin/CustomerStatusToggle.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CustomerStatusToggle({ customerId, status }: { customerId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status === "unverified") {
    return <span className="text-xs text-text-secondary">Awaiting verification</span>;
  }

  async function toggle() {
    setLoading(true);
    const nextStatus = status === "suspended" ? "active" : "suspended";
    await fetch(`/api/admin/customers/${customerId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-semibold ${
        status === "suspended"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {loading ? "…" : status === "suspended" ? "Restore" : "Suspend"}
    </button>
  );
}
