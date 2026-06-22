import Link from "next/link";
import { getMentors } from "@/core/profiles/queries";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExploreFilters } from "./filters";

type SearchParams = Promise<{
  search?: string;
  expertise?: string;
  available?: string;
}>;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const mentors = await getMentors({
    search: params.search?.slice(0, 200),
    expertise: params.expertise?.slice(0, 100),
    available: params.available === "true",
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Explore mentors
          </h1>
          <p className="mt-1 text-muted-foreground">
            {mentors.length} mentor{mentors.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <ExploreFilters />
      </div>

      {mentors.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            No mentors match your filters. Try broadening your search.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {mentors.map(({ profile, user }) => {
            const initials = user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <Link
                key={profile.id}
                href={`/mentor/${profile.id}`}
                className="group rounded-lg border border-border p-4 transition-colors hover:border-foreground/20"
              >
                <div className="flex gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage
                      src={user.image ?? undefined}
                      alt={user.name}
                    />
                    <AvatarFallback className="text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground group-hover:underline">
                      {user.name}
                    </p>
                    {profile.headline ? (
                      <p className="text-sm text-muted-foreground">
                        {profile.headline}
                      </p>
                    ) : profile.experienceYears != null ? (
                      <p className="text-sm text-muted-foreground">
                        {profile.experienceYears} yr
                        {profile.experienceYears !== 1 ? "s" : ""} experience
                      </p>
                    ) : null}
                  </div>
                  {profile.available && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  )}
                </div>
                {profile.bio && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {profile.bio}
                  </p>
                )}
                {profile.expertise && profile.expertise.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {profile.expertise.slice(0, 5).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {profile.expertise.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{profile.expertise.length - 5}
                      </Badge>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
