/** Pure classification of email-provider failures. No I/O. */

export type EmailFailure = "transient" | "permanent";

/**
 * Classifies a failed send. Network errors (no status), rate limits (429),
 * idempotency conflicts (409) and provider errors (5xx) may succeed on retry;
 * any other 4xx (invalid or suppressed address, bad config) will not.
 */
export function classifyEmailFailure(statusCode: number | null): EmailFailure {
  if (statusCode === null || statusCode === 409 || statusCode === 429 || statusCode >= 500) {
    return "transient";
  }
  return "permanent";
}
