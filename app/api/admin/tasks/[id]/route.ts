// app/api/admin/tasks/[id]/route.ts
//
// PATCH /api/admin/tasks/:id  { status }
//
// Generic completion/status endpoint for admin_tasks that don't
// have a specialized route (e.g. license_stock_exhausted,
// pool_health_critical). access_delivery_handoff / manual_fulfilment
// tasks should go through /api/admin/access-deliveries/:id/complete
// instead, since those also update the delivery and notify the
// customer — this route only touches the task row itself.

import { NextRequest, NextResponse } from "next/server";
import { requireRole, getServiceClient } from "@/lib/admin/auth";

const VALID_STATUSES = ["pending", "in_progress", "completed", "cancelled"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(["support", "operator", "admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!VALID_STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const client = getServiceClient();
  const updates: Record<string, unknown> = { status: body.status };
  if (body.status === "completed") updates.completed_at = new Date().toISOString();

  const { data, error } = await client
    .from("admin_tasks")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ task: data });
}
