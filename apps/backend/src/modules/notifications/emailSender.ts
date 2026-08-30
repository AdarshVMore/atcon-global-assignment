import { logger } from "../../shared/utils/logger.ts";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/**
 * No SMTP/email provider is configured for this project — this logs what
 * would be sent instead of actually sending it. Swap in a real provider
 * (Postmark, SES, Resend, ...) behind this same interface when one is
 * configured; nothing calling `EmailSender` needs to change.
 */
export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    logger.info("Email (console transport — no provider configured)", {
      to: message.to,
      subject: message.subject,
    });
  }
}
