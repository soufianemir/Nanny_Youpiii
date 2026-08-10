"use server";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/lib/security";
import { text } from "@/lib/action-helpers";

export async function deleteMyAccountAction(formData:FormData){
  const session=await requireUser();if(text(formData,"confirm")!=="SUPPRIMER")throw new Error("CONFIRMATION_REQUIRED");const userId=session.user.id;const memberships=await db.select().from(s.members).where(eq(s.members.userId,userId));const ownedSpaceIds=memberships.filter(member=>member.role==="PARENT_ADMIN").map(member=>member.careSpaceId);const anonymous=`deleted:${crypto.createHash("sha256").update(userId).digest("hex").slice(0,12)}`;
  await db.transaction(async tx=>{
    for(const spaceId of ownedSpaceIds)await tx.delete(s.careSpaces).where(eq(s.careSpaces.id,spaceId));
    await tx.delete(s.members).where(eq(s.members.userId,userId));await tx.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.userId,userId));await tx.delete(s.notificationPreferences).where(eq(s.notificationPreferences.userId,userId));await tx.delete(s.notifications).where(eq(s.notifications.userId,userId));await tx.delete(s.productEvents).where(eq(s.productEvents.userId,userId));
    await tx.update(s.programItems).set({createdBy:anonymous}).where(eq(s.programItems.createdBy,userId));await tx.update(s.tasks).set({createdBy:anonymous}).where(eq(s.tasks.createdBy,userId));await tx.update(s.routines).set({createdBy:anonymous}).where(eq(s.routines.createdBy,userId));await tx.update(s.instructions).set({createdBy:anonymous}).where(eq(s.instructions.createdBy,userId));await tx.update(s.shoppingItems).set({createdBy:anonymous}).where(eq(s.shoppingItems.createdBy,userId));await tx.update(s.activityLogs).set({actorUserId:anonymous}).where(eq(s.activityLogs.actorUserId,userId));
    await tx.execute(sql`delete from neon_auth."user" where id = ${userId}`);
  });
  redirect("/");
}
