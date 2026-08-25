import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDots } from "@phosphor-icons/react/dist/ssr";
import type { Session } from "@/types";

export function NextSession({
  session,
  partner,
  isMentor,
}: {
  session: Session;
  partner: { id: string; name: string; image: string | null };
  isMentor: boolean;
}) {
  const start = new Date(session.startsAt);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60_000);

  let timeUntil: string;
  if (diffMins < 0) {
    timeUntil = "happening now";
  } else if (diffMins < 60) {
    timeUntil = `in ${diffMins}m`;
  } else if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    timeUntil = mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
  } else {
    const days = Math.floor(diffMins / 1440);
    timeUntil = days === 1 ? "tomorrow" : `in ${days} days`;
  }

  const dateStr = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const initials = partner.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-lg border border-border p-4 transition-colors hover:border-foreground/20">
      <Link
        href={`/session/${session.id}`}
        className="flex items-center gap-4"
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={partner.image ?? undefined} alt={partner.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {isMentor ? `Mentoring ${partner.name}` : `Session with ${partner.name}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {dateStr} at {timeStr}
          </p>
        </div>
        <p className="text-sm font-medium text-foreground">{timeUntil}</p>
      </Link>
      <div className="mt-2 flex justify-end">
        <a
          href={`/api/sessions/${session.id}/ical`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <CalendarDots size={12} />
          Add to calendar
        </a>
      </div>
    </div>
  );
}

export function NextSessionEmpty({ isMentor }: { isMentor: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-center">
      <CalendarDots size={24} className="mx-auto text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">
        {isMentor ? (
          "No upcoming sessions. Mentees will book when they're ready."
        ) : (
          <>
            No upcoming sessions.{" "}
            <Link href="/explore" className="text-foreground underline-offset-4 hover:underline">
              Find a mentor
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
