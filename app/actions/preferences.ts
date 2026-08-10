"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/lib/security";
import { trackProductEvent } from "@/lib/notifications";

export async function updateNotificationPreferencesAction(formData:FormData){
  const session=await requireUser();
  const values={activities:formData.get("activities")==="on",messages:formData.get("messages")==="on",handovers:formData.get("handovers")==="on",updatedAt:new Date()};
  await db.insert(s.notificationPreferences).values({userId:session.user.id,...values}).onConflictDoUpdate({target:s.notificationPreferences.userId,set:values});
  await trackProductEvent("NOTIFICATION_PREFERENCES_UPDATED",session.user.id,null,values);
  revalidatePath("/app");
}
