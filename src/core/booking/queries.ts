import { eq, or, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

export async function createSession(data: {
  mentorId: string;
  menteeId: string;
  startsAt: Date;
  endsAt: Date;
}) {
  const id = crypto.randomUUID();
  const [session] = await db
    .insert(sessions)
    .values({ id, ...data })
    .returning();
  return session;
}

export async function getSessionById(id: string) {
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getSessionWithUsers(id: string) {
  const mentorAlias = db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .as("mentor");

  // ponytail: two joins to same table needs raw query or separate fetches — doing separate for clarity
  const session = await getSessionById(id);
  if (!session) return null;

  const [mentor] = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, session.mentorId));

  const [mentee] = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, session.menteeId));

  return { session, mentor, mentee };
}

export async function getSessionsForUser(userId: string) {
  const rows = await db
    .select()
    .from(sessions)
    .where(or(eq(sessions.mentorId, userId), eq(sessions.menteeId, userId)))
    .orderBy(desc(sessions.startsAt));

  // Fetch partner info for each session
  const enriched = await Promise.all(
    rows.map(async (s) => {
      const partnerId = s.mentorId === userId ? s.menteeId : s.mentorId;
      const [partner] = await db
        .select({ id: users.id, name: users.name, image: users.image })
        .from(users)
        .where(eq(users.id, partnerId));
      const role = s.mentorId === userId ? "mentor" : "mentee";
      return { session: s, partner, role };
    })
  );

  return enriched;
}

export async function updateSessionStatus(
  id: string,
  status: "confirmed" | "completed" | "cancelled"
) {
  const [updated] = await db
    .update(sessions)
    .set({ status })
    .where(eq(sessions.id, id))
    .returning();
  return updated;
}
