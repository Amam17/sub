// lib/admin/auth.ts
//
// Shared guard for admin/operator-only API routes. RLS already
// blocks unauthorized reads/writes at the database layer, but
// routes should fail fast with a clear error before attempting
// any work.

import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type StaffRole = "support" | "operator" | "admin" | "super_admin";

export function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface AdminAuthResult {
  ok: boolean;
  status: number;
  error?: string;
  userId?: string;
  role?: StaffRole;
}

/**
 * Verifies the requester is authenticated and has one of the
 * allowed roles. Defaults to admin/super_admin only — pass a
 * wider set explicitly for routes that support/operator should
 * also reach (e.g. viewing fulfilment queues).
 */
export async function requireRole(
  allowedRoles: StaffRole[] = ["admin", "super_admin"]
): Promise<AdminAuthResult> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "UNAUTHENTICATED" };
  }

  const service = getServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role as StaffRole)) {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }

  return { ok: true, status: 200, userId: user.id, role: profile.role as StaffRole };
}
