import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionWithUsers } from "@/core/booking/queries";
import { db } from "@/lib/db";
import { sessionGoals, goals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildCalendar } from "@/lib/ical";

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

  // Fetch linked goals
  const linkedGoals = await db
    .select({ title: goals.title })
    .from(sessionGoals)
    .innerJoin(goals, eq(goals.id, sessionGoals.goalId))
    .where(eq(sessionGoals.sessionId, s.id));

  const startDate = new Date(s.startsAt);
  const endDate = new Date(s.endsAt);
  // Build description
  const descLines: string[] = [];
  if (isMentor) {
    descLines.push(`Mentoring session with ${mentee.name}`);
  } else {
    descLines.push(`Session with ${mentor.name}`);
  }
  descLines.push("");
  descLines.push(
    // The event itself uses exact instants; this description line can't know the reader's zone, so it says UTC (#160).
    `Date: ${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })} at ${startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} — ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })}`
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
          summary,
          description: descLines.join("\n"),
          url: `${BASE_URL}/session/${s.id}`,
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
