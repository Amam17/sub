// tests/validation-schemas.unit.test.ts

import { describe, it, expect } from "vitest";
import {
  checkoutSchema,
  createServiceSchema,
  createPlanSchema,
  createTicketSchema,
  validateBody,
} from "@/lib/validation/schemas";

describe("validateBody", () => {
  it("accepts a valid checkout payload", () => {
    const result = validateBody(checkoutSchema, {
      planId: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID planId with a field-scoped message", () => {
    const result = validateBody(checkoutSchema, { planId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("planId");
    }
  });

  it("rejects a service with an invalid slug", () => {
    const result = validateBody(createServiceSchema, {
      name: "Netflix Premium",
      slug: "Netflix Premium", // spaces/caps not allowed
      access_delivery_type: "manual_delivery",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid service payload with only required fields", () => {
    const result = validateBody(createServiceSchema, {
      name: "Netflix Premium",
      slug: "netflix-premium",
      access_delivery_type: "manual_delivery",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative plan price", () => {
    const result = validateBody(createPlanSchema, {
      service_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Monthly",
      price: -100,
      currency: "NGN",
      billing_period: "month",
      duration_days: 30,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a ticket with an invalid category", () => {
    const result = validateBody(createTicketSchema, {
      subject: "Help",
      category: "not-a-real-category",
      message: "Something's wrong",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty ticket message", () => {
    const result = validateBody(createTicketSchema, {
      subject: "Help",
      category: "technical",
      message: "",
    });
    expect(result.success).toBe(false);
  });
});
