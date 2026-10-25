import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { issueFeedbackPrompts } from "@/core/booking/feedback-prompts";

// The prompt loop stops claiming at PROMPT_RUN_BUDGET_MS, well inside this.
export const maxDuration = 60;

// ponytail: Vercel cron invokes GET daily (POST kept for manual runs). Prompts
// every participant of a recently completed session who hasn't been prompted
// or left feedback yet — once each, however often this runs (ADR-0017).
async function nudge(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await issueFeedbackPrompts();
  // One counts-only line per run (no personal data), searchable with `vercel logs`.
  console.info(`[feedback-prompts] ${JSON.stringify(result)}`);

  // Fail the run visibly when any email didn't go out — Vercel's cron view only shows status.
  const status = result.retrying > 0 || result.emailLost > 0 ? 500 : 200;
  return NextResponse.json({ nudgesSent: result.emailed, ...result }, { status });
}

export { nudge as GET, nudge as POST };
