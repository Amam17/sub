// lib/email/resend.ts
//
// Resend implementation. As with payments, checkout/notification
// code should only ever import getEmailProvider() from
// lib/email/index.ts — never this file directly — so switching
// providers later is a one-file change.

import type { EmailProvider, SendEmailParams, SendEmailResult } from "./provider";

const RESEND_BASE_URL = "https://api.resend.com";

export class ResendProvider implements EmailProvider {
  readonly name = "resend";

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS;

    if (!apiKey || !fromAddress) {
      throw new Error("Missing RESEND_API_KEY or EMAIL_FROM_ADDRESS");
    }

    const response = await fetch(`${RESEND_BASE_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        text: params.body,
        ...(params.html ? { html: params.html } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`EMAIL_SEND_FAILED: ${data.message ?? response.status}`);
    }

    return { providerReference: data.id as string };
  }
}
