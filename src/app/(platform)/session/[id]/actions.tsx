"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarPlus, ArrowClockwise } from "@phosphor-icons/react";

export function SessionActions({
  sessionId,
  status,
  isMentor,
  mentorProfileId,
}: {
  sessionId: string;
  status: string;
  isMentor: boolean;
  mentorProfileId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="mt-6 space-y-3">
      {(status === "confirmed" || status === "completed") && (
        <a
          href={`/api/sessions/${sessionId}/ical`}
          download
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <CalendarPlus size={16} />
          Add to calendar
        </a>
      )}

      {status === "completed" && !isMentor && mentorProfileId && (
        <Link
          href={`/mentor/${mentorProfileId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline underline-offset-4"
        >
          <ArrowClockwise size={16} />
          Book again
        </Link>
      )}

      {status !== "completed" && status !== "cancelled" && (
        <div className="flex gap-2">
          {status === "requested" && isMentor && (
            <Button onClick={() => updateStatus("confirmed")} disabled={loading}>
              Confirm session
            </Button>
          )}
          {status === "confirmed" && isMentor && (
            <Button onClick={() => updateStatus("completed")} disabled={loading}>
              Mark completed
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => updateStatus("cancelled")}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
