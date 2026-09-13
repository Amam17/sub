// app/api/cron/process-waitlist/route.ts
//
// Scheduled job — run every 5-10 minutes. Only notifies; it does
// not auto-reserve on the customer's behalf (per spec, purchase
// is always a deliberate customer action). Oldest entries are
// notified first, up to current available capacity for the
// service, then removed so they aren't renotified every run.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notifications";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const client = getServiceClient();
  let notified = 0;

  const { data: services } = await client
    .from("services")
    .select("id, name")
    .eq("status", "active");

  for (const svc of services ?? []) {
    const { data: waitlisted } = await client
      .from("waitlists")
      .select("id, user_id, plan_id, created_at")
      .eq("service_id", svc.id)
      .order("created_at", { ascending: true });

    if (!waitlisted || waitlisted.length === 0) continue;

    const { data: capacityRows } = await client
      .from("pools")
      .select("available_capacity")
      .eq("service_id", svc.id)
      .in("status", ["active", "ready"]);

    const totalAvailable = (capacityRows ?? []).reduce(
      (sum, p) => sum + (p.available_capacity ?? 0),
      0
    );

    if (totalAvailable <= 0) continue;

    const toNotify = waitlisted.slice(0, totalAvailable);

    for (const entry of toNotify) {
      await notify({
        userId: entry.user_id,
        category: "waitlist_available",
        title: `${svc.name} is available again`,
        message: `A spot just opened up for ${svc.name}. Purchase now before it fills up.`,
        sendEmail: true,
      });

      await client.from("waitlists").delete().eq("id", entry.id);
      notified += 1;
    }
  }

  return NextResponse.json({ notified });
}
