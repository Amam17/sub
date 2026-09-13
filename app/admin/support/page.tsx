// app/admin/support/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function AdminSupportPage() {
  const client = getServiceClient();
  const { data: tickets } = await client
    .from("support_tickets")
    .select("id, subject, category, status, created_at, updated_at, profiles(full_name, email)")
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-text-primary">Support</h1>
      <p className="mt-1 text-text-secondary">Customer tickets, most recently active first.</p>

      <div className="mt-4 overflow-x-auto rounded-card border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-secondary text-xs uppercase text-text-secondary">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(tickets ?? []).map((ticket: any) => (
              <tr key={ticket.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/support/${ticket.id}`} className="font-medium text-brand-primary">
                    {ticket.profiles?.full_name}
                  </Link>
                  <p className="text-xs text-text-secondary">{ticket.profiles?.email}</p>
                </td>
                <td className="px-4 py-3 text-text-primary">{ticket.subject}</td>
                <td className="px-4 py-3 text-text-secondary">{ticket.category}</td>
                <td className="px-4 py-3">
                  <StatusChip status={ticket.status} />
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(ticket.updated_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!tickets || tickets.length === 0) && (
          <p className="p-8 text-center text-text-secondary">No tickets yet.</p>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const className: Record<string, string> = {
    open: "bg-brand-primary/10 text-brand-primary",
    in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    waiting_for_customer: "bg-surface-secondary text-text-secondary",
    resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    closed: "bg-surface-secondary text-text-secondary",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${className[status] ?? ""}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
