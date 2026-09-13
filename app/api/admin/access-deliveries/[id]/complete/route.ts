// app/api/admin/access-deliveries/[id]/complete/route.ts
//
// POST /api/admin/access-deliveries/:id/complete
// Body: { accessReference?: string, notes?: string }
//
// Used for the manual_delivery fulfilment path: an operator has
// completed the provider-approved activation step by hand and
// marks it done here. Restricted to staff via RLS on admin_tasks/
// access_deliveries reads — this route additionally checks the
// caller's role explicitly since it performs a write.

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

  const { data: actorProfile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!actorProfile || !["operator", "admin", "super_admin"].includes(actorProfile.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const accessDeliveryId = params.id;

  const { data: delivery, error: deliveryError } = await service
    .from("access_deliveries")
    .select("id, subscription_id, user_id, status, delivery_type, subscriptions(service_id, services(name))")
    .eq("id", accessDeliveryId)
    .single();

  if (deliveryError || !delivery) {
    return NextResponse.json({ error: "ACCESS_DELIVERY_NOT_FOUND" }, { status: 404 });
  }

  if (delivery.status === "active") {
    return NextResponse.json({ status: "already_active" });
  }

  const now = new Date().toISOString();

  await service
    .from("access_deliveries")
    .update({
      status: "active",
      access_reference: body.accessReference ?? null,
      delivery_data: body.notes ? { notes: body.notes } : {},
      activated_at: now,
    })
    .eq("id", accessDeliveryId);

  await service
    .from("orders")
    .update({ fulfilment_status: "active" })
    .eq(
      "id",
      (
        await service
          .from("subscriptions")
          .select("order_id")
          .eq("id", delivery.subscription_id)
          .single()
      ).data?.order_id
    );

  // Close out the auto-created admin task for this delivery, if any.
  await service
    .from("admin_tasks")
    .update({ status: "completed", completed_at: now })
    .eq("entity_type", "access_delivery")
    .eq("entity_id", delivery.subscription_id)
    .eq("status", "pending");

  const serviceName = (delivery as any).subscriptions?.services?.name ?? "your service";

  await notify({
    userId: delivery.user_id,
    category: "access_ready",
    title: `${serviceName} access is ready`,
    message: `Your access to ${serviceName} has been activated. You can view it from your dashboard.`,
    sendEmail: true,
  });

  await service.from("audit_logs").insert({
    actor_id: user.id,
    action: "manual_fulfilment_completed",
    target_type: "access_delivery",
    target_id: accessDeliveryId,
    new_value: { status: "active" },
  });

  return NextResponse.json({ status: "completed" });
}
