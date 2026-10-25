/** Pure classification of email-provider failures. No I/O. */

export type EmailFailure = "transient" | "permanent";

/**
 * Classifies a failed send. Only rate limits (429) and provider errors (5xx)
 * are retried: the provider definitely didn't send. Everything else is final —
 * other 4xx won't succeed on retry, and with no status (network error or
 * timeout) the provider may already have sent it, so a retry risks a duplicate
 * once the idempotency key expires. A lost email beats a duplicate one.
 */
export function classifyEmailFailure(statusCode: number | null): EmailFailure {
  if (statusCode === 429 || (statusCode !== null && statusCode >= 500)) return "transient";
  return "permanent";
}
