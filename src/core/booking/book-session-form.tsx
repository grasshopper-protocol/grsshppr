"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

type Slot = { startsAt: string; endsAt: string };

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function BookSessionForm({ mentorId }: { mentorId: string }) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    const weekStr = weekStart.toISOString().split("T")[0];
    fetch(`/api/availability/${mentorId}?week=${weekStr}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoading(false));
  }, [mentorId, weekStart]);

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

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    if (d >= getMonday(new Date())) setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  // Group slots by day
  const slotsByDay = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const day = slot.startsAt.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {});

  const isCurrentWeek = weekStart.getTime() === getMonday(new Date()).getTime();

  return (
    <div className="mt-8 space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Pick a time</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={prevWeek}
            disabled={isCurrentWeek}
          >
            <CaretLeft size={14} />
          </Button>
          <span className="text-xs text-muted-foreground">
            {weekStart.toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={nextWeek}>
            <CaretRight size={14} />
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading slots…</p>}

      {!loading && slots.length === 0 && (
        <p className="text-sm text-muted-foreground">No available slots this week.</p>
      )}

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
