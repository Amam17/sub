// app/api/admin/plans/[id]/route.ts
//
// PATCH /api/admin/plans/:id

import { NextRequest, NextResponse } from "next/server";
import { requireRole, getServiceClient } from "@/lib/admin/auth";

const EDITABLE_FIELDS = ["name", "description", "price", "currency", "billing_period", "duration_days", "status"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(["admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const client = getServiceClient();
  const { data: existing } = await client.from("plans").select("*").eq("id", params.id).single();
  if (!existing) return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });

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
    .from("plans")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "UPDATE_FAILED", detail: error.message }, { status: 500 });
  }

  await client.from("audit_logs").insert({
    actor_id: auth.userId,
    action: "plan_updated",
    target_type: "plan",
    target_id: params.id,
    previous_value: existing,
    new_value: data,
  });

  return NextResponse.json({ plan: data });
}
