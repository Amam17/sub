// tests/rate-limit.unit.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    const key = `test-allow-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, 5, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests once the limit is exceeded", () => {
    const key = `test-block-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 60_000);
    }
    const result = rateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets the count after the window elapses", () => {
    const key = `test-reset-${Math.random()}`;
    for (let i = 0; i < 2; i++) {
      rateLimit(key, 2, 60_000);
    }
    expect(rateLimit(key, 2, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;

    rateLimit(keyA, 1, 60_000);
    const blockedA = rateLimit(keyA, 1, 60_000);
    const allowedB = rateLimit(keyB, 1, 60_000);

    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("reads the first IP from x-forwarded-for", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when the header is missing", () => {
    const request = new Request("https://example.com");
    expect(getClientIp(request)).toBe("unknown");
  });
});
