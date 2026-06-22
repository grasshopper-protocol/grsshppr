import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getSessionsForUser } from "@/core/booking/queries";
import { getProfileByUserId } from "@/core/profiles/queries";
import { db } from "@/lib/db";
import { availability } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GoalsList } from "@/modules/goals/goals-list";
import { CalendarDots, PencilSimple } from "@phosphor-icons/react/dist/ssr";

const statusColors: Record<string, string> = {
  requested: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const [allSessions, profile, windows] = await Promise.all([
    getSessionsForUser(session.user.id),
    getProfileByUserId(session.user.id),
    db.select().from(availability).where(eq(availability.userId, session.user.id)),
  ]);

  // No profile yet → send to onboarding
  if (!profile) redirect("/welcome");

  const isMentor = profile.role === "mentor";

  const now = new Date();
  const upcoming = allSessions.filter(
    (s) => s.session.status !== "cancelled" && new Date(s.session.startsAt) >= now
  );
  const past = allSessions.filter(
    (s) => s.session.status === "cancelled" || new Date(s.session.startsAt) < now
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Your sessions at a glance.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No upcoming sessions.{" "}
            <Link href="/explore" className="text-foreground underline-offset-4 hover:underline">
              Find a mentor
            </Link>
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {upcoming.map(({ session: s, partner, role }) => (
              <SessionRow key={s.id} session={s} partner={partner} role={role} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Past
          </h2>
          <div className="mt-3 space-y-2">
            {past.map(({ session: s, partner, role }) => (
              <SessionRow key={s.id} session={s} partner={partner} role={role} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <GoalsList />
      </section>

      {isMentor && <AvailabilityWidget windows={windows} />}
    </div>
  );
}

function SessionRow({
  session: s,
  partner,
  role,
}: {
  session: { id: string; status: string; startsAt: Date; endsAt: Date };
  partner: { id: string; name: string; image: string | null };
  role: string;
}) {
  const initials = partner.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const start = new Date(s.startsAt);
  const dateStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Link
      href={`/session/${s.id}`}
      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-foreground/20"
    >
      <Avatar className="h-11 w-11">
        <AvatarImage src={partner.image ?? undefined} alt={partner.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{partner.name}</p>
        <p className="text-xs text-muted-foreground">
          {dateStr} at {timeStr} · {role === "mentor" ? "You're mentoring" : "You're learning"}
        </p>
      </div>
      <Badge variant="secondary" className={`text-xs ${statusColors[s.status] ?? ""}`}>
        {s.status}
      </Badge>
    </Link>
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
