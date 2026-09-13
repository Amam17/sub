// components/admin/CreatePoolForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CreatePoolForm({ defaultServiceId }: { defaultServiceId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      service_id: form.get("service_id"),
      total_capacity: Number(form.get("total_capacity")),
      status: form.get("status"),
    };

    const res = await fetch("/api/admin/pools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't create the pool.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="md">
        + New Pool
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-card border border-border bg-surface p-5">
      <div>
        <label className="text-sm font-medium text-text-primary">Service ID</label>
        <Input
          name="service_id"
          defaultValue={defaultServiceId}
          required
          className="mt-1.5"
          placeholder="uuid of the service"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-text-primary">Total capacity</label>
          <Input name="total_capacity" type="number" min={1} required className="mt-1.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary">Initial status</label>
          <select
            name="status"
            defaultValue="draft"
            className="mt-1.5 w-full rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
          >
            <option value="draft">draft</option>
            <option value="ready">ready</option>
            <option value="active">active</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Pool"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
