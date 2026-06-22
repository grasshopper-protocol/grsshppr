"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X } from "@phosphor-icons/react";

export function PendingRequestRow({
  session,
  partner,
}: {
  session: { id: string; startsAt: Date; endsAt: Date };
  partner: { id: string; name: string; image: string | null };
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

  async function respond(status: "confirmed" | "cancelled") {
    setLoading(status);
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
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
      <div className="flex gap-1.5">
        <Button
          size="sm"
          onClick={() => respond("confirmed")}
          disabled={loading !== null}
          className="h-8 gap-1"
        >
          <Check size={14} weight="bold" />
          Confirm
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => respond("cancelled")}
          disabled={loading !== null}
          className="h-8 gap-1 text-muted-foreground"
        >
          <X size={14} />
          Decline
        </Button>
      </div>
    </div>
  );
}
