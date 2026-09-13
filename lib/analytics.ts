// lib/analytics.ts
//
// Single entry point for logging a product analytics event.
// Fire-and-forget by design (errors are swallowed) — analytics
// should never be able to break a checkout or webhook flow.

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type AnalyticsEventType =
  | "USER_REGISTERED"
  | "SERVICE_VIEWED"
  | "PLAN_SELECTED"
  | "CHECKOUT_STARTED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "ACCESS_ACTIVATED"
  | "RENEWAL_COMPLETED";

interface TrackEventParams {
  eventType: AnalyticsEventType;
  userId?: string;
  serviceId?: string;
  planId?: string;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    const client = getServiceClient();
    await client.from("analytics_events").insert({
      event_type: params.eventType,
      user_id: params.userId ?? null,
      service_id: params.serviceId ?? null,
      plan_id: params.planId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Never let analytics logging break the calling flow.
  }
}
