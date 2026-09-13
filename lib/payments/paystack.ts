// lib/payments/paystack.ts
//
// Paystack implementation of PaymentProvider. Keep all
// Paystack-specific request/response shapes contained here —
// checkout and webhook code should only ever import the
// PaymentProvider interface, never this file directly (wire
// it up once in a small factory, e.g. lib/payments/index.ts).

import crypto from "crypto";
import type {
  InitializePaymentParams,
  InitializePaymentResult,
  PaymentProvider,
  RefundResult,
  VerifyPaymentResult,
} from "./provider";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function requireSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
  }
  return key;
}

export class PaystackProvider implements PaymentProvider {
  readonly name = "paystack";

  async initialize(
    params: InitializePaymentParams
  ): Promise<InitializePaymentResult> {
    const secretKey = requireSecretKey();

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.customerEmail,
        amount: params.amount,
        currency: params.currency,
        callback_url: params.callbackUrl,
        metadata: {
          order_id: params.orderId,
          ...params.metadata,
        },
      }),
    });

    const body = await response.json();

    if (!response.ok || !body.status) {
      throw new Error(
        `PAYMENT_INIT_FAILED: Paystack returned ${response.status} — ${
          body.message ?? "unknown error"
        }`
      );
    }

    return {
      providerReference: body.data.reference as string,
      authorizationUrl: body.data.authorization_url as string,
    };
  }

  async verify(providerReference: string): Promise<VerifyPaymentResult> {
    const secretKey = requireSecretKey();

    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(providerReference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
      }
    );

    const body = await response.json();

    if (!response.ok) {
      throw new Error(
        `PAYMENT_VERIFY_FAILED: Paystack returned ${response.status} — ${
          body.message ?? "unknown error"
        }`
      );
    }

    const data = body.data;
    const status: VerifyPaymentResult["status"] =
      data.status === "success"
        ? "verified"
        : data.status === "abandoned" || data.status === "failed"
        ? "failed"
        : "pending";

    return {
      providerReference,
      status,
      amount: data.amount,
      currency: data.currency,
      rawPayload: body,
    };
  }

  async refund(providerReference: string, amount?: number): Promise<RefundResult> {
    const secretKey = requireSecretKey();

    const response = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: providerReference,
        ...(amount !== undefined ? { amount } : {}),
      }),
    });

    const body = await response.json();

    if (!response.ok || !body.status) {
      throw new Error(
        `REFUND_FAILED: Paystack returned ${response.status} — ${body.message ?? "unknown error"}`
      );
    }

    const refundStatus = body.data?.status;
    const status: RefundResult["status"] =
      refundStatus === "processed" ? "processed" : refundStatus === "failed" ? "failed" : "pending";

    return {
      refundReference: String(body.data?.id ?? providerReference),
      status,
    };
  }

  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null
  ): { valid: boolean; providerReference: string | null } {
    if (!signatureHeader) {
      return { valid: false, providerReference: null };
    }

    const secretKey = requireSecretKey();
    const computedHash = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");

    // Constant-time comparison to avoid timing attacks.
    const valid =
      computedHash.length === signatureHeader.length &&
      crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(signatureHeader));

    if (!valid) {
      return { valid: false, providerReference: null };
    }

    try {
      const parsed = JSON.parse(rawBody);
      const reference = parsed?.data?.reference ?? null;
      return { valid: true, providerReference: reference };
    } catch {
      return { valid: false, providerReference: null };
    }
  }
}
