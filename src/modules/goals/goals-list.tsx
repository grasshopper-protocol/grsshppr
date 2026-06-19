"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Pause, Play, Trash, Plus } from "@phosphor-icons/react";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "paused";
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
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then(({ goals }) => setGoals(goals ?? []));
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

  async function cycleStatus(goal: Goal) {
    const next =
      goal.status === "active"
        ? "completed"
        : goal.status === "completed"
          ? "paused"
          : "active";

    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    if (res.ok) {
      setGoals(goals.map((g) => (g.id === goal.id ? { ...g, status: next } : g)));
    }
  }

  async function removeGoal(id: string) {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals(goals.filter((g) => g.id !== id));
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
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              <button
                onClick={() => cycleStatus(goal)}
                className="shrink-0"
                title={`Status: ${goal.status}. Click to cycle.`}
              >
                <Badge
                  variant="secondary"
                  className={`gap-1 text-xs ${statusColor[goal.status]}`}
                >
                  {statusIcon[goal.status]}
                  {goal.status}
                </Badge>
              </button>
              <span
                className={`flex-1 text-sm ${goal.status === "completed" ? "line-through text-muted-foreground" : ""}`}
              >
                {goal.title}
              </span>
              <button
                onClick={() => removeGoal(goal.id)}
                className="text-muted-foreground hover:text-destructive"
                title="Delete goal"
              >
                <Trash size={14} />
              </button>
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
        <Button type="submit" size="sm" variant="outline" disabled={adding}>
          <Plus size={14} />
        </Button>
      </form>
    </div>
  );
}
