import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionWithUsers } from "@/core/booking/queries";
import { getProfileByUserId } from "@/core/profiles/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { SessionActions } from "./actions";
import { SessionNotes } from "@/modules/notes/session-notes";

type Params = Promise<{ id: string }>;

export default async function SessionPage({
  params,
}: {
  params: Params;
}) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) redirect("/sign-in");

  const { id } = await params;
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
            {start.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Time</span>
          <span>
            {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            {" – "}
            {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <Badge variant="secondary" className="text-xs">
            {session.status}
          </Badge>
        </div>
      </div>

      <SessionActions
        sessionId={session.id}
        status={session.status}
        isMentor={isMentor}
        mentorProfileId={isMentor ? undefined : (await getProfileByUserId(session.mentorId))?.id}
        cancelReason={session.cancelReason}
      />

      <div className="mt-8">
        <SessionNotes sessionId={session.id} />
      </div>
    </div>
  );
}
