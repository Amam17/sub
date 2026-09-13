// app/api/admin/customers/bulk-status/route.ts
//
// PATCH /api/admin/customers/bulk-status  { customerIds: string[], status: "active" | "suspended" }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, getServiceClient } from "@/lib/admin/auth";
import { validateBody } from "@/lib/validation/schemas";

const bulkStatusSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(["active", "suspended"]),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(["admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = validateBody(bulkStatusSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }
  const { customerIds, status } = parsed.data;

  const client = getServiceClient();

  const { data, error } = await client
    .from("profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", customerIds)
    .select("id");

  if (error) {
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  // One audit entry per affected customer, so history stays queryable per-customer.
  const auditRows = (data ?? []).map((row) => ({
    actor_id: auth.userId,
    action: status === "suspended" ? "customer_suspended" : "customer_restored",
    target_type: "profile",
    target_id: row.id,
    new_value: { status },
  }));
  if (auditRows.length > 0) {
    await client.from("audit_logs").insert(auditRows);
  }

  return NextResponse.json({ updated: data?.length ?? 0 });
}
