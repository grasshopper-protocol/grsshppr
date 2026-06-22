import { eq, and, or, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, users, sessions, availability, goals } from "@/lib/db/schema";

export async function getProfileByUserId(userId: string) {
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function getProfileWithUser(profileId: string) {
  const result = await db
    .select({
      profile: profiles,
      user: { id: users.id, name: users.name, image: users.image },
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.id, profileId))
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

  if (existing) {
    const [updated] = await db
      .update(profiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(profiles.id, existing.id))
      .returning();
    return updated;
  }

  const id = crypto.randomUUID();
  const [created] = await db
    .insert(profiles)
    .values({ id, userId, ...data })
    .returning();
  return created;
}

export async function deleteProfile(userId: string) {
  // ponytail: sessions/goals don't cascade on user delete, clean up explicitly
  // auth tables (auth_sessions, accounts, passkey) cascade from users FK
  await db.delete(goals).where(eq(goals.menteeId, userId));
  await db
    .delete(sessions)
    .where(or(eq(sessions.mentorId, userId), eq(sessions.menteeId, userId)));
  await db.delete(availability).where(eq(availability.userId, userId));
  await db.delete(profiles).where(eq(profiles.userId, userId));
  // nuke the user row last — cascades auth_sessions, accounts, passkeys
  await db.delete(users).where(eq(users.id, userId));
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
