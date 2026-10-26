import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/api-utils";
import { feedUrls } from "@/lib/calendar-feed";
import { createOrRotateFeed, deleteFeed, getFeedStatus } from "@/modules/calendar/queries";

const baseUrl = () => process.env.BETTER_AUTH_URL ?? "https://www.grsshppr.org";

// GET /api/calendar/feed — whether the signed-in user has a feed (the URL is never shown again)
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getFeedStatus(session.user.id));
}

// POST /api/calendar/feed — create the feed, or replace its link; returns the URLs once
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token, createdAt } = await createOrRotateFeed(session.user.id);
  return NextResponse.json({ enabled: true, createdAt, urls: feedUrls(baseUrl(), token) }, { status: 201 });
}

// DELETE /api/calendar/feed — turn the feed off; the link stops working
export async function DELETE(request: NextRequest) {
  const limited = rateLimit(request, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteFeed(session.user.id);
  return NextResponse.json({ enabled: false });
}
