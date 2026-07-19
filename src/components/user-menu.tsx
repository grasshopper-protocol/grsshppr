"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOut, Gear, CalendarDots, UserCircle } from "@phosphor-icons/react";

export function UserMenu() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isMentor, setIsMentor] = useState(false);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => {
        if (profile?.role === "mentor") setIsMentor(true);
        if (profile?.slug) setProfileSlug(profile.slug);
      })
      .catch(() => {});
  }, [session?.user]);

  if (!session?.user) return null;

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-ring focus-visible:ring-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? ""} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {profileSlug ? (
          <DropdownMenuItem onClick={() => router.push(`/mentor/${profileSlug}`)}>
            <div>
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </DropdownMenuItem>
        ) : (
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{session.user.name}</p>
            <p className="text-xs text-muted-foreground">{session.user.email}</p>
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <UserCircle size={16} />
          Edit profile
        </DropdownMenuItem>
        {isMentor && (
          <DropdownMenuItem onClick={() => router.push("/settings/availability")}>
            <CalendarDots size={16} />
            Availability
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Gear size={16} />
          Account
        </DropdownMenuItem>
        {isMentor && (
          <DropdownMenuItem onClick={() => router.push("/settings/availability")}>
            <CalendarDots size={16} />
            Availability
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await authClient.signOut();
            router.push("/");
          }}
        >
          <SignOut size={16} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
