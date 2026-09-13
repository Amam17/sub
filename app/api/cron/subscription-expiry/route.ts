// app/api/cron/subscription-expiry/route.ts
//
// Scheduled job — run once daily (or hourly for finer-grained
// reminders). Two responsibilities:
//   1. Send reminders at 7/3/1/0 days before expiry (once each).
//   2. Mark subscriptions past expires_at as expired, releasing
//      their pool capacity via cancelSubscription().

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cancelSubscription } from "@/lib/pools";
import { notify } from "@/lib/notifications";

const REMINDER_MILESTONES = [7, 3, 1, 0];

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const client = getServiceClient();
  const now = new Date();
  let remindersSent = 0;
  let subscriptionsExpired = 0;

  // --- 1. Reminders ---
  const { data: activeSubs } = await client
    .from("subscriptions")
    .select("id, user_id, service_id, expires_at, services(name)")
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lte("expires_at", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());

  for (const sub of activeSubs ?? []) {
    const expiresAt = new Date(sub.expires_at as string);
    const daysRemaining = Math.floor(
      (expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    const milestone = REMINDER_MILESTONES.find((m) => daysRemaining === m);
    if (milestone === undefined) continue;

    // Insert the dedup row first; unique constraint prevents double-sends
    // even if the job overlaps a previous run.
    const { error: insertError } = await client
      .from("subscription_expiry_reminders")
      .insert({ subscription_id: sub.id, days_before: milestone });

    if (insertError) {
      // Unique violation means it was already sent — skip silently.
      continue;
    }

    const serviceName = (sub as any).services?.name ?? "your service";
    const label = milestone === 0 ? "today" : `in ${milestone} day${milestone === 1 ? "" : "s"}`;

    await notify({
      userId: sub.user_id,
      category: "subscription_expiring",
      title: `${serviceName} expires ${label}`,
      message: `Your ${serviceName} access expires ${label}. Renew now to avoid losing access.`,
      sendEmail: true,
    });

    remindersSent += 1;
  }

  // --- 2. Expiry ---
  const { data: expiredSubs } = await client
    .from("subscriptions")
    .select("id, user_id, services(name)")
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", now.toISOString());

  for (const sub of expiredSubs ?? []) {
    await cancelSubscription(sub.id, "expired");

    const serviceName = (sub as any).services?.name ?? "your service";
    await notify({
      userId: sub.user_id,
      category: "subscription_expired",
      title: `${serviceName} access has expired`,
      message: `Your ${serviceName} subscription has expired. Renew to restore access.`,
      sendEmail: true,
    });

    subscriptionsExpired += 1;
  }

  return NextResponse.json({ remindersSent, subscriptionsExpired });
}
