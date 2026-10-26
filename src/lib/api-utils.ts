import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function safeJson(request: Request) {
  try {
    return { data: await request.json(), error: null };
  } catch {
    return { data: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}

export const uuidParam = z.string().uuid();

// ponytail: in-memory sliding window rate limiter.
// Each serverless instance has its own Map — good enough to prevent casual abuse.
// Ceiling: won't stop distributed attacks across many instances. Upgrade path: @upstash/ratelimit.
const hitMap = new Map<string, number[]>();

// Pass `key` to limit by something other than the client IP — e.g. per calendar
// feed, whose requests come from shared calendar-provider servers.
export function rateLimit(
  request: NextRequest,
  { limit = 10, windowMs = 60_000, key }: { limit?: number; windowMs?: number; key?: string } = {}
): NextResponse | null {
  const bucket =
    key ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const now = Date.now();
  const hits = hitMap.get(bucket)?.filter((t) => t > now - windowMs) ?? [];
  hits.push(now);
  hitMap.set(bucket, hits);

  if (hits.length > limit && process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } }
    );
  }
  return null;
}
