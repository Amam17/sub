// app/dashboard/page.tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function DashboardOverviewPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS scopes every query below to the logged-in user automatically —
  // no need to filter by user_id explicitly, but it doesn't hurt clarity.
  const [{ data: activeSubs }, { data: pendingOrders }, { data: expiringSubs }] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, status, expires_at, services(name)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("expires_at", { ascending: true })
        .limit(5),
      supabase
        .from("orders")
        .select("id, payment_status, services(name)")
        .eq("user_id", user!.id)
        .eq("payment_status", "pending_payment"),
      supabase
        .from("subscriptions")
        .select("id, expires_at, services(name)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .lte("expires_at", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

  const activeCount = activeSubs?.length ?? 0;
  const pendingCount = pendingOrders?.length ?? 0;
  const expiringCount = expiringSubs?.length ?? 0;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-text-primary">Overview</h1>
      <p className="mt-1 text-text-secondary">Here's what's happening with your services.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Active services" value={activeCount} href="/dashboard/services" />
        <SummaryCard label="Pending orders" value={pendingCount} href="/dashboard/services" />
        <SummaryCard
          label="Expiring soon"
          value={expiringCount}
          href="/dashboard/services"
          tone={expiringCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">Active Services</h2>
          <Link href="/dashboard/services" className="text-sm font-semibold text-brand-primary">
            View all →
          </Link>
        </div>

        {activeCount === 0 ? (
          <EmptyState
            title="No active services yet"
            description="Browse the marketplace and get instant access to a service."
            actionHref="/services"
            actionLabel="Browse Services"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {activeSubs!.map((sub: any) => (
              <Card key={sub.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-text-primary">{sub.services?.name}</p>
                  <p className="text-xs text-text-secondary">
                    Expires{" "}
                    {sub.expires_at
                      ? new Date(sub.expires_at).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                <StatusBadge status={sub.status} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "default" | "warning";
}) {
  return (
    <Link href={href}>
      <Card className="p-5 transition-colors hover:border-brand-primary">
        <p
          className={`font-heading text-3xl font-extrabold ${
            tone === "warning" && value > 0 ? "text-amber-500" : "text-text-primary"
          }`}
        >
          {value}
        </p>
        <p className="mt-1 text-sm text-text-secondary">{label}</p>
      </Card>
    </Link>
  );
}

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <Card className="mt-4 flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-medium text-text-primary">{title}</p>
      <p className="text-sm text-text-secondary">{description}</p>
      <Link
        href={actionHref}
        className="mt-3 rounded-button bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
      >
        {actionLabel}
      </Link>
    </Card>
  );
}
