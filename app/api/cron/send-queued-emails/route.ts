// app/api/cron/send-queued-emails/route.ts
//
// Scheduled job — run every 1-2 minutes. Processes email_logs
// rows with status='queued'. Failures are left as 'failed' with
// an error_message rather than retried indefinitely here — wire
// up alerting on repeated failures for a given to_email/template
// if needed rather than looping forever on a bad address.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEmailProvider } from "@/lib/email";
import { renderEmailHtml } from "@/lib/email/templates";

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
  const provider = getEmailProvider();

  const { data: queued } = await client
    .from("email_logs")
    .select("id, to_email, subject, body")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(50);

  let sent = 0;
  let failed = 0;

  for (const email of queued ?? []) {
    if (!email.subject || !email.body) {
      await client
        .from("email_logs")
        .update({ status: "failed", error_message: "Missing subject or body" })
        .eq("id", email.id);
      failed += 1;
      continue;
    }

    try {
      const html = renderEmailHtml({ subject: email.subject, body: email.body });

      const result = await provider.send({
        to: email.to_email,
        subject: email.subject,
        body: email.body,
        html,
      });

      await client
        .from("email_logs")
        .update({
          status: "sent",
          provider_reference: result.providerReference,
          sent_at: new Date().toISOString(),
        })
        .eq("id", email.id);

      sent += 1;
    } catch (err) {
      await client
        .from("email_logs")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : String(err),
        })
        .eq("id", email.id);

      failed += 1;
    }
  }

  return NextResponse.json({ sent, failed });
}
