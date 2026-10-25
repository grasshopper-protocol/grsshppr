import { Resend } from "resend";
import { classifyEmailFailure, type EmailFailure } from "@/lib/email-errors";

// ponytail: single instance, lazy init if env var missing (dev without email)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "Grsshppr <noreply@grsshppr.org>";

export type SendEmailResult = { ok: true } | { ok: false; failure: EmailFailure };

// Log the domain only — a full address is personal data and doesn't help debugging.
const domainOf = (to: string) => to.slice(to.lastIndexOf("@") + 1);

/**
 * Sends an email. Never throws: callers that must not lose or duplicate an
 * email check the result and pass an `idempotencyKey` (the provider then
 * drops repeats of the same key for 24h).
 */
export async function sendEmail({
  to,
  subject,
  react,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
  idempotencyKey?: string;
}): Promise<SendEmailResult> {
  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email] Would send to ${to}: ${subject}`);
      return { ok: true };
    }
    // Missing key in production (e.g. a Preview deployment) won't fix itself mid-run.
    return { ok: false, failure: "permanent" };
  }

  try {
    const { error } = await resend.emails.send(
      { from: FROM, to, subject, react },
      idempotencyKey ? { idempotencyKey } : undefined
    );
    if (error) {
      // ponytail: log and move on — email failure shouldn't break booking flow
      console.error(`[email] Failed to send to @${domainOf(to)}: ${error.name} (${error.statusCode ?? "no status"})`);
      return { ok: false, failure: classifyEmailFailure(error.statusCode) };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[email] Failed to send to @${domainOf(to)}: ${err instanceof Error ? err.message : "network error"}`);
    // The provider may have sent it before the connection failed — don't retry.
    return { ok: false, failure: classifyEmailFailure(null) };
  }
}
