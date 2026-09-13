// app/api/admin/plans/route.ts
//
// GET  /api/admin/plans?service_id=... — list plans (optionally filtered)
// POST /api/admin/plans                — create a plan

import { NextRequest, NextResponse } from "next/server";
import { requireRole, getServiceClient } from "@/lib/admin/auth";
import { createPlanSchema, validateBody } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const auth = await requireRole(["support", "operator", "admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const serviceId = request.nextUrl.searchParams.get("service_id");
  const client = getServiceClient();

  let query = client.from("plans").select("*").order("created_at", { ascending: false });
  if (serviceId) query = query.eq("service_id", serviceId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  return NextResponse.json({ plans: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = validateBody(createPlanSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }
  const input = parsed.data;

  const client = getServiceClient();
  const { data, error } = await client
    .from("plans")
    .insert({
      service_id: input.service_id,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      currency: input.currency,
      billing_period: input.billing_period,
      duration_days: input.duration_days,
      status: input.status ?? "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "CREATE_FAILED", detail: error.message }, { status: 500 });
  }

  await client.from("audit_logs").insert({
    actor_id: auth.userId,
    action: "plan_created",
    target_type: "plan",
    target_id: data.id,
    new_value: data,
  });

  return NextResponse.json({ plan: data }, { status: 201 });
}
