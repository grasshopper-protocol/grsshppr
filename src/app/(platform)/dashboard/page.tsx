import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getSessionsForUser, getSessionsNeedingFeedback, getMentorsForMentee, getLastSessionByMentor } from "@/core/booking/queries";
import { getProfileByUserId } from "@/core/profiles/queries";
import { getMentorStats, getMenteeStats, getNextUpcomingSession, getWeekSessions, getRepeatMenteeRate } from "@/core/dashboard/queries";
import { db } from "@/lib/db";
import { availability } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GoalsList } from "@/modules/goals/goals-list";
import { PendingRequestRow } from "@/core/booking/pending-request-row";
import { MenteeRequestRow } from "@/core/booking/mentee-request-row";
import { FeedbackPrompt } from "@/core/booking/feedback-prompt";
import { ProfileNudge } from "@/components/profile-nudge";
import { StatCard } from "@/core/dashboard/stat-card";
import { NextSession, NextSessionEmpty } from "@/core/dashboard/next-session";
import { CalendarDots, PencilSimple, ArrowRight, Fire } from "@phosphor-icons/react/dist/ssr";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const [profile, windows, needsFeedback, nextSession] = await Promise.all([
    getProfileByUserId(session.user.id),
    db.select().from(availability).where(eq(availability.userId, session.user.id)),
    getSessionsNeedingFeedback(session.user.id),
    getNextUpcomingSession(session.user.id),
  ]);

  if (!profile) redirect("/welcome");

  const isMentor = profile.role === "mentor";

  if (isMentor) {
    return (
      <MentorDashboard
        userId={session.user.id}
        profile={profile}
        windows={windows}
        needsFeedback={needsFeedback}
        nextSession={nextSession}
      />
    );
  }

  return (
    <MenteeDashboard
      userId={session.user.id}
      profile={profile}
      windows={windows}
      needsFeedback={needsFeedback}
      nextSession={nextSession}
    />
  );
}

