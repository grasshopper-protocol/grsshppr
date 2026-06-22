import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getGoalById, updateGoal, deleteGoal } from "@/modules/goals/queries";
import { getMentorsForMentee } from "@/core/booking/queries";
import { z } from "zod";
import { safeJson, uuidParam } from "@/lib/api-utils";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
  mentorId: z.string().uuid().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
});

type Params = Promise<{ id: string }>;

async function authorizeGoal(goalId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const goal = await getGoalById(goalId);
  if (!goal || goal.menteeId !== session.user.id) return null;

  return { session, goal };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const ctx = await authorizeGoal(id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: body, error } = await safeJson(request);
  if (error) return error;

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Validate mentorId if being set (not null/undefined)
  if (parsed.data.mentorId) {
    const mentors = await getMentorsForMentee(ctx.session.user.id);
    if (!mentors.some((m) => m.mentorId === parsed.data.mentorId)) {
      return NextResponse.json({ error: "Invalid mentor" }, { status: 400 });
    }
  }

  const updated = await updateGoal(id, parsed.data);
  return NextResponse.json({ goal: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const ctx = await authorizeGoal(id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteGoal(id);
  return NextResponse.json({ ok: true });
}
