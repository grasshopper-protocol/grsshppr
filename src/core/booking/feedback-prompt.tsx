"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "@phosphor-icons/react";
import type { Session } from "@/types";

export function FeedbackPrompt({
  session,
  partner,
}: {
  session: Session;
  partner: { name: string; image: string | null };
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function submit() {
    if (rating === 0) return;
    setLoading(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, rating, comment: comment || undefined }),
    });
    if (res.ok) {
      router.refresh();
    }
    setLoading(false);
  }

  const dateStr = new Date(session.endsAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
      <p className="text-sm font-medium">
        How was your session with {partner.name} on {dateStr}?
      </p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star
              size={24}
              weight={(hovered || rating) >= n ? "fill" : "regular"}
              className={(hovered || rating) >= n ? "text-amber-500" : "text-muted-foreground"}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any thoughts? (optional)"
            rows={2}
            maxLength={1000}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={loading}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Submit"}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
