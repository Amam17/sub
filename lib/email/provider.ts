// lib/email/provider.ts

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SendEmailResult {
  providerReference: string;
}

export interface EmailProvider {
  readonly name: string;
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
