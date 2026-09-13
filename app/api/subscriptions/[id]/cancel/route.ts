// app/api/subscriptions/[id]/cancel/route.ts
//
// POST /api/subscriptions/:id/cancel
//
// Customer-initiated cancellation. Releases pool capacity
// immediately via cancelSubscription() — access is not revoked
// mid-cycle unless the service's renewal_rules require it; by
// default the customer keeps access through expires_at and the
// record is just marked so it won't renew or occupy a "renewable"
// slot going forward. Adjust here if a given service's terms
// require immediate revocation on cancel.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const client = getServiceClient();
  const subscriptionId = params.id;

  const { data: subscription, error } = await client
    .from("subscriptions")
    .select("id, user_id, status, services(name)")
    .eq("id", subscriptionId)
    .single();

  if (error || !subscription) {
    return NextResponse.json({ error: "SUBSCRIPTION_NOT_FOUND" }, { status: 404 });
  }

  if (subscription.user_id !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!["active", "expiring"].includes(subscription.status)) {
    return NextResponse.json({ error: "SUBSCRIPTION_NOT_CANCELLABLE" }, { status: 409 });
  }

  // Just turn off auto-renew and let it run out — simplest customer-
  // friendly default. Swap for cancelSubscription(id, 'cancelled')
  // here if immediate revocation is required for a given service.
  await client
    .from("subscriptions")
    .update({ auto_renew: false, updated_at: new Date().toISOString() })
    .eq("id", subscriptionId);

  const serviceName = (subscription as any).services?.name ?? "your subscription";

  await notify({
    userId: user.id,
    category: "subscription_expiring",
    title: `${serviceName} won't renew`,
    message: `We've turned off auto-renewal for ${serviceName}. Your access continues until the current period ends.`,
    sendEmail: true,
  });

  await client.from("audit_logs").insert({
    actor_id: user.id,
    action: "subscription_cancel_requested",
    target_type: "subscription",
    target_id: subscriptionId,
    new_value: { auto_renew: false },
  });

  return NextResponse.json({ status: "auto_renew_disabled" });
}
