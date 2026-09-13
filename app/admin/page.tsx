// app/admin/page.tsx
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/Card";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getOverviewMetrics() {
  const client = getServiceClient();

  const [
    { count: activeCustomers },
    { count: activeSubscriptions },
    { count: pendingFulfilment },
    { count: expiringSoon },
    { count: failedPayments },
    { count: openTickets },
    { data: revenueRows },
    { count: activePools },
    { count: pendingAdminTasks },
  ] = await Promise.all([
    client.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
    client.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    client
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("fulfilment_status", "fulfilment_pending"),
    client
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lte("expires_at", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    client.from("payments").select("*", { count: "exact", head: true }).eq("status", "failed"),
    client
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting_for_customer"]),
    client.from("payments").select("amount").eq("status", "verified"),
    client.from("pools").select("*", { count: "exact", head: true }).eq("status", "active"),
    client.from("admin_tasks").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const revenue = (revenueRows ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    activeCustomers: activeCustomers ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    pendingFulfilment: pendingFulfilment ?? 0,
    expiringSoon: expiringSoon ?? 0,
    failedPayments: failedPayments ?? 0,
    openTickets: openTickets ?? 0,
    revenue,
    activePools: activePools ?? 0,
    pendingAdminTasks: pendingAdminTasks ?? 0,
  };
}

export default async function AdminOverviewPage() {
  const metrics = await getOverviewMetrics();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-text-primary">Overview</h1>
      <p className="mt-1 text-text-secondary">Real-time snapshot of the platform.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active customers" value={metrics.activeCustomers} />
        <MetricCard label="Active subscriptions" value={metrics.activeSubscriptions} />
        <MetricCard
          label="Revenue (verified)"
          value={formatCurrency(metrics.revenue)}
        />
        <MetricCard label="Active pools" value={metrics.activePools} />
        <MetricCard
          label="Pending fulfilment"
          value={metrics.pendingFulfilment}
          tone={metrics.pendingFulfilment > 0 ? "warning" : "default"}
          href="/admin/fulfilment"
        />
        <MetricCard
          label="Expiring within 7 days"
          value={metrics.expiringSoon}
          tone={metrics.expiringSoon > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Failed payments"
          value={metrics.failedPayments}
          tone={metrics.failedPayments > 0 ? "critical" : "default"}
        />
        <MetricCard
          label="Open support tickets"
          value={metrics.openTickets}
          href="/admin/support"
        />
        <MetricCard
          label="Pending admin tasks"
          value={metrics.pendingAdminTasks}
          tone={metrics.pendingAdminTasks > 0 ? "warning" : "default"}
          href="/admin/fulfilment"
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
  href,
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "critical";
  href?: string;
}) {
  const toneClass =
    tone === "critical"
      ? "text-red-600 dark:text-red-400"
      : tone === "warning"
      ? "text-amber-500"
      : "text-text-primary";

  const content = (
    <Card className="p-5">
      <p className={`font-heading text-2xl font-extrabold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{label}</p>
    </Card>
  );

  if (href) {
    return (
      <a href={href} className="block transition-opacity hover:opacity-80">
        {content}
      </a>
    );
  }
  return content;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
