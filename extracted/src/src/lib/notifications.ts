import { db } from "@/lib/db";

/* ============================================================
   HEAVIX — Notification Dispatcher (Phase 11)
   Per HEAVIX Master Execution Plan V3.0 Phase 11.

   Central notification service. All domain events that need to
   notify a user go through this dispatcher — not scattered
   db.notification.create() calls across API routes.

   Usage:
     import { notify } from "@/lib/notifications";
     await notify({
       userId: sellerId,
       type: "NEW_MESSAGE",
       title: "پیام جدید",
       body: "شما یک پیام جدید دریافت کردید",
       link: "/conversations/123",
       entityType: "Conversation",
       entityId: "123",
     });
   ============================================================ */

export type NotificationType =
  | "LISTING_PUBLISHED"
  | "LISTING_APPROVED"
  | "NEW_MESSAGE"
  | "NEW_OFFER"
  | "OFFER_COUNTERED"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "RFQ_CREATED"
  | "RFQ_QUOTE_RECEIVED"
  | "MATCH_FOUND"
  | "DEAL_CREATED"
  | "DEAL_CONFIRMED"
  | "DEAL_COMPLETED"
  | "ORDER_CREATED"
  | "PAYMENT_CREATED"
  | "PAYMENT_CONFIRMED"
  | "DISPUTE_OPENED"
  | "DISPUTE_RESOLVED"
  | "REVIEW_RECEIVED";

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Create a notification for a user.
 * Fire-and-forget safe — errors are caught, never block the caller.
 */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title.slice(0, 200),
        body: params.body.slice(0, 1000),
        link: params.link || null,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        read: false,
      },
    });
  } catch (e) {
    // Notification creation must never break the main operation
    console.error("[notifications] failed to create:", e);
  }
}

/**
 * Create notifications for multiple users (batch).
 */
export async function notifyMany(
  users: { userId: string; params: Omit<NotifyParams, "userId"> }[],
): Promise<void> {
  for (const { userId, params } of users) {
    await notify({ ...params, userId });
  }
}

/**
 * Get unread count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, read: false },
  });
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true, readAt: new Date() },
  });
  return result.count > 0;
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
  return result.count;
}
