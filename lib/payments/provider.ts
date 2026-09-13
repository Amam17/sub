// lib/payments/provider.ts
//
// Abstraction so checkout/webhook code never talks to a specific
// gateway directly. Add new gateways by implementing this interface,
// not by branching on provider name in checkout logic.

export interface InitializePaymentParams {
  orderId: string;
  amount: number; // in the smallest currency unit (e.g. kobo for NGN)
  currency: string;
  customerEmail: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResult {
  providerReference: string;
  authorizationUrl: string;
}

export interface VerifyPaymentResult {
  providerReference: string;
  status: "verified" | "failed" | "pending";
  amount: number;
  currency: string;
  rawPayload: unknown;
}

export interface RefundResult {
  refundReference: string;
  status: "pending" | "processed" | "failed";
}

export interface PaymentProvider {
  readonly name: string;
  initialize(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verify(providerReference: string): Promise<VerifyPaymentResult>;
  refund(providerReference: string, amount?: number): Promise<RefundResult>;
  /**
   * Verifies a webhook's signature and extracts the payment
   * reference from the raw body. Must not trust the payload
   * until this returns a valid reference — see the payment
   * security rule in the build spec: never mark an order paid
   * from a frontend success message alone.
   */
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null
  ): { valid: boolean; providerReference: string | null };
}
