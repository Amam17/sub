// app/dashboard/support/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const CATEGORIES = [
  { value: "payment", label: "Payment" },
  { value: "access", label: "Access" },
  { value: "renewal", label: "Renewal" },
  { value: "account", label: "Account" },
  { value: "technical", label: "Technical" },
  { value: "other", label: "Other" },
];

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: form.get("subject"),
        category: form.get("category"),
        message: form.get("message"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Couldn't create the ticket. Please try again.");
      return;
    }

    const data = await res.json();
    router.push(`/dashboard/support/${data.ticket.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-heading text-2xl font-bold text-text-primary">New Ticket</h1>
      <p className="mt-1 text-text-secondary">Tell us what's going on and we'll help you out.</p>

      <Card className="mt-6 p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Subject</label>
            <Input name="subject" required className="mt-1.5" />
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary">Category</label>
            <select
              name="category"
              required
              className="mt-1.5 w-full rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary">Message</label>
            <textarea
              name="message"
              required
              rows={5}
              className="mt-1.5 w-full rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit Ticket"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
