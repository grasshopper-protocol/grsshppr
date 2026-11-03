import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionWithUsers, getMyFeedbackRating } from "@/core/booking/queries";
import { getProfileByUserId } from "@/core/profiles/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SessionActions } from "./actions";
import { SessionNotes } from "@/modules/notes/session-notes";
import { FeedbackPrompt } from "@/core/booking/feedback-prompt";
import { feedbackState } from "@/lib/feedback-prompts";
import { LocalTime } from "@/components/local-time";
import { isTimeToJoin } from "@/lib/booking-dates";
import { sessionsInGoogleCalendar, shouldOfferCalendarConnect } from "@/modules/calendar/connection-queries";

type Params = Promise<{ id: string }>;

export default async function SessionPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const authSession = await auth.api.getSession({ headers: await headers() });
  // Expired session: come back here after signing in (#161)
  if (!authSession) redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/session/${id}`)}`);

  const data = await getSessionWithUsers(id);
  if (!data) notFound();

  const { session, mentor, mentee } = data;
  const userId = authSession.user.id;

  // Only participants can view
  if (session.mentorId !== userId && session.menteeId !== userId) {
    notFound();
  }

  const isMentor = session.mentorId === userId;
  const partner = isMentor ? mentee : mentor;
  const initials = partner.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  const now = new Date();
  const [inGoogleCalendar, canConnectCalendar] = await Promise.all([
    sessionsInGoogleCalendar(userId, [session.id]).then((s) => s.has(session.id)),
    shouldOfferCalendarConnect(authSession.user),
  ]);

  const myRating = session.status === "completed" ? await getMyFeedbackRating(session.id, userId) : null;
  const feedback = feedbackState({
    status: session.status,
    endsAt: end,
    partnerId: partner.id,
    hasGiven: myRating !== null,
    now,
  });

  return (
    <div className="max-w-lg">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back to dashboard
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={partner.image ?? undefined} alt={partner.name} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Session with {partner.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isMentor ? "You're mentoring" : "You're learning"}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3 rounded-lg border border-border p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Date</span>
          <span>
            <LocalTime value={start} options={{ weekday: "long", month: "long", day: "numeric", }} />
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Time</span>
          <span>
            <LocalTime value={start} options={{ hour: "numeric", minute: "2-digit" }} />
            {" – "}
            <LocalTime value={end} options={{ hour: "numeric", minute: "2-digit" }} />
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <Badge variant="secondary" className="text-xs">
            {session.status}
          </Badge>
        </div>
      </div>

      {/* The Meet link created on the host's Google Calendar event (RFC-0012 §5) */}
      {/* Primary from 15 minutes before the start: it's the one thing to do then */}
      {session.status === "confirmed" && session.videoUrl?.startsWith("https://") && end > now && (
        <a
          href={session.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: isTimeToJoin(start, end, now) ? "default" : "outline", className: "mt-4" }))}
        >
          <VideoCamera size={16} />
          Join video call
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}

      {/* Where the feedback email and bell prompt land (ADR-0018) */}
      {feedback === "open" && (
        <div className="mt-6">
          <FeedbackPrompt session={session} partner={partner} />
        </div>
      )}
      {feedback === "given" && (
        <p className="mt-6 text-sm text-muted-foreground">
          You rated this session {myRating} out of 5. Thanks for your feedback.
        </p>
      )}
      {feedback === "closed" && (
        <p className="mt-6 text-sm text-muted-foreground">Feedback for this session has closed.</p>
      )}

      <SessionActions
        sessionId={session.id}
        status={session.status}
        isMentor={isMentor}
        mentorSlug={isMentor ? undefined : (await getProfileByUserId(session.mentorId))?.slug}
        cancelReason={session.cancelReason}
        hasEnded={end <= now}
        inGoogleCalendar={inGoogleCalendar}
        canConnectCalendar={canConnectCalendar}
      />

      <div className="mt-8">
        <SessionNotes sessionId={session.id} />
      </div>
    </div>
  );
}