async function MentorDashboard({
  userId,
  profile,
  windows,
  needsFeedback,
  nextSession,
}: {
  userId: string;
  profile: { role: "mentor" | "mentee"; bio: string | null; headline: string | null; expertise: string[] | null };
  windows: { dayOfWeek: number; startTime: string; endTime: string }[];
  needsFeedback: Awaited<ReturnType<typeof getSessionsNeedingFeedback>>;
  nextSession: Awaited<ReturnType<typeof getNextUpcomingSession>>;
}) {
  const [stats, allSessions, weekSessions, repeatRate, menteeStats, myMentors, lastSessionMap] = await Promise.all([
    getMentorStats(userId),
    getSessionsForUser(userId),
    getWeekSessions(userId),
    getRepeatMenteeRate(userId),
    getMenteeStats(userId),
    getMentorsForMentee(userId),
    getLastSessionByMentor(userId),
  ]);

  const pendingRequests = allSessions.filter((s) => s.session.status === "requested" && s.role === "mentor");
  const outboundRequests = allSessions.filter((s) => s.session.status === "requested" && s.role === "mentee");
  const hasLearningActivity = menteeStats.sessionsAttended > 0 || menteeStats.goalsTotal > 0 || outboundRequests.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Your mentoring at a glance.</p>

      <ProfileNudge
        role={profile.role}
        hasBio={!!profile.bio}
        hasHeadline={!!profile.headline}
        hasExpertise={!!profile.expertise?.length}
        hasAvailability={windows.length > 0}
      />

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="sessions" label="Sessions" value={stats.completedSessions} />
        <StatCard icon="mentees" label="Mentees" value={stats.uniqueMentees} />
        <StatCard
          icon="rating"
          label="Rating"
          value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
          subtext={stats.avgRating ? "out of 5" : "no reviews yet"}
        />
        <StatCard icon="goals" label="Goals helped" value={stats.goalsHelped} />
      </div>

      {/* Next Up */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Next up</h2>
        <div className="mt-3">
          {nextSession ? (
            <NextSession session={nextSession.session} partner={nextSession.partner} isMentor />
          ) : (
            <NextSessionEmpty isMentor />
          )}
        </div>
      </section>

      {/* Feedback prompts */}
      {needsFeedback.length > 0 && (
        <section className="mt-6 space-y-2">
          {needsFeedback.map(({ session: s, partner }) => (
            <FeedbackPrompt key={s.id} session={s} partner={partner} />
          ))}
        </section>
      )}

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Pending requests
          </h2>
          <div className="mt-3 space-y-2">
            {pendingRequests.map(({ session: s, partner }) => (
              <PendingRequestRow key={s.id} session={s} partner={partner} />
            ))}
          </div>
        </section>
      )}

      {/* This Week */}
      {weekSessions.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              This week
            </h2>
            <Link
              href="/sessions"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              All sessions <ArrowRight size={12} />
            </Link>
          </div>
          <div className="mt-3 grid gap-1.5">
            {weekSessions.map((s) => {
              const start = new Date(s.startsAt);
              return (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-foreground/20"
                >
                  <span className="w-8 font-medium">
                    {start.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="text-muted-foreground">
                    {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Impact */}
      {(stats.goalsHelped > 0 || repeatRate !== null) && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Impact</h2>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            {stats.goalsHelped > 0 && (
              <p>{stats.goalsHelped} mentee goal{stats.goalsHelped > 1 ? "s" : ""} achieved with your help</p>
            )}
            {repeatRate !== null && repeatRate > 0 && (
              <p>{repeatRate}% of your mentees book again</p>
            )}
          </div>
        </section>
      )}

      {/* Availability */}
      <AvailabilityWidget windows={windows} />

      {/* Your Learning (mentee side) */}
      {hasLearningActivity && (
        <>
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="text-lg font-semibold tracking-tight">Your learning</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Sessions where you&apos;re the mentee.</p>

            {menteeStats.goalsTotal > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  icon="goals"
                  label="Goals"
                  value={`${menteeStats.goalsCompleted}/${menteeStats.goalsTotal}`}
                  subtext="completed"
                />
                <StatCard icon="sessions" label="Attended" value={menteeStats.sessionsAttended} />
                <StatCard
                  icon="streak"
                  label="Streak"
                  value={menteeStats.weekStreak > 0 ? `${menteeStats.weekStreak}w` : "—"}
                  subtext={menteeStats.weekStreak > 0 ? "consecutive weeks" : ""}
                />
              </div>
            )}
          </section>

          <section className="mt-6">
            <GoalsList />
          </section>

          {outboundRequests.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Your requests
              </h2>
              <div className="mt-3 space-y-2">
                {outboundRequests.map(({ session: s, partner, mentorSlug }) => (
                  <MenteeRequestRow key={s.id} session={s} partner={partner} mentorSlug={mentorSlug} />
                ))}
              </div>
            </section>
          )}

          {myMentors.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Your mentors
              </h2>
              <div className="mt-3 space-y-2">
                {myMentors.map((m) => {
                  const lastDate = lastSessionMap[m.mentorId];
                  const daysSince = lastDate
                    ? Math.round((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
                    : null;
                  const initials = m.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div key={m.mentorId} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.image ?? undefined} alt={m.name} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{m.name}</p>
                        {daysSince !== null && (
                          <p className="text-xs text-muted-foreground">
                            Last session {daysSince === 0 ? "today" : `${daysSince}d ago`}
                          </p>
                        )}
                      </div>
                      {m.slug && (
                        <Link
                          href={`/mentor/${m.slug}`}
                          className="text-xs font-medium text-foreground hover:underline underline-offset-4"
                        >
                          Book again
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

async function MenteeDashboard({
  userId,
  profile,
  windows,
  needsFeedback,
  nextSession,
}: {
  userId: string;
  profile: { role: "mentor" | "mentee"; bio: string | null; headline: string | null; expertise: string[] | null };
  windows: { dayOfWeek: number; startTime: string; endTime: string }[];
  needsFeedback: Awaited<ReturnType<typeof getSessionsNeedingFeedback>>;
  nextSession: Awaited<ReturnType<typeof getNextUpcomingSession>>;
}) {
  const [stats, allSessions, mentors, lastSessionMap] = await Promise.all([
    getMenteeStats(userId),
    getSessionsForUser(userId),
    getMentorsForMentee(userId),
    getLastSessionByMentor(userId),
  ]);

  const outboundRequests = allSessions.filter(
    (s) => s.session.status === "requested" && s.role === "mentee"
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Your growth journey.</p>

      <ProfileNudge
        role={profile.role}
        hasBio={!!profile.bio}
        hasHeadline={!!profile.headline}
        hasExpertise={!!profile.expertise?.length}
        hasAvailability={windows.length > 0}
      />

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon="goals"
          label="Goals"
          value={`${stats.goalsCompleted}/${stats.goalsTotal}`}
          subtext="completed"
        />
        <StatCard icon="sessions" label="Sessions" value={stats.sessionsAttended} />
        <StatCard
          icon="streak"
          label="Streak"
          value={stats.weekStreak > 0 ? `${stats.weekStreak}w` : "—"}
          subtext={stats.weekStreak > 0 ? "consecutive weeks" : "book to start"}
        />
        <StatCard icon="mentors" label="Mentors" value={stats.uniqueMentors} />
      </div>

      {/* Next Up */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Next up</h2>
        <div className="mt-3">
          {nextSession ? (
            <NextSession session={nextSession.session} partner={nextSession.partner} isMentor={false} />
          ) : (
            <NextSessionEmpty isMentor={false} />
          )}
        </div>
      </section>

      {/* Feedback prompts */}
      {needsFeedback.length > 0 && (
        <section className="mt-6 space-y-2">
          {needsFeedback.map(({ session: s, partner }) => (
            <FeedbackPrompt key={s.id} session={s} partner={partner} />
          ))}
        </section>
      )}

      {/* Goals */}
      <section className="mt-8">
        <GoalsList />
      </section>

      {/* Outbound requests */}
      {outboundRequests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Your requests
          </h2>
          <div className="mt-3 space-y-2">
            {outboundRequests.map(({ session: s, partner, mentorSlug }) => (
              <MenteeRequestRow key={s.id} session={s} partner={partner} mentorSlug={mentorSlug} />
            ))}
          </div>
        </section>
      )}

      {/* Streak nudge */}
      {stats.weekStreak === 0 && stats.sessionsAttended > 0 && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3">
          <Fire size={16} className="text-amber-500" />
          <p className="text-sm text-muted-foreground">
            Your streak ended. <Link href="/explore" className="text-foreground underline-offset-4 hover:underline">Book a session</Link> to start a new one.
          </p>
        </div>
      )}

      {/* Your Mentors */}
      {mentors.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Your mentors
            </h2>
            <Link
              href="/sessions"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              All sessions <ArrowRight size={12} />
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {mentors.map((m) => {
              const lastDate = lastSessionMap[m.mentorId];
              const daysSince = lastDate
                ? Math.round((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
                : null;
              const initials = m.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div key={m.mentorId} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={m.image ?? undefined} alt={m.name} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{m.name}</p>
                    {daysSince !== null && (
                      <p className="text-xs text-muted-foreground">
                        Last session {daysSince === 0 ? "today" : `${daysSince}d ago`}
                      </p>
                    )}
                  </div>
                  {m.slug && (
                    <Link
                      href={`/mentor/${m.slug}`}
                      className="text-xs font-medium text-foreground hover:underline underline-offset-4"
                    >
                      Book again
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AvailabilityWidget({
  windows,
}: {
  windows: { dayOfWeek: number; startTime: string; endTime: string }[];
}) {
  const byDay = DAYS.map((day, i) => ({
    day,
    slots: windows.filter((w) => w.dayOfWeek === i),
  })).filter((d) => d.slots.length > 0);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Your availability
        </h2>
        <Link
          href="/settings/availability"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <PencilSimple size={12} />
          Edit
        </Link>
      </div>
      {byDay.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center">
          <CalendarDots size={24} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No availability set.{" "}
            <Link href="/settings/availability" className="text-foreground underline-offset-4 hover:underline">
              Configure your schedule
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-3 grid gap-1.5">
          {byDay.map(({ day, slots }) => (
            <div key={day} className="flex items-baseline gap-3 text-sm">
              <span className="w-8 font-medium text-foreground">{day}</span>
              <span className="text-muted-foreground">
                {slots.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AvailabilityWidget({
  windows,
}: {
  windows: { dayOfWeek: number; startTime: string; endTime: string }[];
}) {
  const byDay = DAYS.map((day, i) => ({
    day,
    slots: windows.filter((w) => w.dayOfWeek === i),
  })).filter((d) => d.slots.length > 0);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Your availability
        </h2>
        <Link
          href="/settings/availability"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <PencilSimple size={12} />
          Edit
        </Link>
      </div>
      {byDay.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center">
          <CalendarDots size={24} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No availability set.{" "}
            <Link href="/settings/availability" className="text-foreground underline-offset-4 hover:underline">
              Configure your schedule
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-3 grid gap-1.5">
          {byDay.map(({ day, slots }) => (
            <div key={day} className="flex items-baseline gap-3 text-sm">
              <span className="w-8 font-medium text-foreground">{day}</span>
              <span className="text-muted-foreground">
                {slots.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
