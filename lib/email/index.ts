// lib/email/index.ts
import type { EmailProvider } from "./provider";
import { ResendProvider } from "./resend";

let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!cachedProvider) {
    cachedProvider = new ResendProvider();
  }
  return cachedProvider;
}

export type { EmailProvider } from "./provider";
