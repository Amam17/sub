// components/admin/PlanRow.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";

export function PlanRow({ plan }: { plan: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(plan.status);
  const [price, setPrice] = useState(String(plan.price));
  const [saving, setSaving] = useState(false);

  async function save(updates: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-3">
      <div>
        <p className="font-medium text-text-primary">{plan.name}</p>
        <p className="text-xs text-text-secondary">
          Billed {plan.billing_period} · {plan.duration_days} days
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">{plan.currency}</span>
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => price !== String(plan.price) && save({ price: Number(price) })}
          type="number"
          className="w-24"
          disabled={saving}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            save({ status: e.target.value });
          }}
          disabled={saving}
          className="rounded-button border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary"
        >
          <option value="draft">draft</option>
          <option value="active">active</option>
          <option value="paused">paused</option>
          <option value="archived">archived</option>
        </select>
      </div>
    </div>
  );
}
