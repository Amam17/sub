// app/api/waitlist/route.ts
//
// POST   /api/waitlist   { serviceId, planId? }  — join
// DELETE /api/waitlist   { serviceId, planId? }  — leave

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { waitlistSchema, validateBody } from "@/lib/validation/schemas";
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
  const limit = rateLimit(`waitlist:${ip}`, 20, 60_000);
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
  const parsed = validateBody(waitlistSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }
  const { serviceId, planId } = parsed.data;

  const client = getServiceClient();

  const { data, error } = await client
    .from("waitlists")
    .insert({
      user_id: user.id,
      service_id: serviceId,
      plan_id: planId ?? null,
    })
    .select()
    .single();

  if (error) {
    // Unique constraint (user_id, service_id, plan_id) — already on the list.
    if (error.code === "23505") {
      return NextResponse.json({ status: "already_on_waitlist" });
    }
    return NextResponse.json({ error: "WAITLIST_JOIN_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ status: "joined", waitlistEntry: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = validateBody(waitlistSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }
  const { serviceId, planId } = parsed.data;

  const client = getServiceClient();

  let query = client
    .from("waitlists")
    .delete()
    .eq("user_id", user.id)
    .eq("service_id", serviceId);

  if (planId) query = query.eq("plan_id", planId);

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: "WAITLIST_LEAVE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ status: "left" });
}
