import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";

// ponytail: called by Vercel cron (vercel.json) or manually
// Auto-completes confirmed sessions whose endsAt is >24h in the past
export async function POST(request: Request) {
  // Simple shared secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const updated = await db
    .update(sessions)
    .set({ status: "completed" })
    .where(and(eq(sessions.status, "confirmed"), lt(sessions.endsAt, cutoff)))
    .returning({ id: sessions.id });

  return NextResponse.json({ completed: updated.length });
}
