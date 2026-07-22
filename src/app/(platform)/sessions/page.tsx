import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionsForUser } from "@/core/booking/queries";
import { getProfileByUserId } from "@/core/profiles/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Session } from "@/types";

const statusColors: Record<string, string> = {
  requested: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default async function SessionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const [allSessions, profile] = await Promise.all([
    getSessionsForUser(session.user.id),
    getProfileByUserId(session.user.id),
  ]);

  if (!profile) redirect("/welcome");

  const now = new Date();
  const upcoming = allSessions.filter(
    (s) =>
      (s.session.status === "requested" || s.session.status === "confirmed") &&
      new Date(s.session.startsAt) >= now
  );
  const past = allSessions.filter(
    (s) =>
      s.session.status === "completed" ||
      s.session.status === "cancelled" ||
      (s.session.status === "confirmed" && new Date(s.session.startsAt) < now)
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
      <p className="mt-1 text-muted-foreground">All your sessions, past and present.</p>

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Upcoming
          </h2>
          <div className="mt-3 space-y-2">
            {upcoming.map(({ session: s, partner, role }) => (
              <SessionRow key={s.id} session={s} partner={partner} role={role} />
            ))}
          </div>
        </section>
      )}

      <section className={upcoming.length > 0 ? "mt-10" : "mt-8"}>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          History
        </h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No past sessions yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {past.map(({ session: s, partner, role, mentorSlug }) => (
              <SessionRow key={s.id} session={s} partner={partner} role={role} mentorSlug={mentorSlug} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SessionRow({
  session: s,
  partner,
  role,
  mentorSlug,
}: {
  session: Session; 
  partner: { id: string; name: string; image: string | null };
  role: string;
  mentorSlug?: string;
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
    year: "numeric",
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
      {s.status === "completed" && mentorSlug && (
        <Link
          href={`/mentor/${mentorSlug}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-medium text-foreground hover:underline underline-offset-4"
        >
          Rebook
        </Link>
      )}
    </Link>
  );
}
