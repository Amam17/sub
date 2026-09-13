// lib/payments/index.ts
import type { PaymentProvider } from "./provider";
import { PaystackProvider } from "./paystack";

let cachedProvider: PaymentProvider | null = null;

/**
 * Returns the active payment provider. Swapping gateways later
 * means adding a new class and changing this one function —
 * checkout, webhook, and refund code never need to change.
 */
export function getPaymentProvider(): PaymentProvider {
  if (!cachedProvider) {
    cachedProvider = new PaystackProvider();
  }
  return cachedProvider;
}

export type { PaymentProvider } from "./provider";
