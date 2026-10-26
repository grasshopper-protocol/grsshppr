import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/api-utils";
import { canConnectCalendar } from "@/lib/calendar/config";
import { hasCalendarScope, idTokenClaims, verifyState } from "@/lib/calendar/oauth";
import { exchangeCode } from "@/modules/calendar/google-client";
import { backfillUpcoming, saveConnection } from "@/modules/calendar/connection-queries";
import { drainCalendar } from "@/modules/calendar/drain";
import { getCalendarConfig, googleRedirectUri, OAUTH_STATE_COOKIE, OAUTH_STATE_COOKIE_PATH } from "@/modules/calendar/runtime";

// GET /api/calendar/callback/google — Google sends the user back here (RFC-0012 §2, §9)
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const config = getCalendarConfig();
  if (!config.enabled) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const done = (outcome: "connected" | "denied" | "permission" | "failed") => {
    const response = NextResponse.redirect(new URL(`/settings?calendar=${outcome}#calendar`, request.url));
    response.cookies.set(OAUTH_STATE_COOKIE, "", { path: OAUTH_STATE_COOKIE_PATH, maxAge: 0 });
    return response;
  };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !canConnectCalendar(config, session.user.email)) return done("failed");
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return done("denied"); // the user cancelled on Google's screen

  // Same user, same attempt, within 10 minutes, untampered — or nothing.
  const verifier = verifyState(request.cookies.get(OAUTH_STATE_COOKIE)?.value, {
    appSecret: process.env.BETTER_AUTH_SECRET,
    state: params.get("state"),
    userId: session.user.id,
    now: Date.now(),
  });
  const code = params.get("code");
  if (!verifier || !code) return done("failed");

  try {
    const tokens = await exchangeCode({
      code,
      verifier,
      redirectUri: googleRedirectUri(),
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
    // Google lets people untick scopes; without calendar access there's nothing to connect.
    if (!hasCalendarScope(tokens.scope) || !tokens.refresh_token) return done("permission");
    const claims = idTokenClaims(tokens.id_token, config.clientId);
    if (!claims) return done("failed");

    const connectionId = await saveConnection({
      userId: session.user.id,
      tokens: { ...tokens, refresh_token: tokens.refresh_token, scope: tokens.scope! },
      claims,
      config,
    });
    await backfillUpcoming(session.user.id);
    after(() => drainCalendar({ connectionId })); // upcoming sessions appear straight away
    return done("connected");
  } catch {
    console.error("[calendar] Google connect failed during code exchange");
    return done("failed");
  }
}
