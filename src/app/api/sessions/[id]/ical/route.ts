import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionWithUsers } from "@/core/booking/queries";
import { db } from "@/lib/db";
import { sessionGoals, goals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  const partnerFirstName = partnerName.split(" ")[0].toLowerCase();

  // Fetch linked goals
  const linkedGoals = await db
    .select({ title: goals.title })
    .from(sessionGoals)
    .innerJoin(goals, eq(goals.id, sessionGoals.goalId))
    .where(eq(sessionGoals.sessionId, s.id));

  const startDate = new Date(s.startsAt);
  const endDate = new Date(s.endsAt);
  const start = formatICalDate(startDate);
  const end = formatICalDate(endDate);
  const now = formatICalDate(new Date());

  // Build description
  const descLines: string[] = [];
  if (isMentor) {
    descLines.push(`Mentoring session with ${mentee.name}`);
  } else {
    descLines.push(`Session with ${mentor.name}`);
  }
  descLines.push("");
  descLines.push(
    `Date: ${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
  );
  if (linkedGoals.length > 0) {
    descLines.push("");
    descLines.push("Goals:");
    for (const g of linkedGoals) {
      descLines.push(`• ${g.title}`);
    }
  }
  descLines.push("");
  descLines.push(`Session link: ${BASE_URL}/session/${s.id}`);

  const summary = isMentor
    ? `Mentor: ${mentee.name}`
    : `Session with ${mentor.name}`;

  const description = escapeICalText(descLines.join("\\n"));
  const dateStr = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `grsshppr-${partnerFirstName}-${dateStr}.ics`;

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
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `URL:${BASE_URL}/session/${s.id}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Session starting in 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICalText(text: string): string {
  return text.replace(/[,;]/g, (m) => `\\${m}`);
}
