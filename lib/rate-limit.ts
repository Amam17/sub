// lib/rate-limit.ts
//
// Fixed-window rate limiter, keyed by IP + route. This is
// in-memory, so it resets on deploy and doesn't share state
// across multiple server instances — fine for a single-instance
// MVP deployment, but once you're running more than one instance
// (e.g. scaled up on Vercel), swap this for Upstash Redis or
// similar shared-state store so limits are enforced consistently.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically clear old buckets so this doesn't grow unbounded
// over a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key Unique identifier — combine the route name and the
 *   caller's IP, e.g. `checkout:${ip}`.
 * @param limit Max requests allowed per window.
 * @param windowMs Window duration in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Extracts a best-effort client IP from a Next.js request. Behind
 * Vercel this reads x-forwarded-for; falls back to a constant so
 * local dev doesn't throw.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
