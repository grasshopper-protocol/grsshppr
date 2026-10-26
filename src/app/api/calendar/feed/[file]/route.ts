import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/api-utils";
import { buildCalendar } from "@/lib/ical";
import { feedEvents, hashFeedToken, parseFeedFile } from "@/lib/calendar-feed";
import { getFeedOwner, getFeedSessions } from "@/modules/calendar/queries";

type Params = Promise<{ file: string }>;

const notFound = () =>
  new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain", "X-Robots-Tag": "noindex" } });

// GET /api/calendar/feed/<token>.ics — the private subscription feed (RFC-0012 §1).
// No session: calendar apps can't sign in, so the unguessable token is the credential.
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const token = parseFeedFile((await params).file);
  // Malformed: limit per IP so the endpoint can't be hammered.
  if (!token) return rateLimit(request, { limit: 30, windowMs: 60_000 }) ?? notFound();

  // Calendar providers poll from shared IPs, so limit per feed, not per IP.
  const limited = rateLimit(request, { limit: 30, windowMs: 60_000, key: `feed:${hashFeedToken(token)}` });
  if (limited) return limited;

  const userId = await getFeedOwner(token);
  if (!userId) return notFound();

  const now = new Date();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "https://www.grsshppr.org";
  const ics = buildCalendar(
    { name: "Grsshppr sessions", events: feedEvents(await getFeedSessions(userId, now), baseUrl) },
    now
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
}
