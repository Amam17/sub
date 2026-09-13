// components/admin/EditServiceForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const STATUSES = ["draft", "active", "paused", "unavailable", "archived"];

export function EditServiceForm({ service }: { service: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      status: form.get("status"),
      description: form.get("description"),
      continuity_lock_eligible: form.get("continuity_lock_eligible") === "on",
    };

    const res = await fetch(`/api/admin/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save changes.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-text-primary">Status</label>
        <select
          name="status"
          defaultValue={service.status}
          className="mt-1.5 w-full rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-text-primary">Description</label>
        <Input name="description" defaultValue={service.description ?? ""} className="mt-1.5" />
      </div>

      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          name="continuity_lock_eligible"
          defaultChecked={service.continuity_lock_eligible}
          className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
        />
        Continuity Lock eligible
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
