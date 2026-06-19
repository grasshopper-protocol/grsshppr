"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BookSessionForm({ mentorId }: { mentorId: string }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const startsAt = new Date(`${date}T${time}`);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000); // ponytail: 30-min default — make configurable later

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentorId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setError(typeof error === "string" ? error : "Something went wrong");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  // Minimum date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium">Request a session</h2>
      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">30-minute session</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Requesting…" : "Send request"}
      </Button>
    </form>
  );
}
