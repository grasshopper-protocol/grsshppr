import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getProfileWithUser } from "@/core/profiles/queries";
import { getCompletedSessionCount, getActiveSessionBetween } from "@/core/booking/queries";
import { getCompletedGoalsForMentor } from "@/modules/goals/queries";
import { getGoalsForUser } from "@/modules/goals/queries";
import { auth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  LinkedinLogo,
  GithubLogo,
  Globe,
  CalendarCheck,
  Clock,
  Trophy,
  SignIn,
} from "@phosphor-icons/react/dist/ssr";
import { BookSessionForm } from "@/core/booking/book-session-form";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getProfileWithUser(id);
  if (!data || data.profile.role !== "mentor") return {};
  const { profile, user } = data;
  const description = profile.headline ?? `Mentor on Grsshppr`;
  return {
    title: `${user.name} — Grsshppr`,
    description,
    openGraph: {
      title: user.name,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: user.name,
      description,
    },
  };
}

function getLinkIcon(url: string) {
  try {
    const host = new URL(url).hostname;
    if (host.includes("linkedin.com")) return <LinkedinLogo size={16} />;
    if (host.includes("github.com")) return <GithubLogo size={16} />;
    return <Globe size={16} />;
  } catch {
    return <Globe size={16} />;
  }
}

function getLinkLabel(url: string) {
  try {
    const host = new URL(url).hostname;
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("github.com")) return "GitHub";
    return host.replace("www.", "");
  } catch {
    return url;
  }
}

export default async function MentorProfilePage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const data = await getProfileWithUser(id);

  if (!data || data.profile.role !== "mentor") {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const isLoggedIn = !!session;

  const { profile, user } = data;
  const sessionsCompleted = await getCompletedSessionCount(profile.userId);
  const mentorGoals = await getCompletedGoalsForMentor(profile.userId);
  const activeSession = isLoggedIn
    ? await getActiveSessionBetween(session.user.id, profile.userId)
    : null;

  // Goal-mentor matching: find mentee goals that overlap with mentor expertise
  let matchingGoals: { id: string; title: string }[] = [];
  if (isLoggedIn && profile.expertise?.length) {
    const menteeGoals = await getGoalsForUser(session.user.id);
    const activeGoals = menteeGoals.filter((g) => g.status === "active");
    const expertiseLower = profile.expertise.map((e) => e.toLowerCase());
    matchingGoals = activeGoals.filter((g) => {
      const words = g.title.toLowerCase().split(/\s+/);
      return words.some((w) => expertiseLower.some((e) => e.includes(w) || w.includes(e)));
    });
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <Link
        href="/explore"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back to explore
      </Link>

      {activeSession && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm">
          <span className="flex-1">
            You have a <strong>{activeSession.status}</strong> session on{" "}
            <strong>
              {new Date(activeSession.startsAt).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </strong>{" "}
            at{" "}
            {new Date(activeSession.startsAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          <Link
            href={`/session/${activeSession.id}`}
            className="text-xs font-medium text-foreground hover:underline underline-offset-4"
          >
            View
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="min-w-0">
          {/* Identity — hero treatment */}
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5">
            <Avatar className="h-28 w-28 shrink-0 ring-4 ring-background shadow-lg sm:h-32 sm:w-32">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="text-3xl font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div className="mt-1">
              <h1 className="text-3xl font-semibold tracking-tight">
                {user.name}
              </h1>
              {profile.headline && (
                <p className="mt-1 text-base text-foreground/80">
                  {profile.headline}
                </p>
              )}
              {profile.experienceYears != null && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {profile.experienceYears} year
                  {profile.experienceYears !== 1 ? "s" : ""} experience
                </p>
              )}
            </div>
          </div>

          {/* Expertise */}
          {profile.expertise && profile.expertise.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {profile.expertise.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Links */}
          {profile.links && profile.links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {profile.links.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {getLinkIcon(url)}
                  {getLinkLabel(url)}
                </a>
              ))}
            </div>
          )}

          {/* About */}
          {profile.bio && (
            <div className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                About
              </h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/90">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-8 flex gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarCheck size={16} />
              <span>
                {sessionsCompleted} session
                {sessionsCompleted !== 1 ? "s" : ""} completed
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={16} />
              <span>Member since {memberSince}</span>
            </div>
          </div>

          {/* Impact — goals mentees achieved with this mentor */}
          {mentorGoals.length > 0 && (
            <div className="mt-8">
              <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Trophy size={14} />
                Impact
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {mentorGoals.length} mentee goal{mentorGoals.length !== 1 ? "s" : ""} achieved
              </p>
              <div className="mt-3 space-y-2">
                {mentorGoals.map((g) => (
                  <div key={g.id} className="flex items-start gap-2 rounded-md border border-border px-3 py-2">
                    <Badge variant="secondary" className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Trophy size={10} />
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm">{g.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.menteeName} &middot; {new Date(g.updatedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking — inline on mobile */}
          <div className="mt-10 lg:hidden">
            {matchingGoals.length > 0 && (
              <p className="mb-3 text-sm text-muted-foreground">
                Based on your goals, {user.name} may help with:{" "}
                <span className="font-medium text-foreground">
                  {matchingGoals.map((g) => g.title).join(", ")}
                </span>
              </p>
            )}
            {!isLoggedIn ? (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <SignIn size={16} />
                Sign in to book a session
              </Link>
            ) : profile.available ? (
              <BookSessionForm mentorId={user.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Not taking new mentees right now.
              </p>
            )}
          </div>
        </div>

        {/* Right column — sticky booking sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <div className="rounded-lg border p-5">
              <div className="mb-4 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    profile.available
                      ? "bg-green-500"
                      : "bg-muted-foreground/40"
                  }`}
                />
                <span className="text-sm font-medium">
                  {profile.available
                    ? "Available for sessions"
                    : "Not taking new mentees"}
                </span>
              </div>
              {!isLoggedIn ? (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <SignIn size={16} />
                  Sign in to book a session
                </Link>
              ) : (
                <>
                  {matchingGoals.length > 0 && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      May help with:{" "}
                      <span className="font-medium text-foreground">
                        {matchingGoals.map((g) => g.title).join(", ")}
                      </span>
                    </p>
                  )}
                  {profile.available && <BookSessionForm mentorId={user.id} />}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
