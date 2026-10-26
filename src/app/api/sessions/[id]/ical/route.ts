import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionWithUsers } from "@/core/booking/queries";
import { buildCalendar } from "@/lib/ical";
import { sessionEventText } from "@/lib/calendar/event-text";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://grsshppr.org";

type Params = Promise<{ id: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await getSessionWithUsers(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { session: s, mentor, mentee } = data;

  if (s.mentorId !== session.user.id && s.menteeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (s.status !== "confirmed" && s.status !== "completed") {
    return NextResponse.json({ error: "Session not confirmed" }, { status: 400 });
  }

  const isMentor = s.mentorId === session.user.id;
  const partnerName = isMentor ? mentee.name : mentor.name;
  // Filename goes in a header: keep it to safe characters (names are free text).
  const partnerFirstName =
    partnerName.split(" ")[0].toLowerCase().normalize("NFKD").replace(/[^a-z0-9-]/g, "") || "session";

  const startDate = new Date(s.startsAt);
  const endDate = new Date(s.endsAt);
  const sessionUrl = `${BASE_URL}/session/${s.id}`;
  // Same wording as the feed and Google events (RFC-0012): the partner's name,
  // the video link, the session page — never goals, which stay private (ADR-0015).
  const text = sessionEventText({
    partnerName,
    role: isMentor ? "mentor" : "mentee",
    sessionUrl,
    videoUrl: s.status === "confirmed" ? s.videoUrl : null,
  });

  const dateStr = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `grsshppr-${partnerFirstName}-${dateStr}.ics`;

  // Shared builder (RFC-0012 §1): escapes every text value and folds lines.
  const ics = buildCalendar(
    {
      prodId: "-//Grsshppr//Session//EN",
      events: [
        {
          uid: `session-${s.id}@grsshppr.org`,
          start: startDate,
          end: endDate,
          ...text,
          url: sessionUrl,
          alarmMinutesBefore: 15,
        },
      ],
    },
    new Date()
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
