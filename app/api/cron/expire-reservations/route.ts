// app/api/cron/expire-reservations/route.ts
//
// Scheduled job — run every 1-2 minutes (e.g. Vercel Cron or
// Supabase scheduled function). Protect with CRON_SECRET so it
// can't be triggered by anyone who finds the URL.

import { NextRequest, NextResponse } from "next/server";
import { expireStaleReservations } from "@/lib/pools";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const expiredCount = await expireStaleReservations();

  return NextResponse.json({ expiredCount });
}
