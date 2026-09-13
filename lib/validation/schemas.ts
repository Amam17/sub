// lib/validation/schemas.ts
import { z } from "zod";

export const checkoutSchema = z.object({
  planId: z.string().uuid("planId must be a valid UUID"),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(2000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  status: z.enum(["draft", "active", "paused", "unavailable", "archived"]).optional(),
  access_delivery_type: z.enum([
    "seat_invitation",
    "existing_account",
    "account_creation_link",
    "license_key",
    "voucher_code",
    "manual_delivery",
  ]),
  pool_required: z.boolean().optional(),
  continuity_lock_eligible: z.boolean().optional(),
});

export const updateServiceSchema = createServiceSchema
  .partial()
  .extend({
    renewal_rules: z.record(z.unknown()).optional(),
  });

export const createPlanSchema = z.object({
  service_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().nonnegative(),
  currency: z.string().length(3, "Currency should be a 3-letter code, e.g. NGN"),
  billing_period: z.string().min(1).max(50),
  duration_days: z.number().int().positive(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
});

export const createPoolSchema = z.object({
  service_id: z.string().uuid(),
  total_capacity: z.number().int().positive(),
  name: z.string().trim().max(200).optional(),
  status: z.enum(["draft", "ready", "active"]).optional(),
  starts_at: z.string().datetime().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

export const waitlistSchema = z.object({
  serviceId: z.string().uuid(),
  planId: z.string().uuid().optional().nullable(),
});

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  category: z.enum(["payment", "access", "renewal", "account", "technical", "other"]),
  message: z.string().trim().min(1).max(5000),
});

/**
 * Parses a request body against a schema and returns a typed
 * result or a formatted first-error message — routes stay short:
 *   const parsed = validateBody(checkoutSchema, await request.json());
 *   if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
 */
export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstIssue = result.error.issues[0];
  const field = firstIssue.path.join(".");
  return { success: false, error: field ? `${field}: ${firstIssue.message}` : firstIssue.message };
}
