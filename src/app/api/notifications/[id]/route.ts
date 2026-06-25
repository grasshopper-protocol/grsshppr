import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { markAsRead } from "@/core/notifications/queries";

type Params = Promise<{ id: string }>;

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await markAsRead(id, session.user.id);
  return NextResponse.json({ ok: true });
}
