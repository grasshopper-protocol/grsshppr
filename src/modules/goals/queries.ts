import { eq } from "drizzle-orm";
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
