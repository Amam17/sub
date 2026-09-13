 // tests/availability-badge.unit.test.ts

import { describe, it, expect } from "vitest";
import { availabilityFromCapacity } from "@/components/ui/AvailabilityBadge";

describe("availabilityFromCapacity", () => {
  it("returns unavailable when nothing is left", () => {
    expect(availabilityFromCapacity(0, 10)).toBe("unavailable");
  });

  it("returns unavailable for negative available capacity", () => {
    expect(availabilityFromCapacity(-1, 10)).toBe("unavailable");
  });

  it("returns near_full at or below 15% remaining", () => {
    expect(availabilityFromCapacity(1, 10)).toBe("near_full");
    expect(availabilityFromCapacity(1.5, 10)).toBe("near_full");
  });

  it("returns limited between 15% and 40% remaining", () => {
    expect(availabilityFromCapacity(3, 10)).toBe("limited");
  });

  it("returns available above 40% remaining", () => {
    expect(availabilityFromCapacity(5, 10)).toBe("available");
    expect(availabilityFromCapacity(10, 10)).toBe("available");
  });

  it("does not divide by zero when total capacity is zero", () => {
    expect(availabilityFromCapacity(0, 0)).toBe("unavailable");
  });
});
