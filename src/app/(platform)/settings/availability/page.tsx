"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "@phosphor-icons/react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

type Window = { dayOfWeek: number; startTime: string; endTime: string };

export default function AvailabilityPage() {
  const router = useRouter();
  const [windows, setWindows] = useState<Window[]>([]);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [sessionDuration, setSessionDuration] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data) => {
        setWindows(data.windows ?? []);
        if (data.timezone) setTimezone(data.timezone);
        if (data.sessionDuration) setSessionDuration(data.sessionDuration);
      })
      .finally(() => setLoading(false));
  }, []);

  function addWindow(dayOfWeek: number) {
    setWindows([...windows, { dayOfWeek, startTime: "09:00", endTime: "10:00" }]);
  }

  function removeWindow(index: number) {
    setWindows(windows.filter((_, i) => i !== index));
  }

  function updateWindow(index: number, field: keyof Window, value: string | number | null) {
    if (value == null) return;
    setWindows(windows.map((w, i) => (i === index ? { ...w, [field]: value } : w)));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone, sessionDuration, windows }),
    });
    if (res.ok) router.push("/settings");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
      <p className="mt-1 text-muted-foreground">
        Set your weekly schedule. Mentees can only book within these windows.
      </p>

      <div className="mt-6 flex gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Timezone</label>
          <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Intl.supportedValuesOf("timeZone").map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32 space-y-1">
          <label className="text-sm font-medium">Duration</label>
          <Select value={String(sessionDuration)} onValueChange={(v) => v && setSessionDuration(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="45">45 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {DAYS.map((day, dayIndex) => {
          const dayWindows = windows
            .map((w, i) => ({ ...w, _index: i }))
            .filter((w) => w.dayOfWeek === dayIndex);

          return (
            <div key={day} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{day}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addWindow(dayIndex)}
                >
                  <Plus size={14} />
                  Add
                </Button>
              </div>

              {dayWindows.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Unavailable</p>
              )}

              {dayWindows.map((w) => (
                <div key={w._index} className="mt-2 flex items-center gap-2">
                  <Select
                    value={w.startTime}
                    onValueChange={(v) => updateWindow(w._index, "startTime", v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={w.endTime}
                    onValueChange={(v) => updateWindow(w._index, "endTime", v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWindow(w._index)}
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save availability"}
        </Button>
      </div>
    </div>
  );
}
