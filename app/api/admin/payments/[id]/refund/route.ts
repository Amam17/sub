// app/api/admin/payments/[id]/refund/route.ts
//
// POST /api/admin/payments/:id/refund  { reason?: string }
//
// Triggers an actual refund through the payment provider, then
// marks the payment/order refunded and cancels the associated
// subscription (releasing its pool capacity) — a refunded
// customer shouldn't keep occupying a paid seat.

import { NextRequest, NextResponse } from "next/server";
import { requireRole, getServiceClient } from "@/lib/admin/auth";
import { getPaymentProvider } from "@/lib/payments";
import { cancelSubscription } from "@/lib/pools";
import { notify } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(["admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const client = getServiceClient();

  const { data: payment } = await client
    .from("payments")
    .select("id, order_id, user_id, provider, provider_reference, status, amount")
    .eq("id", params.id)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  }

  if (payment.status !== "verified") {
    return NextResponse.json(
      { error: "PAYMENT_NOT_REFUNDABLE", detail: `Payment status is ${payment.status}` },
      { status: 409 }
    );
  }

  const provider = getPaymentProvider();

  let refundResult;
  try {
    refundResult = await provider.refund(payment.provider_reference);
  } catch (err) {
    return NextResponse.json(
      { error: "REFUND_PROVIDER_FAILED", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  await client
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", payment.id);

  await client
    .from("orders")
    .update({ payment_status: "refunded", fulfilment_status: "cancelled" })
    .eq("id", payment.order_id);

  // Release the subscription's capacity, if one was created from this order.
  const { data: subscription } = await client
    .from("subscriptions")
    .select("id, status, services(name)")
    .eq("order_id", payment.order_id)
    .maybeSingle();

  if (subscription && !["cancelled", "expired"].includes(subscription.status)) {
    await cancelSubscription(subscription.id, "cancelled");
  }

  await client.from("audit_logs").insert({
    actor_id: auth.userId,
    action: "payment_refunded",
    target_type: "payment",
    target_id: payment.id,
    previous_value: { status: "verified" },
    new_value: { status: "refunded", reason: body.reason ?? null, refundReference: refundResult.refundReference },
  });

  const serviceName = (subscription as any)?.services?.name ?? "your order";
  await notify({
    userId: payment.user_id,
    category: "refund_processed",
    title: "Refund processed",
    message: `Your payment for ${serviceName} has been refunded.`,
    sendEmail: true,
  });

  return NextResponse.json({ status: "refunded", refundReference: refundResult.refundReference });
}
