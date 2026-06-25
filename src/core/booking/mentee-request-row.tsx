"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowsClockwise } from "@phosphor-icons/react";

export function MenteeRequestRow({
  session,
  partner,
  mentorSlug,
}: {
  session: { id: string; startsAt: Date; endsAt: Date; status: string };
  partner: { id: string; name: string; image: string | null };
  mentorSlug?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const initials = partner.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const start = new Date(session.startsAt);
  const dateStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  async function handleCancel() {
    setLoading("cancel");
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", cancelReason: "Cancelled by mentee" }),
    });
    router.refresh();
  }

  async function handleReschedule() {
    setLoading("reschedule");
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", cancelReason: "Rescheduled" }),
    });
    if (mentorSlug) {
      router.push(`/mentor/${mentorSlug}`);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Link href={`/session/${session.id}`}>
        <Avatar className="h-11 w-11">
          <AvatarImage src={partner.image ?? undefined} alt={partner.name} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{partner.name}</p>
        <p className="text-xs text-muted-foreground">
          {dateStr} at {timeStr}
        </p>
      </div>
      <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
        Awaiting confirmation
      </Badge>
      <div className="flex gap-1">
        {mentorSlug && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs"
            disabled={loading !== null}
            onClick={handleReschedule}
          >
            <ArrowsClockwise size={14} />
            Reschedule
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
          disabled={loading !== null}
          onClick={handleCancel}
        >
          <X size={14} />
          Cancel
        </Button>
      </div>
    </div>
  );
}
