import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/api-utils";
import { disconnectGoogle, getConnectionSummary } from "@/modules/calendar/connection-queries";
import { getCalendarConfig } from "@/modules/calendar/runtime";

// GET /api/calendar/connection — whether Google push is available, and this user's connection
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getCalendarConfig().enabled) return NextResponse.json({ available: false });
  const connection = await getConnectionSummary(session.user.id);
  return NextResponse.json({ available: true, connection });
}

// DELETE /api/calendar/connection — disconnect: revoke at Google, delete the connection
export async function DELETE(request: NextRequest) {
  const limited = rateLimit(request, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await disconnectGoogle(session.user.id, getCalendarConfig());
  return NextResponse.json({ connection: null });
}
