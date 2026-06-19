// ponytail: simple in-memory rate limiter. Ceiling: no cross-instance state.
// Upgrade path: swap to @upstash/ratelimit with Redis for multi-instance deploys.
const windows = new Map<string, { count: number; expiresAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now > entry.expiresAt) {
    windows.set(key, { count: 1, expiresAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  entry.count++;
  return { ok: true, remaining: limit - entry.count };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (now > entry.expiresAt) windows.delete(key);
  }
}, 60_000);
