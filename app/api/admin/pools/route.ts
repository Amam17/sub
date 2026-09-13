// app/api/admin/pools/route.ts
//
// GET  /api/admin/pools?service_id=...
// POST /api/admin/pools
//
// This is how an admin stands up the *first* pool for a new
// service (the threshold-automation handler only creates
// successor pools once one already exists and is filling up).

import { NextRequest, NextResponse } from "next/server";
import { requireRole, getServiceClient } from "@/lib/admin/auth";
import { createPoolSchema, validateBody } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const auth = await requireRole(["support", "operator", "admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const serviceId = request.nextUrl.searchParams.get("service_id");
  const client = getServiceClient();

  let query = client.from("pools").select("*").order("pool_number", { ascending: true });
  if (serviceId) query = query.eq("service_id", serviceId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  return NextResponse.json({ pools: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = validateBody(createPoolSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }
  const input = parsed.data;

  const client = getServiceClient();

  const { data: lastPool } = await client
    .from("pools")
    .select("pool_number")
    .eq("service_id", input.service_id)
    .order("pool_number", { ascending: false })
    .limit(1)
    .single();

  const nextPoolNumber = (lastPool?.pool_number ?? 0) + 1;

  const { data, error } = await client
    .from("pools")
    .insert({
      service_id: input.service_id,
      pool_number: nextPoolNumber,
      name: input.name ?? `Pool ${nextPoolNumber}`,
      status: input.status ?? "draft",
      total_capacity: input.total_capacity,
      starts_at: input.starts_at ?? null,
      expires_at: input.expires_at ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "CREATE_FAILED", detail: error.message }, { status: 500 });
  }

  await client.from("pool_events").insert({
    pool_id: data.id,
    event_type: "pool_created",
    event_source: "admin",
    status: "success",
    payload: { actor_id: auth.userId },
  });

  await client.from("audit_logs").insert({
    actor_id: auth.userId,
    action: "pool_created",
    target_type: "pool",
    target_id: data.id,
    new_value: data,
  });

  return NextResponse.json({ pool: data }, { status: 201 });
}
