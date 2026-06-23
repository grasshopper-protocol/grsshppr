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

export function rateLimit(
  request: NextRequest,
  { limit = 10, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): NextResponse | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const now = Date.now();
  const hits = hitMap.get(ip)?.filter((t) => t > now - windowMs) ?? [];
  hits.push(now);
  hitMap.set(ip, hits);

  if (hits.length > limit) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } }
    );
  }
  return null;
}
