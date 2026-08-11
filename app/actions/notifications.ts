"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { text } from "@/lib/action-helpers";
import { notificationDestination } from "@/lib/notification-center";
import { requireUser } from "@/lib/security";

export async function openNotificationAction(formData:FormData){
  const notificationId=text(formData,"notificationId");const session=await requireUser();const [notification]=await db.select().from(s.notifications).where(and(eq(s.notifications.id,notificationId),eq(s.notifications.userId,session.user.id))).limit(1);if(!notification)redirect("/app");if(!notification.readAt)await db.update(s.notifications).set({readAt:new Date()}).where(and(eq(s.notifications.id,notification.id),eq(s.notifications.userId,session.user.id)));revalidatePath("/app");redirect(notificationDestination(notification.type,notification.careSpaceId));
}

export async function markAllNotificationsReadAction(_formData:FormData){
  const session=await requireUser();await db.update(s.notifications).set({readAt:new Date()}).where(and(eq(s.notifications.userId,session.user.id),isNull(s.notifications.readAt)));revalidatePath("/app");
}
