import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

// ponytail: Vercel cron (vercel.json) invokes GET; POST kept for manual runs
// Auto-completes confirmed sessions whose endsAt is >24h in the past
async function autoComplete(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
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

export { autoComplete as GET, autoComplete as POST };
