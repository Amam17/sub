// components/admin/CreatePlanForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CreatePlanForm({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        name: form.get("name"),
        price: Number(form.get("price")),
        currency: form.get("currency"),
        billing_period: form.get("billing_period"),
        duration_days: Number(form.get("duration_days")),
        status: form.get("status"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't create the plan.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="md" variant="secondary">
        + New Plan
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-card border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-text-primary">Plan name</label>
          <Input name="name" required placeholder="Monthly" className="mt-1.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary">Billing period</label>
          <Input name="billing_period" required placeholder="month" className="mt-1.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary">Price</label>
          <Input name="price" type="number" min={0} step="0.01" required className="mt-1.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary">Currency</label>
          <Input name="currency" defaultValue="NGN" maxLength={3} required className="mt-1.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary">Duration (days)</label>
          <Input name="duration_days" type="number" min={1} required defaultValue={30} className="mt-1.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary">Status</label>
          <select
            name="status"
            defaultValue="draft"
            className="mt-1.5 w-full rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Plan"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
