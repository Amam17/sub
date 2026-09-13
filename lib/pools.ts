// lib/pools.ts
//
// Server-side service layer for the pool/capacity engine.
// All functions here call the Postgres functions defined in
// 0002_pool_capacity_engine.sql via the Supabase service-role
// client, so they must only run in server code (API routes,
// server actions, scheduled jobs) — never in the browser.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export interface CapacityReservation {
  id: string;
  pool_id: string;
  service_id: string;
  user_id: string;
  order_id: string;
  quantity: number;
  status: "reserved" | "confirmed" | "released" | "expired";
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export class PoolEngineError extends Error {
  code: string;
  constructor(message: string) {
    super(message);
    const separatorIndex = message.indexOf(":");
    this.code =
      separatorIndex > 0 ? message.slice(0, separatorIndex).trim() : "UNKNOWN_ERROR";
    this.name = "PoolEngineError";
  }
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new PoolEngineError(error.message);
  }
  if (data === null) {
    throw new PoolEngineError("UNKNOWN_ERROR: RPC returned no data");
  }
  return data;
}

/**
 * Finds the best eligible pool for a service using the same
 * priority order as the checkout flow: active pool with room
 * first, then a ready pool. Returns null if nothing has capacity.
 */
export async function findEligiblePool(
  serviceId: string,
  quantity = 1
): Promise<string | null> {
  const client = getServiceClient();
  const { data, error } = await client.rpc("find_eligible_pool", {
    p_service_id: serviceId,
    p_quantity: quantity,
  });

  if (error) {
    throw new PoolEngineError(error.message);
  }
  return data as string | null;
}

/**
 * Reserves capacity in a specific pool for the duration of the
 * checkout/payment window. Throws PoolEngineError with code
 * INSUFFICIENT_CAPACITY / POOL_NOT_AVAILABLE / POOL_NOT_FOUND
 * on failure — the caller should surface an availability error
 * to the customer rather than retry blindly.
 */
export async function reserveCapacity(params: {
  poolId: string;
  userId: string;
  orderId: string;
  quantity?: number;
  ttlMinutes?: number;
}): Promise<CapacityReservation> {
  const client = getServiceClient();
  const { data, error } = await client.rpc("reserve_capacity", {
    p_pool_id: params.poolId,
    p_user_id: params.userId,
    p_order_id: params.orderId,
    p_quantity: params.quantity ?? 1,
    p_ttl_minutes: params.ttlMinutes ?? 15,
  });

  return unwrap(data as CapacityReservation | null, error);
}

/**
 * Releases a reservation early (e.g. customer abandons checkout,
 * or payment fails before the TTL expires).
 */
export async function releaseReservation(
  reservationId: string,
  newStatus: "released" | "expired" = "released"
): Promise<void> {
  const client = getServiceClient();
  const { error } = await client.rpc("release_reservation", {
    p_reservation_id: reservationId,
    p_new_status: newStatus,
  });

  if (error) {
    throw new PoolEngineError(error.message);
  }
}

/**
 * The single entry point payment webhooks should call once a
 * payment is verified server-side. Idempotent per order_id —
 * safe to call more than once for the same order (duplicate
 * webhook deliveries are a normal occurrence).
 *
 * Returns the subscription id.
 */
export async function completePurchase(params: {
  orderId: string;
  reservationId: string;
  startsAt?: string;
  expiresAt?: string;
}): Promise<string> {
  const client = getServiceClient();
  const { data, error } = await client.rpc("complete_purchase", {
    p_order_id: params.orderId,
    p_reservation_id: params.reservationId,
    p_starts_at: params.startsAt ?? new Date().toISOString(),
    p_expires_at: params.expiresAt ?? null,
  });

  return unwrap(data as string | null, error);
}

/**
 * The renewal counterpart to completePurchase — extends an
 * existing subscription's expiry instead of creating a new
 * subscription row. Idempotent on order_id.
 */
export async function renewSubscription(params: {
  orderId: string;
  reservationId: string;
}): Promise<string> {
  const client = getServiceClient();
  const { data, error } = await client.rpc("renew_subscription", {
    p_order_id: params.orderId,
    p_reservation_id: params.reservationId,
  });

  return unwrap(data as string | null, error);
}

/**
 * Ends a subscription (cancellation or expiry) and returns its
 * capacity to the pool. Call this from the subscription-expiry
 * scheduled job as well as the customer-facing "cancel" action.
 */
export async function cancelSubscription(
  subscriptionId: string,
  newStatus: "cancelled" | "expired" = "cancelled"
): Promise<void> {
  const client = getServiceClient();
  const { error } = await client.rpc("cancel_subscription", {
    p_subscription_id: subscriptionId,
    p_new_status: newStatus,
  });

  if (error) {
    throw new PoolEngineError(error.message);
  }
}

/**
 * Scheduled-job entry point: releases capacity for any
 * reservation whose TTL has passed without payment confirmation.
 * Returns the number of reservations that were expired.
 * Wire this to a cron job (e.g. every 1-2 minutes).
 */
export async function expireStaleReservations(): Promise<number> {
  const client = getServiceClient();
  const { data, error } = await client.rpc("expire_stale_reservations");

  if (error) {
    throw new PoolEngineError(error.message);
  }
  return (data as number) ?? 0;
}

/**
 * Convenience wrapper for the checkout flow: finds a pool and
 * reserves capacity in a single call. Throws PoolEngineError
 * with code NO_CAPACITY_AVAILABLE if no eligible pool exists —
 * the caller should offer the waitlist at that point.
 */
export async function findPoolAndReserve(params: {
  serviceId: string;
  userId: string;
  orderId: string;
  quantity?: number;
  ttlMinutes?: number;
}): Promise<CapacityReservation> {
  const poolId = await findEligiblePool(params.serviceId, params.quantity ?? 1);

  if (!poolId) {
    throw new PoolEngineError(
      "NO_CAPACITY_AVAILABLE: no pool currently has room for this service"
    );
  }

  return reserveCapacity({
    poolId,
    userId: params.userId,
    orderId: params.orderId,
    quantity: params.quantity,
    ttlMinutes: params.ttlMinutes,
  });
}
