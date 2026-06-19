import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionById } from "@/core/booking/queries";
import { getNoteBySessionId, upsertNote } from "@/modules/notes/queries";
import { z } from "zod";
import { safeJson, uuidParam } from "@/lib/api-utils";

type Params = Promise<{ id: string }>;

async function authorize(sessionId: string) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return null;

  const session = await getSessionById(sessionId);
  if (!session) return null;

  if (session.mentorId !== authSession.user.id && session.menteeId !== authSession.user.id) {
    return null;
  }

  return authSession;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  if (!(await authorize(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const note = await getNoteBySessionId(id);
  return NextResponse.json({ note });
}

const noteSchema = z.object({
  content: z.string().max(10000),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  if (!(await authorize(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error } = await safeJson(request);
  if (error) return error;

  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const note = await upsertNote(id, parsed.data.content);
  return NextResponse.json({ note });
}
