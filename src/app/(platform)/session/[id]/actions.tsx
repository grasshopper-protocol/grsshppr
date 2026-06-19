"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SessionActions({
  sessionId,
  status,
  isMentor,
}: {
  sessionId: string;
  status: string;
  isMentor: boolean;
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

  if (status === "completed" || status === "cancelled") return null;

  return (
    <div className="mt-6 flex gap-2">
      {status === "requested" && isMentor && (
        <Button onClick={() => updateStatus("confirmed")} disabled={loading}>
          Confirm session
        </Button>
      )}
      {status === "confirmed" && (
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
  );
}
