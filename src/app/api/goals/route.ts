import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getGoalsForUser, createGoal } from "@/modules/goals/queries";
import { z } from "zod";
import { safeJson } from "@/lib/api-utils";

const goalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await getGoalsForUser(session.user.id);
  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await safeJson(request);
  if (error) return error;

  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const goal = await createGoal({
    menteeId: session.user.id,
    ...parsed.data,
  });

  return NextResponse.json({ goal }, { status: 201 });
}
