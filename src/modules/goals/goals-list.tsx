"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type {Mentor} from "@/types";
import {
  Check,
  Pause,
  Play,
  Trash,
  PencilSimple,
  UserCircle,
  X,
  CalendarDots,
  KeyReturn,
} from "@phosphor-icons/react";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "paused";
  mentorId: string | null;
  targetDate: string | null;
};


const statusIcon: Record<string, React.ReactNode> = {
  active: <Play size={12} />,
  paused: <Pause size={12} />,
  completed: <Check size={12} />,
};

const statusColor: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  paused: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function GoalsList() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [lastSessionByMentor, setLastSessionByMentor] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then(({ goals, mentors, lastSessionByMentor }) => {
        setGoals(goals ?? []);
        setMentors(mentors ?? []);
        setLastSessionByMentor(lastSessionByMentor ?? {});
      });
  }, []);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });

    if (res.ok) {
      const { goal } = await res.json();
      setGoals([...goals, goal]);
      setNewTitle("");
    }
    setAdding(false);
  }

  async function patchGoal(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { goal } = await res.json();
      setGoals(goals.map((g) => (g.id === id ? goal : g)));
    }
  }

  async function removeGoal(id: string) {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals(goals.filter((g) => g.id !== id));
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? "");
  }

  async function saveEdit(id: string) {
    await patchGoal(id, { title: editTitle, description: editDescription || undefined });
    setEditingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Goals
        </h2>
        <span className="text-xs text-muted-foreground">
          {goals.filter((g) => g.status === "completed").length}/{goals.length} done
        </span>
      </div>

      {goals.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-md border border-border px-3 py-2"
            >
              {editingId === goal.id ? (
                /* Inline edit mode */
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={200}
                    className="h-8"
                    autoFocus
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    maxLength={1000}
                    className="h-8"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => saveEdit(goal.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`gap-1 text-xs shrink-0 ${statusColor[goal.status]}`}
                  >
                    {statusIcon[goal.status]}
                    {goal.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm ${goal.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                    >
                      {goal.title}
                    </span>
                    {goal.description && (
                      <p className="text-xs text-muted-foreground truncate">{goal.description}</p>
                    )}
                    {goal.mentorId && (
                      <MentorMomentum
                        mentorId={goal.mentorId}
                        mentors={mentors}
                        lastSessionByMentor={lastSessionByMentor}
                        goalStatus={goal.status}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Status actions */}
                    {goal.status === "active" && (
                      <>
                        <button onClick={() => patchGoal(goal.id, { status: "completed" })} className="text-muted-foreground hover:text-emerald-600" title="Mark complete">
                          <Check size={14} />
                        </button>
                        <button onClick={() => patchGoal(goal.id, { status: "paused" })} className="text-muted-foreground hover:text-yellow-600" title="Pause">
                          <Pause size={14} />
                        </button>
                      </>
                    )}
                    {goal.status === "paused" && (
                      <button onClick={() => patchGoal(goal.id, { status: "active" })} className="text-muted-foreground hover:text-blue-600" title="Resume">
                        <Play size={14} />
                      </button>
                    )}
                    {goal.status === "completed" && (
                      <button onClick={() => patchGoal(goal.id, { status: "active" })} className="text-muted-foreground hover:text-blue-600" title="Reopen">
                        <Play size={14} />
                      </button>
                    )}
                    {/* Mentor link */}
                    {mentors.length > 0 && (
                      <select
                        value={goal.mentorId ?? ""}
                        onChange={(e) => patchGoal(goal.id, { mentorId: e.target.value || null })}
                        className="h-6 text-xs bg-transparent border-0 text-muted-foreground cursor-pointer max-w-[80px]"
                        title="Link mentor"
                      >
                        <option value="">No mentor</option>
                        {mentors.map((m) => (
                          <option key={m.mentorId} value={m.mentorId}>{m.name}</option>
                        ))}
                      </select>
                    )}
                    <button onClick={() => startEdit(goal)} className="text-muted-foreground hover:text-foreground" title="Edit">
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => removeGoal(goal.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addGoal} className="mt-3 flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a goal…"
          maxLength={200}
          className="h-9"
        />
        <Button type="submit" size="sm" variant="ghost" disabled={adding} title="Press Enter to add" className="h-9 gap-1.5 text-muted-foreground">
          <span className="text-xs">enter</span>
          <KeyReturn size={14} />
        </Button>
      </form>
    </div>
  );
}

function MentorMomentum({
  mentorId,
  mentors,
  lastSessionByMentor,
  goalStatus,
}: {
  mentorId: string;
  mentors: Mentor[];
  lastSessionByMentor: Record<string, string>;
  goalStatus: string;
}) {
  const mentor = mentors.find((m) => m.mentorId === mentorId);
  const lastSession = lastSessionByMentor[mentorId];
  const daysAgo = lastSession
    ? Math.floor((Date.now() - new Date(lastSession).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // ponytail: thresholds — 14d amber, 21d rebook CTA
  const isStale = daysAgo !== null && daysAgo > 14;
  const needsRebook = daysAgo !== null && daysAgo > 21;

  if (goalStatus !== "active") {
    // Only show momentum for active goals
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
        <UserCircle size={12} />
        {mentor?.name ?? "Mentor"}
      </p>
    );
  }

  return (
    <div className="mt-0.5 space-y-0.5">
      <p className={`text-xs flex items-center gap-1 ${isStale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
        <UserCircle size={12} />
        {mentor?.name ?? "Mentor"}
        {daysAgo !== null && (
          <span className="ml-1">
            · {daysAgo === 0 ? "today" : `${daysAgo}d ago`}
          </span>
        )}
      </p>
      {needsRebook && mentor?.slug && (
        <a
          href={`/mentor/${mentor.slug}`}
          className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline underline-offset-4 flex items-center gap-1"
        >
          <CalendarDots size={12} />
          Book a follow-up
        </a>
      )}
    </div>
  );
}
