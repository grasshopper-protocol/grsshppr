import { timingSafeEqual } from "crypto";

/**
 * Checks a cron invocation's `Authorization` header against CRON_SECRET.
 *
 * Fails closed: with no secret configured, every call is rejected — an unset
 * env var must never turn a cron route into a public endpoint. Vercel sends
 * the secret as `Authorization: Bearer <CRON_SECRET>`.
 */
export function isAuthorizedCronRequest(
  authHeader: string | null,
  cronSecret: string | undefined
): boolean {
  if (!cronSecret || !authHeader) return false;

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);
  // timingSafeEqual throws on unequal lengths; a length mismatch is a mismatch.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
