// app/api/admin/pools/[id]/route.ts
//
// PATCH /api/admin/pools/:id
// Typical use: mark a pool 'ready' once provisioning is done,
// or adjust total_capacity. The database's check constraint
// (used_capacity + reserved_capacity <= total_capacity) prevents
// shrinking capacity below what's already committed.

import { NextRequest, NextResponse } from "next/server";
import { requireRole, getServiceClient } from "@/lib/admin/auth";

const EDITABLE_FIELDS = [
  "name",
  "status",
  "total_capacity",
  "utilization_threshold",
  "starts_at",
  "expires_at",
  "health_status",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(["admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const client = getServiceClient();
  const { data: existing } = await client.from("pools").select("*").eq("id", params.id).single();
  if (!existing) return NextResponse.json({ error: "POOL_NOT_FOUND" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "NO_EDITABLE_FIELDS_PROVIDED" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from("pools")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    // Most likely the capacity check constraint if total_capacity
    // was reduced below used + reserved.
    return NextResponse.json({ error: "UPDATE_FAILED", detail: error.message }, { status: 409 });
  }

  if (updates.status === "ready" && existing.status !== "ready") {
    await client.from("pool_events").insert({
      pool_id: params.id,
      event_type: "provisioning_completed",
      event_source: "admin",
      status: "success",
      payload: { actor_id: auth.userId },
    });
  }

  await client.from("audit_logs").insert({
    actor_id: auth.userId,
    action: "pool_updated",
    target_type: "pool",
    target_id: params.id,
    previous_value: existing,
    new_value: data,
  });

  return NextResponse.json({ pool: data });
}
