import { eq, and, or, ilike, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, users, sessions, availability, goals } from "@/lib/db/schema";
import { slugify, nextAvailableSlug } from "@/lib/slug";
import {
  ACCOUNT_DELETED_REASON,
  DELETED_USER,
  isDeletedUser,
  planSessionsOnAccountDeletion,
} from "@/lib/account-deletion";
import { createNotification, resolveNotification } from "@/core/notifications/queries";
import { deleteFeedbackPrompts, lockPrompt } from "@/core/booking/feedback-prompts";
import { promptKey } from "@/lib/feedback-prompts";

// Collision ceiling: linear scan with LIKE prefix. Fine for <10k profiles.
async function uniqueSlug(name: string, excludeProfileId?: string) {
  const base = slugify(name);
  const existing = await db
    .select({ slug: profiles.slug })
    .from(profiles)
    .where(sql`${profiles.slug} = ${base} OR ${profiles.slug} LIKE ${base + "-%"}`);
  const taken = new Set(
    existing
      .filter((r) => !excludeProfileId || r.slug !== excludeProfileId)
      .map((r) => r.slug)
  );
  return nextAvailableSlug(base, taken);
}

export async function getProfileByUserId(userId: string) {
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function getProfileWithUser(slug: string) {
  const result = await db
    .select({
      profile: profiles,
      user: { id: users.id, name: users.name, image: users.image },
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.slug, slug))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertProfile(
  userId: string,
  data: {
    role: "mentor" | "mentee";
    headline?: string;
    bio?: string;
    expertise?: string[];
    links?: string[];
    experienceYears?: number;
    available?: boolean;
  }
) {
  const existing = await getProfileByUserId(userId);

  // Fetch user name for slug generation
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const slug = await uniqueSlug(user.name, existing?.id);

  if (existing) {
    const [updated] = await db
      .update(profiles)
      .set({ ...data, slug, updatedAt: new Date() })
      .where(eq(profiles.id, existing.id))
      .returning();
    return updated;
  }

  const id = crypto.randomUUID();
  const [created] = await db
    .insert(profiles)
    .values({ id, userId, slug, ...data })
    .returning();
  return created;
}

/**
 * Deletes a user and their personal data while keeping their partners' session
 * history (ADR-0016). Shared sessions are reassigned to the DELETED_USER
 * placeholder; upcoming ones are cancelled and the partner is notified.
 */
export async function deleteProfile(userId: string) {
  if (isDeletedUser(userId)) throw new Error("The deleted-user placeholder cannot be deleted");

  const involving = or(eq(sessions.mentorId, userId), eq(sessions.menteeId, userId));

  const plan = await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({ id: DELETED_USER.id, name: DELETED_USER.name, email: DELETED_USER.email })
      .onConflictDoNothing();

    const userSessions = await tx
      .select({
        id: sessions.id,
        mentorId: sessions.mentorId,
        menteeId: sessions.menteeId,
        status: sessions.status,
        startsAt: sessions.startsAt,
      })
      .from(sessions)
      .where(involving);
    // Wait out any in-flight feedback claim on these sessions, and block new
    // ones until this commits — so no prompt or email names the departing user.
    for (const s of userSessions) {
      await lockPrompt(tx, promptKey(s.id, s.mentorId));
      await lockPrompt(tx, promptKey(s.id, s.menteeId));
    }

    const plan = planSessionsOnAccountDeletion(userSessions, userId, new Date());

    if (plan.cancel.length > 0) {
      await tx
        .update(sessions)
        .set({ status: "cancelled", cancelReason: ACCOUNT_DELETED_REASON })
        .where(inArray(sessions.id, plan.cancel));
    }

    // Keep shared sessions (and their notes) for the partner, under the placeholder.
    await tx.update(sessions).set({ mentorId: DELETED_USER.id }).where(eq(sessions.mentorId, userId));
    await tx.update(sessions).set({ menteeId: DELETED_USER.id }).where(eq(sessions.menteeId, userId));

    // Goals are the mentee's data: delete theirs, and drop this user's mentor
    // credit on other people's goals (the FK has no ON DELETE, so it would block).
    await tx.delete(goals).where(eq(goals.menteeId, userId));
    await tx.update(goals).set({ mentorId: null }).where(eq(goals.mentorId, userId));

    await tx.delete(availability).where(eq(availability.userId, userId));
    await tx.delete(profiles).where(eq(profiles.userId, userId));
    // User row last — cascades auth_sessions, accounts, passkeys, notifications
    // and the feedback this user left.
    await tx.delete(users).where(eq(users.id, userId));

    // No one can rate a deleted user, and their name shouldn't outlive them in
    // the partners' notifications: delete those feedback prompts.
    await deleteFeedbackPrompts(userSessions.map((s) => s.id), tx);

    return plan;
  });

  // ponytail: notifications are best-effort after commit — the deletion itself must not fail on them
  for (const { userId: partnerId, sessionId } of plan.notify) {
    resolveNotification(sessionId, "action_required:confirm");
    createNotification({
      userId: partnerId,
      type: "session_cancelled",
      message: "A session was cancelled because the other participant deleted their account",
      resourceId: sessionId,
      priority: "info",
    });
  }
}

export type ExploreFilters = {
  search?: string;
  expertise?: string;
  available?: boolean;
};

export async function getMentors(filters: ExploreFilters = {}) {
  const conditions = [eq(profiles.role, "mentor")];

  if (filters.available) {
    conditions.push(eq(profiles.available, true));
  }

  if (filters.expertise) {
    // ponytail: array contains via SQL — Drizzle doesn't have a built-in arrayContains for pg text[]
    conditions.push(
      sql`${profiles.expertise} @> ARRAY[${filters.expertise}]::text[]`
    );
  }

  const rows = await db
    .select({
      profile: profiles,
      user: { id: users.id, name: users.name, image: users.image },
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(profiles.createdAt);

  if (filters.search) {
    const term = filters.search.toLowerCase();
    return rows.filter(
      (r) =>
        r.user.name.toLowerCase().includes(term) ||
        r.profile.bio?.toLowerCase().includes(term) ||
        r.profile.expertise?.some((e) => e.toLowerCase().includes(term))
    );
  }

  return rows;
}
