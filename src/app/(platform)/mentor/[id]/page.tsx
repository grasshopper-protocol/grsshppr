import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfileWithUser } from "@/core/profiles/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { BookSessionForm } from "@/core/booking/book-session-form";

type Params = Promise<{ id: string }>;

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

  const { profile, user } = data;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-lg">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back to explore
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.image ?? undefined} alt={user.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            {profile.experienceYears != null && (
              <p className="text-sm text-muted-foreground">
                {profile.experienceYears} yr
                {profile.experienceYears !== 1 ? "s" : ""} experience
              </p>
            )}
            {profile.available && (
              <Badge
                variant="secondary"
                className="gap-1 text-xs text-emerald-600 dark:text-emerald-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Available
              </Badge>
            )}
          </div>
        </div>
      </div>

      {profile.bio && (
        <p className="mt-6 text-muted-foreground">{profile.bio}</p>
      )}

      {profile.expertise && profile.expertise.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-foreground">Expertise</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.expertise.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {profile.available && (
        <BookSessionForm mentorId={user.id} />
      )}
    </div>
  );
}
