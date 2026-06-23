import { eq, or, and, desc, count, gt, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users, sessionFeedback, profiles } from "@/lib/db/schema";

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

      // For completed sessions where user is mentee, include mentor profile ID for rebook
      let mentorProfileId: string | undefined;
      if (role === "mentee" && s.status === "completed") {
        const [profile] = await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.userId, s.mentorId));
        mentorProfileId = profile?.id;
      }

      return { session: s, partner, role, mentorProfileId };
    })
  );

  return enriched;
}

export async function getCompletedSessionCount(userId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(sessions)
    .where(and(eq(sessions.mentorId, userId), eq(sessions.status, "completed")));
  return row?.count ?? 0;
}

// ponytail: returns completed sessions within 48h that user hasn't reviewed yet
export async function getSessionsNeedingFeedback(userId: string) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Get sessions user already reviewed
  const reviewed = await db
    .select({ sessionId: sessionFeedback.sessionId })
    .from(sessionFeedback)
    .where(eq(sessionFeedback.userId, userId));
  const reviewedIds = reviewed.map((r) => r.sessionId);

  const completed = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.status, "completed"),
        or(eq(sessions.mentorId, userId), eq(sessions.menteeId, userId)),
        gt(sessions.endsAt, cutoff),
        reviewedIds.length > 0 ? notInArray(sessions.id, reviewedIds) : undefined
      )
    )
    .orderBy(desc(sessions.endsAt));

  // Enrich with partner info
  const enriched = await Promise.all(
    completed.map(async (s) => {
      const partnerId = s.mentorId === userId ? s.menteeId : s.mentorId;
      const [partner] = await db
        .select({ id: users.id, name: users.name, image: users.image })
        .from(users)
        .where(eq(users.id, partnerId));
      return { session: s, partner };
    })
  );
  return enriched;
}

export async function updateSessionStatus(
  id: string,
  status: "confirmed" | "completed" | "cancelled",
  cancelReason?: string
) {
  const [updated] = await db
    .update(sessions)
    .set({ status, ...(cancelReason && status === "cancelled" ? { cancelReason } : {}) })
    .where(eq(sessions.id, id))
    .returning();
  return updated;
}

/** Distinct mentors a mentee has had at least one session with */
export async function getMentorsForMentee(menteeId: string) {
  const rows = await db
    .selectDistinctOn([sessions.mentorId], {
      mentorId: sessions.mentorId,
      name: users.name,
      image: users.image,
      profileId: profiles.id,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.mentorId, users.id))
    .leftJoin(profiles, eq(profiles.userId, sessions.mentorId))
    .where(eq(sessions.menteeId, menteeId));
  return rows;
}

/** Last completed/confirmed session date per mentor for a mentee */
export async function getLastSessionByMentor(menteeId: string) {
  const rows = await db
    .selectDistinctOn([sessions.mentorId], {
      mentorId: sessions.mentorId,
      endsAt: sessions.endsAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.menteeId, menteeId),
        or(eq(sessions.status, "completed"), eq(sessions.status, "confirmed"))
      )
    )
    .orderBy(sessions.mentorId, desc(sessions.endsAt));

  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.mentorId] = r.endsAt.toISOString();
  }
  return map;
}
