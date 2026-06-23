"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarPlus, ArrowClockwise, ArrowsClockwise } from "@phosphor-icons/react";

export function SessionActions({
  sessionId,
  status,
  isMentor,
  mentorProfileId,
  cancelReason,
}: {
  sessionId: string;
  status: string;
  isMentor: boolean;
  mentorProfileId?: string;
  cancelReason?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [reason, setReason] = useState("");

  async function updateStatus(newStatus: string, extras?: Record<string, string>) {
    setLoading(true);
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...extras }),
    });
    router.refresh();
    setLoading(false);
  }

  async function handleCancel() {
    await updateStatus("cancelled", reason ? { cancelReason: reason } : undefined);
    setShowCancelForm(false);
  }

  async function handleReschedule() {
    setLoading(true);
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", cancelReason: "Rescheduled" }),
    });
    // Redirect to mentor profile to pick a new time
    if (mentorProfileId) {
      router.push(`/mentor/${mentorProfileId}`);
    } else {
      router.refresh();
    }
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

      {status === "cancelled" && cancelReason && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Cancellation reason:</span> {cancelReason}
        </p>
      )}

      {status !== "completed" && status !== "cancelled" && (
        <div className="space-y-2">
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
            {status === "confirmed" && mentorProfileId && (
              <Button variant="outline" onClick={handleReschedule} disabled={loading}>
                <ArrowsClockwise size={14} className="mr-1" />
                Reschedule
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowCancelForm(true)}
              disabled={loading || showCancelForm}
            >
              Cancel
            </Button>
          </div>

          {showCancelForm && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium">Cancel this session?</p>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional, max 200 chars)"
                maxLength={200}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleCancel} disabled={loading}>
                  {loading ? "Cancelling…" : "Confirm cancel"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCancelForm(false)}>
                  Keep session
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
