// app/dashboard/support/page.tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export default async function CustomerSupportPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, updated_at")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Support</h1>
          <p className="mt-1 text-text-secondary">Your tickets and conversations with us.</p>
        </div>
        <Link
          href="/dashboard/support/new"
          className="rounded-button bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
        >
          New Ticket
        </Link>
      </div>

      {!tickets || tickets.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-text-secondary">
          No tickets yet — everything running smoothly?
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`}>
              <Card className="flex items-center justify-between p-4 transition-colors hover:border-brand-primary">
                <div>
                  <p className="font-medium text-text-primary">{ticket.subject}</p>
                  <p className="text-xs text-text-secondary">
                    {ticket.category} · Updated {new Date(ticket.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
                  {ticket.status.replace(/_/g, " ")}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
