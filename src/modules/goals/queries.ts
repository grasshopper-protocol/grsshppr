import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { goals, users } from "@/lib/db/schema";

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

/** Completed goals attributed to a specific mentor (for their profile "Impact" section) */
export async function getCompletedGoalsForMentor(mentorId: string) {
  return db
    .select({
      id: goals.id,
      title: goals.title,
      updatedAt: goals.updatedAt,
      menteeName: users.name,
    })
    .from(goals)
    .innerJoin(users, eq(goals.menteeId, users.id))
    .where(and(eq(goals.mentorId, mentorId), eq(goals.status, "completed")))
    .orderBy(goals.updatedAt);
}
