// components/admin/PoolStatusSelect.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  "draft",
  "provisioning",
  "ready",
  "active",
  "full",
  "expiring",
  "expired",
  "paused",
  "closed",
];

export function PoolStatusSelect({ poolId, currentStatus }: { poolId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLoading(true);
    await fetch(`/api/admin/pools/${poolId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: e.target.value }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={handleChange}
      disabled={loading}
      className="rounded-button border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
