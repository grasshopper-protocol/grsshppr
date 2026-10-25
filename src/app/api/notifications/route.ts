import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getBellNotificationsForUser, getUnreadNotificationCount, markAllAsRead } from "@/core/notifications/queries";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    getBellNotificationsForUser(session.user.id),
    getUnreadNotificationCount(session.user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

// POST /api/notifications — mark all as read
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await markAllAsRead(session.user.id);
  return NextResponse.json({ ok: true });
}
