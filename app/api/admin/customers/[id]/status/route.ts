// app/api/admin/customers/[id]/status/route.ts
//
// PATCH /api/admin/customers/:id/status  { status: "active" | "suspended" }

import { NextRequest, NextResponse } from "next/server";
import { requireRole, getServiceClient } from "@/lib/admin/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(["admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!["active", "suspended"].includes(body?.status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const client = getServiceClient();
  const { data: existing } = await client
    .from("profiles")
    .select("status")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "CUSTOMER_NOT_FOUND" }, { status: 404 });
  }

  const { data, error } = await client
    .from("profiles")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  await client.from("audit_logs").insert({
    actor_id: auth.userId,
    action: body.status === "suspended" ? "customer_suspended" : "customer_restored",
    target_type: "profile",
    target_id: params.id,
    previous_value: { status: existing.status },
    new_value: { status: body.status },
  });

  return NextResponse.json({ profile: data });
}
