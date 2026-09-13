// components/admin/CreateServiceForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const DELIVERY_TYPES = [
  "seat_invitation",
  "existing_account",
  "account_creation_link",
  "license_key",
  "voucher_code",
  "manual_delivery",
];

export function CreateServiceForm() {
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
      name: form.get("name"),
      slug: form.get("slug"),
      description: form.get("description"),
      access_delivery_type: form.get("access_delivery_type"),
    };

    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't create the service.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="md">
        + New Service
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-card border border-border bg-surface p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-text-primary">Name</label>
          <Input name="name" required className="mt-1.5" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary">Slug</label>
          <Input name="slug" required pattern="[a-z0-9-]+" className="mt-1.5" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-text-primary">Description</label>
        <Input name="description" className="mt-1.5" />
      </div>

      <div>
        <label className="text-sm font-medium text-text-primary">Access delivery type</label>
        <select
          name="access_delivery_type"
          required
          className="mt-1.5 w-full rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        >
          {DELIVERY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Service"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
