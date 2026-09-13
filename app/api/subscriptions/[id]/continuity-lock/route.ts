// app/api/subscriptions/[id]/continuity-lock/route.ts
//
// POST /api/subscriptions/:id/continuity-lock
//
// Continuity Lock must never promise more than the underlying
// provider supports — eligibility is service-configured
// (services.continuity_lock_eligible), not assumed by default.

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

  const service = getServiceClient();
  const subscriptionId = params.id;

  const { data: subscription, error } = await service
    .from("subscriptions")
    .select("id, user_id, status, continuity_lock_status, services(name, continuity_lock_eligible)")
    .eq("id", subscriptionId)
    .single();

  if (error || !subscription) {
    return NextResponse.json({ error: "SUBSCRIPTION_NOT_FOUND" }, { status: 404 });
  }

  if (subscription.user_id !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const serviceRecord = (subscription as any).services;
  const serviceName = serviceRecord?.name ?? "This service";

  if (!serviceRecord?.continuity_lock_eligible) {
    return NextResponse.json(
      {
        eligible: false,
        reason: `${serviceName} does not support Continuity Lock.`,
      },
      { status: 200 }
    );
  }

  if (subscription.status !== "active") {
    return NextResponse.json(
      {
        eligible: false,
        reason: "Continuity Lock requires an active subscription.",
      },
      { status: 200 }
    );
  }

  if (subscription.continuity_lock_status === "active") {
    return NextResponse.json({ eligible: true, status: "already_active" });
  }

  await service
    .from("subscriptions")
    .update({ continuity_lock_status: "active", updated_at: new Date().toISOString() })
    .eq("id", subscriptionId);

  await notify({
    userId: user.id,
    category: "continuity_lock_updated",
    title: "Continuity Lock activated",
    message: `Continuity Lock is now active for ${serviceName}.`,
    sendEmail: false,
  });

  await service.from("audit_logs").insert({
    actor_id: user.id,
    action: "continuity_lock_activated",
    target_type: "subscription",
    target_id: subscriptionId,
    new_value: { continuity_lock_status: "active" },
  });

  return NextResponse.json({ eligible: true, status: "activated" });
}
