// app/api/cron/pool-health-check/route.ts
//
// Scheduled job — run every 15-30 minutes. Records a
// pool_health_checks row for every active/ready/provisioning
// pool. Provider connectivity checks are necessarily
// service-specific (a real check would call that provider's
// API for the pool's identity) — this gives you the framework
// and the checks this backend *can* verify generically
// (capacity consistency, expiry proximity, stale provisioning),
// with a clear extension point for provider-specific checks.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type HealthStatus = "healthy" | "warning" | "critical" | "offline" | "unknown";

function worseOf(a: HealthStatus, b: HealthStatus): HealthStatus {
  const rank: Record<HealthStatus, number> = {
    healthy: 0,
    unknown: 1,
    warning: 2,
    critical: 3,
    offline: 4,
  };
  return rank[a] >= rank[b] ? a : b;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const client = getServiceClient();
  const now = new Date();

  const { data: pools } = await client
    .from("pools")
    .select("id, status, total_capacity, used_capacity, reserved_capacity, expires_at, updated_at")
    .in("status", ["provisioning", "ready", "active", "full", "expiring"]);

  let checked = 0;

  for (const pool of pools ?? []) {
    let overall: HealthStatus = "healthy";
    const details: Record<string, string> = {};

    // Capacity consistency: reserved+used should never exceed total
    // (the DB constraint should prevent this, but a health check
    // should catch it too in case of a manual override).
    const capacityStatus =
      pool.used_capacity + pool.reserved_capacity > pool.total_capacity
        ? "inconsistent"
        : "consistent";
    if (capacityStatus === "inconsistent") {
      overall = worseOf(overall, "critical");
      details.capacity = "used + reserved exceeds total_capacity";
    }

    // Expiry proximity.
    let expiryStatus = "not_applicable";
    if (pool.expires_at) {
      const daysToExpiry =
        (new Date(pool.expires_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      if (daysToExpiry < 0) {
        expiryStatus = "expired";
        overall = worseOf(overall, "critical");
      } else if (daysToExpiry <= 3) {
        expiryStatus = "expiring_soon";
        overall = worseOf(overall, "warning");
      } else {
        expiryStatus = "ok";
      }
    }

    // Stale provisioning: a pool stuck in 'provisioning' for over
    // 24 hours likely needs operator attention.
    let entitlementStatus = "ok";
    if (pool.status === "provisioning") {
      const hoursSinceUpdate =
        (now.getTime() - new Date(pool.updated_at).getTime()) / (60 * 60 * 1000);
      if (hoursSinceUpdate > 24) {
        entitlementStatus = "stalled";
        overall = worseOf(overall, "warning");
      }
    }

    // Provider connectivity is intentionally left as "unknown" here —
    // wire in a per-provider check (via pool_identities) when a
    // service has a real API integration to call.
    const providerStatus = "unknown";

    await client.from("pool_health_checks").insert({
      pool_id: pool.id,
      health_status: overall,
      capacity_status: capacityStatus,
      entitlement_status: entitlementStatus,
      provider_status: providerStatus,
      expiry_status: expiryStatus,
      details,
    });

    if (overall !== pool.status) {
      await client.from("pools").update({ health_status: overall }).eq("id", pool.id);
    }

    if (overall === "critical") {
      await client.from("pool_events").insert({
        pool_id: pool.id,
        event_type: "health_critical",
        event_source: "system",
        status: "success",
        payload: details,
      });

      await client.from("admin_tasks").insert({
        task_type: "pool_health_critical",
        entity_type: "pool",
        entity_id: pool.id,
        title: "Pool health check reported critical status",
        instructions: JSON.stringify(details),
        status: "pending",
        priority: 1,
      });
    } else if (overall === "warning") {
      await client.from("pool_events").insert({
        pool_id: pool.id,
        event_type: "health_warning",
        event_source: "system",
        status: "success",
        payload: details,
      });
    }

    checked += 1;
  }

  return NextResponse.json({ checked });
}
