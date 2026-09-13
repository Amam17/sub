// app/api/webhooks/payment/route.ts
//
// POST /api/webhooks/payment
//
// Per the payment security rule: never mark an order paid from
// a frontend success message. This is the only place that does.
// Signature is verified before the payload is trusted, and
// complete_purchase() is idempotent so duplicate webhook
// deliveries are safe.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPaymentProvider } from "@/lib/payments";
import { completePurchase, renewSubscription } from "@/lib/pools";
import { notify } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const provider = getPaymentProvider();

  const signatureHeader = request.headers.get("x-paystack-signature");
  const { valid, providerReference } = provider.verifyWebhookSignature(
    rawBody,
    signatureHeader
  );

  if (!valid || !providerReference) {
    // Do not process anything from an unverified payload.
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  const service = getServiceClient();

  // Re-verify directly with the provider rather than trusting the
  // webhook body's status field alone — belt and suspenders.
  const verification = await provider.verify(providerReference);

  const { data: payment } = await service
    .from("payments")
    .select("id, order_id, status")
    .eq("provider", provider.name)
    .eq("provider_reference", providerReference)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "PAYMENT_RECORD_NOT_FOUND" }, { status: 404 });
  }

  // Idempotency: if this payment was already processed, stop here.
  if (payment.status === "verified") {
    return NextResponse.json({ status: "already_processed" });
  }

  if (verification.status === "failed") {
    await service
      .from("payments")
      .update({ status: "failed", raw_payload: verification.rawPayload })
      .eq("id", payment.id);

    await service
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", payment.order_id);

    await trackEvent({ eventType: "PAYMENT_FAILED", metadata: { orderId: payment.order_id } });

    return NextResponse.json({ status: "payment_failed" });
  }

  if (verification.status === "pending") {
    // Nothing to do yet — the provider will send another webhook,
    // or the client can poll /api/checkout/status.
    return NextResponse.json({ status: "pending" });
  }

  // verification.status === "verified"
  await service
    .from("payments")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      raw_payload: verification.rawPayload,
    })
    .eq("id", payment.id);

  const { data: reservation } = await service
    .from("capacity_reservations")
    .select("id")
    .eq("order_id", payment.order_id)
    .eq("status", "reserved")
    .single();

  if (!reservation) {
    // Reservation may have expired before payment cleared. Flag for
    // manual review rather than silently failing the customer.
    await service.from("admin_tasks").insert({
      task_type: "reservation_missing_on_payment",
      entity_type: "order",
      entity_id: payment.order_id,
      title: "Payment verified but reservation is missing or expired",
      instructions:
        "Customer paid successfully but their capacity reservation is no longer active. Manually assign a pool or refund.",
      status: "pending",
      priority: 1,
    });

    return NextResponse.json({ status: "requires_manual_review" }, { status: 202 });
  }

  const { data: order } = await service
    .from("orders")
    .select("id, user_id, order_type, service_id, services(name)")
    .eq("id", payment.order_id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  try {
    const serviceName = (order as any).services?.name ?? "your service";
    let subscriptionId: string;

    await trackEvent({
      eventType: "PAYMENT_SUCCEEDED",
      userId: order.user_id,
      serviceId: order.service_id,
      metadata: { orderId: payment.order_id, orderType: order.order_type },
    });

    if (order.order_type === "renewal") {
      subscriptionId = await renewSubscription({
        orderId: payment.order_id,
        reservationId: reservation.id,
      });

      await trackEvent({
        eventType: "RENEWAL_COMPLETED",
        userId: order.user_id,
        serviceId: order.service_id,
        metadata: { subscriptionId },
      });

      await notify({
        userId: order.user_id,
        category: "renewal_successful",
        title: `${serviceName} renewed`,
        message: `Your ${serviceName} subscription has been renewed successfully.`,
        sendEmail: true,
      });
    } else {
      subscriptionId = await completePurchase({
        orderId: payment.order_id,
        reservationId: reservation.id,
      });

      await trackEvent({
        eventType: "ACCESS_ACTIVATED",
        userId: order.user_id,
        serviceId: order.service_id,
        metadata: { subscriptionId },
      });

      await notify({
        userId: order.user_id,
        category: "payment_successful",
        title: "Payment confirmed",
        message: `Your payment for ${serviceName} was successful. We're setting up your access now.`,
        sendEmail: true,
      });
    }

    return NextResponse.json({ status: "completed", subscriptionId });
  } catch (err) {
    await service.from("admin_tasks").insert({
      task_type: "purchase_completion_failed",
      entity_type: "order",
      entity_id: payment.order_id,
      title: "complete_purchase failed after payment verification",
      instructions: `Error: ${err instanceof Error ? err.message : String(err)}`,
      status: "pending",
      priority: 1,
    });

    return NextResponse.json({ status: "requires_manual_review" }, { status: 202 });
  }
}
