import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionWithUsers } from "@/core/booking/queries";

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

  // Only participants can download
  if (s.mentorId !== session.user.id && s.menteeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only confirmed or completed sessions get calendar invites
  if (s.status !== "confirmed" && s.status !== "completed") {
    return NextResponse.json({ error: "Session not confirmed" }, { status: 400 });
  }

  const isMentor = s.mentorId === session.user.id;
  const partnerName = isMentor ? mentee.name : mentor.name;

  const start = formatICalDate(new Date(s.startsAt));
  const end = formatICalDate(new Date(s.endsAt));
  const now = formatICalDate(new Date());

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Grsshppr//Session//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:session-${s.id}@grsshppr.org`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Mentoring session with ${partnerName}`,
    `DESCRIPTION:${isMentor ? "Mentoring" : "Learning"} session on Grsshppr`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="session-${s.id}.ics"`,
    },
  });
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
