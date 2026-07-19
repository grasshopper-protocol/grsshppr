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

/** Returns only action-priority unread notifications for the bell */
export async function getActionNotificationsForUser(userId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.priority, "action"),
        eq(notifications.read, false)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadActionCount(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.priority, "action"),
        eq(notifications.read, false)
      )
    );
  return row?.count ?? 0;
}

/** Auto-resolve: mark notification as read when the underlying action is taken */
export async function resolveNotification(resourceId: string, type: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.resourceId, resourceId),
        eq(notifications.type, type),
        eq(notifications.read, false)
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
