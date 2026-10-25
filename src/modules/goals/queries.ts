import { eq, and, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";

export async function getGoalsForUser(userId: string) {
  return db
    .select()
    .from(goals)
    .where(eq(goals.menteeId, userId))
    .orderBy(goals.createdAt);
}

export async function getGoalById(id: string) {
  const result = await db
    .select()
    .from(goals)
    .where(eq(goals.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createGoal(data: {
  menteeId: string;
  title: string;
  description?: string;
  mentorId?: string;
  targetDate?: Date;
}) {
  const id = crypto.randomUUID();
  const [goal] = await db
    .insert(goals)
    .values({ id, ...data })
    .returning();
  return goal;
}

export async function updateGoal(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: "active" | "completed" | "paused";
    mentorId?: string | null;
    targetDate?: Date | null;
  }
) {
  const [updated] = await db
    .update(goals)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(goals.id, id))
    .returning();
  return updated;
}

export async function deleteGoal(id: string) {
  await db.delete(goals).where(eq(goals.id, id));
}

/**
 * Number of completed goals attributed to a mentor, for their public profile
 * "Impact" section. Count only: goal titles and mentee identities are the
 * mentee's private data and must never reach a public page (ADR-0015).
 */
export async function getCompletedGoalCountForMentor(mentorId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(goals)
    .where(and(eq(goals.mentorId, mentorId), eq(goals.status, "completed")));
  return row?.count ?? 0;
}
