import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionById, updateSessionStatus } from "@/core/booking/queries";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled"]),
});

type Params = Promise<{ id: string }>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getSessionById(id);
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Only mentor or mentee in this session can update it
  if (existing.mentorId !== session.user.id && existing.menteeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Only mentors can confirm
  if (parsed.data.status === "confirmed" && existing.mentorId !== session.user.id) {
    return NextResponse.json({ error: "Only the mentor can confirm" }, { status: 403 });
  }

  const updated = await updateSessionStatus(id, parsed.data.status);
  return NextResponse.json({ session: updated });
}
