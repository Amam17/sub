// app/api/admin/services/route.ts
//
// GET  /api/admin/services        — list all services (any staff role)
// POST /api/admin/services        — create a service (admin/super_admin only)

import { NextRequest, NextResponse } from "next/server";
import { requireRole, getServiceClient } from "@/lib/admin/auth";
import { createServiceSchema, validateBody } from "@/lib/validation/schemas";

export async function GET() {
  const auth = await requireRole(["support", "operator", "admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const client = getServiceClient();
  const { data, error } = await client
    .from("services")
    .select("*, service_categories(name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  return NextResponse.json({ services: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = validateBody(createServiceSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }
  const input = parsed.data;

  const client = getServiceClient();
  const { data, error } = await client
    .from("services")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      category_id: input.category_id ?? null,
      logo_url: input.logo_url ?? null,
      status: input.status ?? "draft",
      access_delivery_type: input.access_delivery_type,
      pool_required: input.pool_required ?? true,
      continuity_lock_eligible: input.continuity_lock_eligible ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "CREATE_FAILED", detail: error.message }, { status: 500 });
  }

  await client.from("audit_logs").insert({
    actor_id: auth.userId,
    action: "service_created",
    target_type: "service",
    target_id: data.id,
    new_value: data,
  });

  return NextResponse.json({ service: data }, { status: 201 });
}
