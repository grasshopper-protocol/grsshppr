"use client";

import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";

export function SessionNotes({ sessionId }: { sessionId: string }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/notes`)
      .then((r) => r.json())
      .then(({ note }) => {
        if (note) setContent(note.content);
        setLoaded(true);
      });
  }, [sessionId]);

  // ponytail: debounced autosave — 1s after last keystroke. No draft complexity.
  const save = useCallback(
    async (text: string) => {
      setSaving(true);
      await fetch(`/api/sessions/${sessionId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      setSaving(false);
    },
    [sessionId]
  );

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => save(content), 1000);
    return () => clearTimeout(timer);
  }, [content, loaded, save]);

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Loading notes…</p>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Shared session notes</h2>
        <span className="text-xs text-muted-foreground">
          {saving ? "Saving…" : "Saved"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        These notes are visible to both mentor and mentee.
      </p>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write shared notes for this session… (Markdown supported)"
        rows={8}
        maxLength={10000}
        className="font-mono text-sm"
      />
    </div>
  );
}
