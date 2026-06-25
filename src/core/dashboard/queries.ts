import { eq, and, or, count, avg, sql, gte, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, sessionFeedback, goals, users, profiles } from "@/lib/db/schema";

export async function getMentorStats(userId: string) {
  const [row] = await db
    .select({
      completedSessions: count(),
      uniqueMentees: sql<number>`count(distinct ${sessions.menteeId})::int`,
    })
    .from(sessions)
    .where(and(eq(sessions.mentorId, userId), eq(sessions.status, "completed")));

  const [ratingRow] = await db
    .select({ avg: avg(sessionFeedback.rating) })
    .from(sessionFeedback)
    .innerJoin(sessions, eq(sessions.id, sessionFeedback.sessionId))
    .where(
      and(
        eq(sessions.mentorId, userId),
        // Only count feedback from mentees (not mentor's own)
        eq(sessionFeedback.userId, sessions.menteeId)
      )
    );

  const [goalsRow] = await db
    .select({ count: count() })
    .from(goals)
    .where(and(eq(goals.mentorId, userId), eq(goals.status, "completed")));

  return {
    completedSessions: row?.completedSessions ?? 0,
    uniqueMentees: row?.uniqueMentees ?? 0,
    avgRating: ratingRow?.avg ? parseFloat(String(ratingRow.avg)) : null,
    goalsHelped: goalsRow?.count ?? 0,
  };
}

export async function getMenteeStats(userId: string) {
  const [sessRow] = await db
    .select({ count: count() })
    .from(sessions)
    .where(and(eq(sessions.menteeId, userId), eq(sessions.status, "completed")));

  const goalRows = await db
    .select({
      status: goals.status,
      count: count(),
    })
    .from(goals)
    .where(eq(goals.menteeId, userId))
    .groupBy(goals.status);

  const goalsCompleted = goalRows.find((r) => r.status === "completed")?.count ?? 0;
  const goalsTotal = goalRows.reduce((sum, r) => sum + r.count, 0);

  const [mentorsRow] = await db
    .select({ count: sql<number>`count(distinct ${sessions.mentorId})::int` })
    .from(sessions)
    .where(and(eq(sessions.menteeId, userId), eq(sessions.status, "completed")));

  const streak = await getSessionStreak(userId);

  return {
    sessionsAttended: sessRow?.count ?? 0,
    goalsCompleted,
    goalsTotal,
    uniqueMentors: mentorsRow?.count ?? 0,
    weekStreak: streak,
  };
}

export async function getNextUpcomingSession(userId: string) {
  const now = new Date();
  const [row] = await db
    .select()
    .from(sessions)
    .where(
      and(
        or(eq(sessions.mentorId, userId), eq(sessions.menteeId, userId)),
        eq(sessions.status, "confirmed"),
        gte(sessions.startsAt, now)
      )
    )
    .orderBy(sessions.startsAt)
    .limit(1);

  if (!row) return null;

  const partnerId = row.mentorId === userId ? row.menteeId : row.mentorId;
  const [partner] = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, partnerId));

  const isMentor = row.mentorId === userId;
  return { session: row, partner, isMentor };
}

export async function getWeekSessions(userId: string) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);

  return db
    .select({
      id: sessions.id,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      status: sessions.status,
    })
    .from(sessions)
    .where(
      and(
        or(eq(sessions.mentorId, userId), eq(sessions.menteeId, userId)),
        or(eq(sessions.status, "confirmed"), eq(sessions.status, "completed")),
        gte(sessions.startsAt, monday),
        lte(sessions.startsAt, sunday)
      )
    )
    .orderBy(sessions.startsAt);
}

/** Consecutive calendar weeks (Mon–Sun) with at least 1 completed session */
async function getSessionStreak(userId: string): Promise<number> {
  // Get distinct week numbers for completed sessions, ordered desc
  const rows = await db
    .select({
      week: sql<string>`to_char(${sessions.endsAt}, 'IYYY-IW')`,
    })
    .from(sessions)
    .where(
      and(
        or(eq(sessions.mentorId, userId), eq(sessions.menteeId, userId)),
        eq(sessions.status, "completed")
      )
    )
    .groupBy(sql`to_char(${sessions.endsAt}, 'IYYY-IW')`)
    .orderBy(desc(sql`to_char(${sessions.endsAt}, 'IYYY-IW')`));

  if (rows.length === 0) return 0;

  // Current ISO week
  const now = new Date();
  const currentWeek = getISOWeekString(now);

  // Allow streak to include current week or last week (if this week hasn't had a session yet)
  let streak = 0;
  let expectedWeek = currentWeek;
  const lastWeek = getPreviousISOWeek(currentWeek);

  // If current week isn't in the list, start from last week
  if (rows[0].week !== currentWeek) {
    if (rows[0].week === lastWeek) {
      expectedWeek = lastWeek;
    } else {
      return 0;
    }
  }

  for (const row of rows) {
    if (row.week === expectedWeek) {
      streak++;
      expectedWeek = getPreviousISOWeek(expectedWeek);
    } else {
      break;
    }
  }

  return streak;
}

function getISOWeekString(date: Date): string {
  // Approximation using Thursday-based ISO week calculation
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

function getPreviousISOWeek(weekStr: string): string {
  const [year, week] = weekStr.split("-").map(Number);
  if (week === 1) {
    // Last week of previous year (approximate as 52)
    return `${year - 1}-52`;
  }
  return `${year}-${String(week - 1).padStart(2, "0")}`;
}

export async function getRepeatMenteeRate(mentorId: string) {
  // Mentees with >1 completed session vs total unique mentees
  const rows = await db
    .select({
      menteeId: sessions.menteeId,
      count: count(),
    })
    .from(sessions)
    .where(and(eq(sessions.mentorId, mentorId), eq(sessions.status, "completed")))
    .groupBy(sessions.menteeId);

  if (rows.length === 0) return null;
  const repeats = rows.filter((r) => r.count > 1).length;
  return Math.round((repeats / rows.length) * 100);
}
