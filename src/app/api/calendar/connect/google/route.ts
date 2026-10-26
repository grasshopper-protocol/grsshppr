import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/api-utils";
import { authorizeUrl, pkceChallenge, randomToken, signState, STATE_TTL_MS } from "@/lib/calendar/oauth";
import { getCalendarConfig, googleRedirectUri, OAUTH_STATE_COOKIE, OAUTH_STATE_COOKIE_PATH } from "@/modules/calendar/runtime";

// GET /api/calendar/connect/google — start "Connect Google Calendar" (RFC-0012 §2)
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const config = getCalendarConfig();
  if (!config.enabled) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.redirect(new URL("/sign-in?callbackUrl=/settings", request.url));

  const state = randomToken();
  const verifier = randomToken();
  const cookie = signState(
    { state, verifier, userId: session.user.id, exp: Date.now() + STATE_TTL_MS },
    process.env.BETTER_AUTH_SECRET!
  );
  const response = NextResponse.redirect(
    authorizeUrl({ clientId: config.clientId, redirectUri: googleRedirectUri(), state, codeChallenge: pkceChallenge(verifier) })
  );
  response.cookies.set(OAUTH_STATE_COOKIE, cookie, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax", // sent on Google's top-level redirect back to us
    path: OAUTH_STATE_COOKIE_PATH,
    maxAge: STATE_TTL_MS / 1000,
  });
  return response;
}
