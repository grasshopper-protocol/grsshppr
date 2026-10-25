import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function createNotification(data: {
  userId: string;
  type: string;
  message: string;
  resourceId?: string;
  priority?: "action" | "info";
}) {
  const id = crypto.randomUUID();
  await db.insert(notifications).values({
    id,
    userId: data.userId,
    type: data.type,
    message: data.message,
    resourceId: data.resourceId,
    priority: data.priority ?? "info",
  });
}

/**
 * Unread notifications for the bell: things to do ("action") first, then
 * things to know ("info", e.g. a session cancelled because the other person
 * left — #159). Info items are cleared by opening them; action items by
 * taking the action.
 */
export async function getBellNotificationsForUser(userId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .orderBy(desc(sql`${notifications.priority} = 'action'`), desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return row?.count ?? 0;
}

/**
 * Auto-resolve: mark notification as read when the underlying action is taken.
 * Pass `userId` when only that person acted (e.g. their feedback), so the other
 * participant's notification stays open.
 */
export async function resolveNotification(resourceId: string, type: string, userId?: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.resourceId, resourceId),
        eq(notifications.type, type),
        eq(notifications.read, false),
        userId ? eq(notifications.userId, userId) : undefined
      )
    );
}

export async function markAsRead(id: string, userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, userId));
}
