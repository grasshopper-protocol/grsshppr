import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { drainCalendar } from "@/modules/calendar/drain";

export const maxDuration = 60;

// GET /api/calendar/drain — daily backstop for calendar sync the inline drain
// didn't finish (RFC-0012 §5). Vercel cron invokes GET; fails closed without CRON_SECRET.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Stop starting work well inside the function's time limit; the rest waits a day.
  return NextResponse.json(await drainCalendar({ maxRuns: 20, budgetMs: 45_000 }));
}
