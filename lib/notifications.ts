// lib/notifications.ts
//
// Single entry point for sending a notification to a customer.
// Always writes the in-app record; email is queued as a log row
// that a separate email-sending worker (or provider webhook)
// picks up — keeping notification triggering decoupled from
// actual email delivery so a slow/down email provider never
// blocks the automation that triggered the notification.

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type NotificationCategory =
  | "payment_successful"
  | "payment_failed"
  | "subscription_active"
  | "access_ready"
  | "activation_failed"
  | "subscription_expiring"
  | "subscription_expired"
  | "renewal_successful"
  | "continuity_lock_updated"
  | "waitlist_available"
  | "support_reply"
  | "refund_processed";

interface NotifyParams {
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  sendEmail?: boolean;
  emailTemplate?: string;
  emailBody?: string; // defaults to `message` if not provided
}

export async function notify(params: NotifyParams): Promise<void> {
  const client = getServiceClient();

  await client.from("notifications").insert({
    user_id: params.userId,
    channel: "in_app",
    category: params.category,
    title: params.title,
    message: params.message,
    status: "unread",
  });

  if (params.sendEmail) {
    const { data: profile } = await client
      .from("profiles")
      .select("email")
      .eq("id", params.userId)
      .single();

    if (profile?.email) {
      await client.from("email_logs").insert({
        user_id: params.userId,
        to_email: profile.email,
        template: params.emailTemplate ?? params.category,
        subject: params.title,
        body: params.emailBody ?? params.message,
        status: "queued",
      });
    }
  }
}
