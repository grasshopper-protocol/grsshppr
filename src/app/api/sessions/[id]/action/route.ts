import { NextRequest, NextResponse, after } from "next/server";
import { verifyEmailAction } from "@/lib/email-tokens";
import { getSessionById, updateSessionStatus } from "@/core/booking/queries";
import { runTransitionEffects } from "@/core/booking/transition-effects";

type Params = Promise<{ id: string }>;

// GET /api/sessions/[id]/action?token=...&action=confirm|cancel
// One-click email action — no login required, validates signed token
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = verifyEmailAction(token);
  if (!payload || payload.sessionId !== id) {
    return new NextResponse("Invalid or expired link. Please log in to manage this session.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const session = await getSessionById(id);
  if (!session) {
    return new NextResponse("Session not found.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  // Idempotent: if already in target state, just redirect
  const targetStatus = payload.action === "confirm" ? "confirmed" : "cancelled";
  if (session.status === targetStatus) {
    const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/session/${id}`);
  }

  // Validate transition
  const validTransitions: Record<string, string[]> = {
    requested: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  if (!validTransitions[session.status]?.includes(targetStatus)) {
    return new NextResponse(
      `This session is already "${session.status}" and cannot be ${targetStatus}.`,
      { status: 400, headers: { "Content-Type": "text/plain" } }
    );
  }

  await updateSessionStatus(id, targetStatus);
  // Same emails and notifications as the in-app buttons (#140). These links
  // are only sent to the mentor, so the mentor is the one acting.
  after(() => runTransitionEffects({ session, to: targetStatus, actorId: session.mentorId }));

  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${baseUrl}/session/${id}`);
}
