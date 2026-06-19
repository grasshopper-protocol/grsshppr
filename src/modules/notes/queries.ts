import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";

export async function getNoteBySessionId(sessionId: string) {
  const result = await db
    .select()
    .from(notes)
    .where(eq(notes.sessionId, sessionId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertNote(sessionId: string, content: string) {
  const existing = await getNoteBySessionId(sessionId);

  if (existing) {
    const [updated] = await db
      .update(notes)
      .set({ content, updatedAt: new Date() })
      .where(eq(notes.id, existing.id))
      .returning();
    return updated;
  }

  const id = crypto.randomUUID();
  const [created] = await db
    .insert(notes)
    .values({ id, sessionId, content })
    .returning();
  return created;
}
