// app/api/admin/categories/route.ts
//
// GET  /api/admin/categories  — list (any staff role)
// POST /api/admin/categories  — create (admin/super_admin only)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, getServiceClient } from "@/lib/admin/auth";
import { validateBody } from "@/lib/validation/schemas";

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const auth = await requireRole(["support", "operator", "admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const client = getServiceClient();
  const { data, error } = await client
    .from("service_categories")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "super_admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = validateBody(createCategorySchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }

  const client = getServiceClient();
  const { data, error } = await client
    .from("service_categories")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "CREATE_FAILED", detail: error.message }, { status: 500 });
  }

  await client.from("audit_logs").insert({
    actor_id: auth.userId,
    action: "category_created",
    target_type: "service_category",
    target_id: data.id,
    new_value: data,
  });

  return NextResponse.json({ category: data }, { status: 201 });
}
