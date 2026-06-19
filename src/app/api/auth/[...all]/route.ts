import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { rateLimit } from "@/lib/rate-limit";

const { GET: _GET, POST: _POST } = toNextJsHandler(auth);

export { _GET as GET };

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const path = new URL(request.url).pathname;

  // Rate limit auth endpoints: 10 requests per minute per IP
  if (path.includes("/sign-in") || path.includes("/sign-up")) {
    const { ok } = rateLimit(`auth:${ip}`, 10, 60_000);
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }
  }

  return _POST(request);
}
