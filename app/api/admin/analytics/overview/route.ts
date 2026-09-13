// app/api/admin/analytics/overview/route.ts
//
// GET /api/admin/analytics/overview
//
// All figures are computed from real data — no placeholder or
// fabricated metrics, per the build spec's trust-metrics rule.

import { NextResponse } from "next/server";
import { requireRole, getServiceClient } from "@/lib/admin/auth";

export async function GET() {
  const auth = await requireRole(["support", "operator", "admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
    { data: poolCapacityRows },
    { data: conversionRows },
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
    client.from("pools").select("total_capacity, used_capacity, reserved_capacity"),
    client
      .from("analytics_events")
      .select("event_type")
      .in("event_type", ["CHECKOUT_STARTED", "PAYMENT_SUCCEEDED"]),
  ]);

  const totalRevenue = (revenueRows ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  const totalCapacity = (poolCapacityRows ?? []).reduce((s, p) => s + p.total_capacity, 0);
  const totalCommitted = (poolCapacityRows ?? []).reduce(
    (s, p) => s + p.used_capacity + p.reserved_capacity,
    0
  );
  const overallUtilization = totalCapacity > 0 ? (totalCommitted / totalCapacity) * 100 : 0;

  const checkoutsStarted = (conversionRows ?? []).filter(
    (e) => e.event_type === "CHECKOUT_STARTED"
  ).length;
  const paymentsSucceeded = (conversionRows ?? []).filter(
    (e) => e.event_type === "PAYMENT_SUCCEEDED"
  ).length;
  const conversionRate = checkoutsStarted > 0 ? (paymentsSucceeded / checkoutsStarted) * 100 : null;

  return NextResponse.json({
    activeCustomers: activeCustomers ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    pendingFulfilment: pendingFulfilment ?? 0,
    expiringSoon: expiringSoon ?? 0,
    failedPayments: failedPayments ?? 0,
    openSupportTickets: openTickets ?? 0,
    revenue: totalRevenue,
    activePools: activePools ?? 0,
    overallPoolUtilizationPercent: Math.round(overallUtilization * 100) / 100,
    checkoutConversionRatePercent:
      conversionRate !== null ? Math.round(conversionRate * 100) / 100 : null,
  });
}
