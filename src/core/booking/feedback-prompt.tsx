"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "@phosphor-icons/react";
import type { Session } from "@/types";

const RATINGS = [1, 2, 3, 4, 5];

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
  // "sent": we just recorded it; "already": it was recorded earlier (e.g. another tab).
  const [sent, setSent] = useState<false | "sent" | "already">(false);
  const [error, setError] = useState<string | null>(null);
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const thanksRef = useRef<HTMLParagraphElement>(null);

  // Move keyboard focus to the confirmation so it's announced and not lost.
  useEffect(() => {
    if (sent) thanksRef.current?.focus();
  }, [sent]);

  if (dismissed) return null;

  async function submit() {
    if (rating === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, rating, comment: comment || undefined }),
      });
      // 409: already submitted (e.g. from another tab) — the outcome the user wanted.
      if (res.ok) {
        setSent("sent");
      } else if (res.status === 409) {
        setSent("already");
      } else if (res.status < 500) {
        const body = await res.json().catch(() => null);
        setError(typeof body?.error === "string" ? body.error : "Couldn't send your feedback.");
      } else {
        setError("Couldn't send your feedback. Please try again.");
      }
    } catch {
      setError("Couldn't send your feedback. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // WAI-ARIA radio group: Right/Down next, Left/Up previous, Home/End first/last.
  function onStarKey(e: React.KeyboardEvent, n: number) {
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? Math.min(n + 1, 5)
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? Math.max(n - 1, 1)
          : e.key === "Home"
            ? 1
            : e.key === "End"
              ? 5
              : null;
    if (next === null) return;
    e.preventDefault();
    setRating(next);
    starRefs.current[next - 1]?.focus();
  }

  const dateStr = new Date(session.endsAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const shown = hovered || rating;
  const questionId = `feedback-q-${session.id}`;

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <p ref={thanksRef} tabIndex={-1} role="status" className="text-sm font-medium outline-none">
          {sent === "already"
            ? `You've already rated your session with ${partner.name}. Thanks!`
            : `Thanks — you rated your session with ${partner.name} ${rating} out of 5.`}
        </p>
        <button
          onClick={() => {
            setDismissed(true);
            router.refresh();
          }}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
      <p id={questionId} className="text-sm font-medium">
        How was your session with {partner.name} on {dateStr}?
      </p>
      <div
        className="mt-3 flex gap-1"
        role="radiogroup"
        aria-labelledby={questionId}
        onMouseLeave={() => setHovered(0)}
      >
        {RATINGS.map((n) => (
          <button
            key={n}
            ref={(el) => {
              starRefs.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            // Roving tabindex: one tab stop for the whole group.
            tabIndex={rating === n || (rating === 0 && n === 1) ? 0 : -1}
            onMouseEnter={() => setHovered(n)}
            onFocus={() => setHovered(0)}
            onClick={() => setRating(n)}
            onKeyDown={(e) => onStarKey(e, n)}
            className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              size={24}
              weight={shown >= n ? "fill" : "regular"}
              className={shown >= n ? "text-amber-500" : "text-muted-foreground"}
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
            aria-label="Comment (optional)"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {rating > 0 && (
          <button
            onClick={submit}
            disabled={loading}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Submit"}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
