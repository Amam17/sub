// tests/pool-engine-error.unit.test.ts

import { describe, it, expect } from "vitest";
import { PoolEngineError } from "@/lib/pools";

describe("PoolEngineError", () => {
  it("extracts the error code from a Postgres RAISE EXCEPTION message", () => {
    const err = new PoolEngineError("INSUFFICIENT_CAPACITY: pool xyz has 0 available, 1 requested");
    expect(err.code).toBe("INSUFFICIENT_CAPACITY");
    expect(err.message).toContain("0 available");
  });

  it("falls back to UNKNOWN_ERROR when there's no code prefix", () => {
    const err = new PoolEngineError("something went wrong with no colon");
    expect(err.code).toBe("UNKNOWN_ERROR");
  });

  it("handles messages with multiple colons by taking only the first segment as the code", () => {
    const err = new PoolEngineError("POOL_NOT_FOUND: pool 123: additional detail");
    expect(err.code).toBe("POOL_NOT_FOUND");
  });
});
