import { and, eq, gte, inArray, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarFeeds, sessions, users } from "@/lib/db/schema";
import { feedWindow, generateFeedToken, hashFeedToken, type FeedSession } from "@/lib/calendar-feed";

/** Whether the user has a feed, and since when. The token itself is never stored. */
export async function getFeedStatus(userId: string) {
  const [row] = await db
    .select({ createdAt: calendarFeeds.createdAt })
    .from(calendarFeeds)
    .where(eq(calendarFeeds.userId, userId));
  return row ? { enabled: true as const, createdAt: row.createdAt } : { enabled: false as const };
}

/** Create the feed, or replace its token (the old URL stops working). Returns the new token. */
export async function createOrRotateFeed(userId: string) {
  const token = generateFeedToken();
  const createdAt = new Date();
  await db
    .insert(calendarFeeds)
    .values({ userId, tokenHash: hashFeedToken(token), createdAt })
    .onConflictDoUpdate({ target: calendarFeeds.userId, set: { tokenHash: hashFeedToken(token), createdAt } });
  return { token, createdAt };
}

export async function deleteFeed(userId: string) {
  await db.delete(calendarFeeds).where(eq(calendarFeeds.userId, userId));
}

/** The owner of a feed token, or null. Looks up by hash only. */
export async function getFeedOwner(token: string) {
  const [row] = await db
    .select({ userId: calendarFeeds.userId })
    .from(calendarFeeds)
    .where(eq(calendarFeeds.tokenHash, hashFeedToken(token)));
  return row?.userId ?? null;
}

/** The owner's confirmed and completed sessions in the feed window, with partner names. */
export async function getFeedSessions(userId: string, now: Date): Promise<FeedSession[]> {
  const { from, to } = feedWindow(now);
  const rows = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      mentorId: sessions.mentorId,
      menteeId: sessions.menteeId,
    })
    .from(sessions)
    .where(
      and(
        or(eq(sessions.mentorId, userId), eq(sessions.menteeId, userId)),
        inArray(sessions.status, ["confirmed", "completed"]),
        gte(sessions.startsAt, from),
        lte(sessions.startsAt, to)
      )
    )
    .orderBy(sessions.startsAt);
  if (rows.length === 0) return [];

  const partnerIds = [...new Set(rows.map((r) => (r.mentorId === userId ? r.menteeId : r.mentorId)))];
  const partners = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, partnerIds));
  const nameOf = new Map(partners.map((p) => [p.id, p.name]));

  return rows.map((r) => {
    const isMentor = r.mentorId === userId;
    return {
      id: r.id,
      status: r.status,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      partnerName: nameOf.get(isMentor ? r.menteeId : r.mentorId) ?? "your session partner",
      role: isMentor ? "mentor" : "mentee",
    };
  });
}
