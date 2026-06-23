import { Resend } from "resend";

// ponytail: single instance, lazy init if env var missing (dev without email)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "Grsshppr <noreply@grsshppr.org>";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) {
  if (!resend) {
    console.log(`[email] Would send to ${to}: ${subject}`);
    return;
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, react });
  if (error) {
    // ponytail: log and move on — email failure shouldn't break booking flow
    console.error(`[email] Failed to send to ${to}:`, error);
  }
}
