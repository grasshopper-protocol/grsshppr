/**
 * Validates a post-sign-in destination (#161). Only same-site paths are
 * allowed, so a crafted `?callbackUrl=` can't send someone to another site
 * (open redirect). Anything doubtful falls back.
 */
export function safeCallbackPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || raw.length > 512) return fallback;
  // Must be a path on this site: one leading slash, not "//" (protocol-relative).
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // Browsers treat "\" as "/", so "/\evil.com" is protocol-relative too.
  if (raw.includes("\\")) return fallback;
  // No control characters or whitespace tricks; no scheme smuggled in.
  if (/[\u0000-\u001f\u007f\s]/.test(raw) || /^\/[a-z][a-z0-9+.-]*:/i.test(raw)) return fallback;
  // Don't loop back into auth pages.
  if (/^\/(sign-in|sign-up)(\/|$|\?)/.test(raw)) return fallback;
  return raw;
}
