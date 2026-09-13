// app/api/support/order-lookup/route.ts
//
// POST /api/support/order-lookup  { orderId, email }
//
// Deliberately requires both the exact order ID and the email on
// the order — a bare order ID isn't enough to look someone else's
// order up. Returns only non-sensitive status fields.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { validateBody } from "@/lib/validation/schemas";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const orderLookupSchema = z.object({
  orderId: z.string().uuid(),
  email: z.string().trim().email(),
});

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  // Tighter limit than other public endpoints — this route exists
  // specifically to look records up by ID, so it's the one most
  // worth throttling against brute-force attempts.
  const limit = rateLimit(`order-lookup:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = validateBody(orderLookupSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }
  const { orderId, email } = parsed.data;

  const client = getServiceClient();

  const { data: order } = await client
    .from("orders")
    .select("id, payment_status, fulfilment_status, created_at, services(name), profiles!inner(email)")
    .eq("id", orderId)
    .eq("profiles.email", email.toLowerCase().trim())
    .single();

  if (!order) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      service: (order as any).services?.name,
      paymentStatus: order.payment_status,
      fulfilmentStatus: order.fulfilment_status,
      createdAt: order.created_at,
    },
  });
}
