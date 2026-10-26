import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionById, updateSessionStatus } from "@/core/booking/queries";
import { z } from "zod";
import { safeJson, uuidParam, rateLimit } from "@/lib/api-utils";
import { runTransitionEffects } from "@/core/booking/transition-effects";
import { enqueueSessionSync } from "@/modules/calendar/sync-queries";
import { db } from "@/lib/db";

const statusSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled"]),
  cancelReason: z.string().max(200).optional(),
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
  const limited = rateLimit(request, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

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

  // A session can only be completed once it has ended — feedback opens then (ADR-0017)
  if (parsed.data.status === "completed" && existing.endsAt > new Date()) {
    return NextResponse.json({ error: "You can mark a session complete once it has ended" }, { status: 400 });
  }

  // Status change and calendar sync queue commit together (RFC-0012 §5)
  const updated = await db.transaction(async (tx) => {
    const row = await updateSessionStatus(id, parsed.data.status, parsed.data.cancelReason, tx);
    await enqueueSessionSync(tx, existing);
    return row;
  });

  // Emails and notifications — shared with the one-click email route (#140)
  after(() => runTransitionEffects({ session: existing, to: parsed.data.status, actorId: session.user.id }));

  return NextResponse.json({ session: updated });
}
