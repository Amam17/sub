// app/api/checkout/route.ts
//
// POST /api/checkout
// Body: { planId: string }
//
// Flow: validate plan -> create pending order -> reserve pool
// capacity -> initialize payment -> return the checkout URL.
// If no capacity is available, the order is cancelled and the
// customer is pointed at the waitlist instead of being charged.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server"; // your session-aware client
import { createClient } from "@supabase/supabase-js";
import { findPoolAndReserve, releaseReservation, PoolEngineError } from "@/lib/pools";
import { getPaymentProvider } from "@/lib/payments";
import { trackEvent } from "@/lib/analytics";
import { checkoutSchema, validateBody } from "@/lib/validation/schemas";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(`checkout:${ip}`, 10, 60_000); // 10 checkout attempts per minute per IP
  if (!limit.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = validateBody(checkoutSchema, body);

  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }

  const { planId } = parsed.data;

  const service = getServiceClient();

  // 1. Load the plan and confirm it's purchasable.
  const { data: plan, error: planError } = await service
    .from("plans")
    .select("id, service_id, price, currency, duration_days, status")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
  }

  if (plan.status !== "active") {
    return NextResponse.json({ error: "PLAN_NOT_AVAILABLE" }, { status: 409 });
  }

  const { data: userProfile } = await service
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  // 2. Create the order in a pending state.
  const { data: order, error: orderError } = await service
    .from("orders")
    .insert({
      user_id: user.id,
      service_id: plan.service_id,
      plan_id: plan.id,
      price: plan.price,
      currency: plan.currency,
      payment_status: "pending_payment",
      fulfilment_status: "fulfilment_pending",
      expiry_date: null, // set on payment confirmation, once starts_at is known
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "ORDER_CREATION_FAILED" }, { status: 500 });
  }

  // 3. Reserve pool capacity for this order.
  let reservation;
  try {
    reservation = await findPoolAndReserve({
      serviceId: plan.service_id,
      userId: user.id,
      orderId: order.id,
      quantity: 1,
    });
  } catch (err) {
    // No capacity — cancel the order and point the customer at the waitlist
    // instead of leaving an orphaned pending order behind.
    await service
      .from("orders")
      .update({ payment_status: "failed", fulfilment_status: "cancelled" })
      .eq("id", order.id);

    if (err instanceof PoolEngineError && err.code === "NO_CAPACITY_AVAILABLE") {
      return NextResponse.json(
        { error: "NO_CAPACITY_AVAILABLE", canWaitlist: true, serviceId: plan.service_id },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "RESERVATION_FAILED" }, { status: 500 });
  }

  // 4. Initialize payment with the provider.
  await trackEvent({
    eventType: "CHECKOUT_STARTED",
    userId: user.id,
    serviceId: plan.service_id,
    planId: plan.id,
    metadata: { orderId: order.id },
  });

  const provider = getPaymentProvider();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  try {
    const payment = await provider.initialize({
      orderId: order.id,
      amount: Math.round(Number(plan.price) * 100), // smallest currency unit
      currency: plan.currency,
      customerEmail: userProfile?.email ?? user.email ?? "",
      callbackUrl: `${appUrl}/checkout/callback?order=${order.id}`,
      metadata: { reservation_id: reservation.id },
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
    // Payment init failed after capacity was reserved — release it
    // immediately rather than holding the slot for the full TTL.
    await releaseReservation(reservation.id, "released");
    await service
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id);

    return NextResponse.json({ error: "PAYMENT_INIT_FAILED" }, { status: 502 });
  }
}
