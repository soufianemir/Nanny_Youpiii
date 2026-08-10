"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { text } from "@/lib/action-helpers";
import { isParentRole, requireMembership } from "@/lib/security";
import { notifySpaceUsers, trackProductEvent } from "@/lib/notifications";

export async function sendMessageAction(formData:FormData){
  const spaceId=text(formData,"spaceId"),value=text(formData,"text").trim();if(!value||value.length>1200)throw new Error("MESSAGE_INVALID");const {session,membership}=await requireMembership(spaceId);await db.insert(s.spaceMessages).values({careSpaceId:spaceId,authorMemberId:membership.id,text:value});await trackProductEvent("MESSAGE_SENT",session.user.id,spaceId);await notifySpaceUsers({spaceId,excludeUserId:session.user.id,kind:"messages",type:"MESSAGE",title:"Nouveau message",body:value.slice(0,180),url:`/app?space=${spaceId}&section=more&area=messages`});revalidatePath("/app");
}

export async function deleteMessageAction(formData:FormData){
  const spaceId=text(formData,"spaceId"),messageId=text(formData,"messageId");const {membership}=await requireMembership(spaceId);const [message]=await db.select().from(s.spaceMessages).where(and(eq(s.spaceMessages.id,messageId),eq(s.spaceMessages.careSpaceId,spaceId))).limit(1);if(!message)throw new Error("MESSAGE_NOT_FOUND");if(message.authorMemberId!==membership.id&&!isParentRole(membership.role))throw new Error("FORBIDDEN");await db.delete(s.spaceMessages).where(eq(s.spaceMessages.id,messageId));revalidatePath("/app");
}
