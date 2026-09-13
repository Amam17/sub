// app/api/subscriptions/[id]/renew/route.ts
//
// POST /api/subscriptions/:id/renew
//
// Same reserve-then-pay flow as /api/checkout, but tags the
// order as a renewal so the webhook extends the existing
// subscription instead of creating a new one. Tries to keep the
// customer in their current pool first (continuity), and only
// falls back to a different pool if their original one has no
// room — which is exactly what Continuity Lock is meant to guard
// against for eligible services.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reserveCapacity, findPoolAndReserve, releaseReservation, PoolEngineError } from "@/lib/pools";
import { getPaymentProvider } from "@/lib/payments";

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

  const { data: subscription, error: subError } = await service
    .from("subscriptions")
    .select("id, user_id, service_id, plan_id, pool_id, status")
    .eq("id", subscriptionId)
    .single();

  if (subError || !subscription) {
    return NextResponse.json({ error: "SUBSCRIPTION_NOT_FOUND" }, { status: 404 });
  }

  if (subscription.user_id !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!["active", "expiring", "expired"].includes(subscription.status)) {
    return NextResponse.json({ error: "SUBSCRIPTION_NOT_RENEWABLE" }, { status: 409 });
  }

  const { data: plan } = await service
    .from("plans")
    .select("id, price, currency, status")
    .eq("id", subscription.plan_id)
    .single();

  if (!plan || plan.status !== "active") {
    return NextResponse.json({ error: "PLAN_NOT_AVAILABLE" }, { status: 409 });
  }

  const { data: order, error: orderError } = await service
    .from("orders")
    .insert({
      user_id: user.id,
      service_id: subscription.service_id,
      plan_id: plan.id,
      price: plan.price,
      currency: plan.currency,
      payment_status: "pending_payment",
      fulfilment_status: "fulfilment_pending",
      order_type: "renewal",
      renewal_subscription_id: subscription.id,
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "ORDER_CREATION_FAILED" }, { status: 500 });
  }

  // Prefer the customer's current pool for continuity; fall back to
  // any eligible pool if it no longer has room.
  let reservation;
  try {
    if (subscription.pool_id) {
      try {
        reservation = await reserveCapacity({
          poolId: subscription.pool_id,
          userId: user.id,
          orderId: order.id,
        });
      } catch (err) {
        if (!(err instanceof PoolEngineError)) throw err;
        reservation = await findPoolAndReserve({
          serviceId: subscription.service_id,
          userId: user.id,
          orderId: order.id,
        });
      }
    } else {
      reservation = await findPoolAndReserve({
        serviceId: subscription.service_id,
        userId: user.id,
        orderId: order.id,
      });
    }
  } catch (err) {
    await service
      .from("orders")
      .update({ payment_status: "failed", fulfilment_status: "cancelled" })
      .eq("id", order.id);

    if (err instanceof PoolEngineError && err.code === "NO_CAPACITY_AVAILABLE") {
      return NextResponse.json(
        { error: "NO_CAPACITY_AVAILABLE", canWaitlist: true },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "RESERVATION_FAILED" }, { status: 500 });
  }

  const { data: userProfile } = await service
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  const provider = getPaymentProvider();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  try {
    const payment = await provider.initialize({
      orderId: order.id,
      amount: Math.round(Number(plan.price) * 100),
      currency: plan.currency,
      customerEmail: userProfile?.email ?? user.email ?? "",
      callbackUrl: `${appUrl}/checkout/callback?order=${order.id}`,
      metadata: { reservation_id: reservation.id, renewal: true },
    });

    await service.from("payments").insert({
      order_id: order.id,
      user_id: user.id,
      provider: provider.name,
      provider_reference: payment.providerReference,
      amount: plan.price,
      currency: plan.currency,
      status: "started",
    });

    return NextResponse.json({
      orderId: order.id,
      reservationId: reservation.id,
      authorizationUrl: payment.authorizationUrl,
      reservedUntil: reservation.expires_at,
    });
  } catch (err) {
    await releaseReservation(reservation.id, "released");
    await service.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
    return NextResponse.json({ error: "PAYMENT_INIT_FAILED" }, { status: 502 });
  }
}
