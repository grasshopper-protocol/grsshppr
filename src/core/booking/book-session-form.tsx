"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Slot = { startsAt: string; endsAt: string };
type Goal = { id: string; title: string; status: string };

import { toDateStr } from "@/lib/booking-dates";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function BookSessionForm({ mentorId }: { mentorId: string }) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [daysLoaded, setDaysLoaded] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  const DAYS_PER_PAGE = 7;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/availability/${mentorId}?days=${DAYS_PER_PAGE}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setHasMore(data.hasMore ?? false);
        setDaysLoaded(DAYS_PER_PAGE);
      })
      .finally(() => setLoading(false));

    // Fetch mentee's active goals
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data) => {
        const active = (data.goals ?? []).filter((g: Goal) => g.status === "active");
        setGoals(active);
      })
      .catch(() => {});
  }, [mentorId]);

  function loadMore() {
    setLoadingMore(true);
    // Cursor is the date after the last loaded day range
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() + daysLoaded);
    const afterStr = toDateStr(afterDate);
    fetch(`/api/availability/${mentorId}?days=${DAYS_PER_PAGE}&after=${afterStr}`)
      .then((r) => r.json())
      .then((data) => {
        const newSlots = data.slots ?? [];
        setSlots((prev) => [...prev, ...newSlots]);
        setHasMore(data.hasMore ?? false);
        setDaysLoaded((d) => d + DAYS_PER_PAGE);
      })
      .finally(() => setLoadingMore(false));
  }

  async function handleBook() {
    if (!selected) return;
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentorId,
        startsAt: selected.startsAt,
        endsAt: selected.endsAt,
        ...(selectedGoalIds.length > 0 && { goalIds: selectedGoalIds }),
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setError(typeof error === "string" ? error : "Something went wrong");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  // Group slots by local date
  const slotsByDay = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const day = toDateStr(new Date(slot.startsAt));
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {});

  return (
    <div className="mt-8 space-y-4 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium">Pick a time</h2>

      {loading && <p className="text-sm text-muted-foreground">Loading slots…</p>}

      {!loading && slots.length === 0 && (
        <p className="text-sm text-muted-foreground">No available slots in the next 4 weeks.</p>
      )}

      <div className="max-h-64 space-y-3 overflow-y-auto">
      {!loading && Object.entries(slotsByDay).map(([day, daySlots]) => (
        <div key={day}>
          <p className="text-xs font-medium text-muted-foreground">
            {formatDayLabel(daySlots[0].startsAt)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {daySlots.map((slot) => (
              <Button
                key={slot.startsAt}
                type="button"
                variant={selected?.startsAt === slot.startsAt ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setSelected(slot)}
              >
                {formatTime(slot.startsAt)}
              </Button>
            ))}
          </div>
        </div>
      ))}

      </div>

      {!loading && hasMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          disabled={loadingMore}
          onClick={loadMore}
        >
          {loadingMore ? "Loading…" : "Show next week"}
        </Button>
      )}

      {goals.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            What would you like help with? <span className="text-muted-foreground/60">(optional)</span>
          </p>
          {goals.map((goal) => (
            <label key={goal.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-border"
                checked={selectedGoalIds.includes(goal.id)}
                onChange={(e) => {
                  setSelectedGoalIds((prev) =>
                    e.target.checked
                      ? [...prev, goal.id]
                      : prev.filter((id) => id !== goal.id)
                  );
                }}
              />
              {goal.title}
            </label>
          ))}
        </div>
      )}

      {goals.length === 0 && !loading && slots.length > 0 && (
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          <a href="/dashboard" className="underline underline-offset-4 hover:text-foreground">Add a goal</a> to help your mentor prepare.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleBook}
        disabled={!selected || submitting}
        className="w-full"
      >
        {submitting ? "Requesting…" : selected ? `Request ${formatTime(selected.startsAt)}` : "Select a slot"}
      </Button>
    </div>
  );
}
