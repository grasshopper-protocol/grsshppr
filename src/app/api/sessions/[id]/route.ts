import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionById, updateSessionStatus } from "@/core/booking/queries";
import { z } from "zod";
import { safeJson, uuidParam } from "@/lib/api-utils";

const statusSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled"]),
});

// Valid state transitions
const validTransitions: Record<string, string[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

type Params = Promise<{ id: string }>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = await getSessionById(id);
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (existing.mentorId !== session.user.id && existing.menteeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error } = await safeJson(request);
  if (error) return error;

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Enforce state machine
  const allowed = validTransitions[existing.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      { error: `Cannot transition from "${existing.status}" to "${parsed.data.status}"` },
      { status: 400 }
    );
  }

  // Only mentors can confirm or complete
  if (
    (parsed.data.status === "confirmed" || parsed.data.status === "completed") &&
    existing.mentorId !== session.user.id
  ) {
    return NextResponse.json({ error: "Only the mentor can confirm or complete sessions" }, { status: 403 });
  }

  const updated = await updateSessionStatus(id, parsed.data.status);
  return NextResponse.json({ session: updated });
}
