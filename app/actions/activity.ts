"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertChildren, assertMembers, assertMembersCanAccessChildren, text } from "@/lib/action-helpers";
import { activityDefinition, activityStatusFor } from "@/lib/activity";
import { localDateTime } from "@/lib/coherence";
import { isParentRole, requirePermission } from "@/lib/security";

function safeReturnTo(formData: FormData){
  const value=text(formData,"returnTo");
  return value.startsWith("/app?")?value:"/app";
}

async function spaceClock(spaceId:string){
  const [space]=await db.select({timezone:s.careSpaces.timezone}).from(s.careSpaces).where(eq(s.careSpaces.id,spaceId)).limit(1);
  if(!space) throw new Error("Espace introuvable");
  const parts=new Intl.DateTimeFormat("fr-CA",{timeZone:space.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find(part=>part.type===type)?.value||"";
  return {date:`${get("year")}-${get("month")}-${get("day")}`,time:`${get("hour")}:${get("minute")}`};
}

async function activityAccess(spaceId:string,itemId:string,membership:typeof s.members.$inferSelect){
  const [item]=await db.select().from(s.programItems).where(and(eq(s.programItems.id,itemId),eq(s.programItems.careSpaceId,spaceId))).limit(1);
  if(!item) throw new Error("ACTIVITY_NOT_FOUND");
  if(!isParentRole(membership.role)){
    const [assigned]=await db.select().from(s.programAssignees).where(and(eq(s.programAssignees.programItemId,itemId),eq(s.programAssignees.memberId,membership.id))).limit(1);
    if(!assigned) throw new Error("FORBIDDEN");
  }
  return item;
}

async function activityInput(formData:FormData,spaceId:string,membership:typeof s.members.$inferSelect){
  const clock=await spaceClock(spaceId);
  const timing=text(formData,"timing")||"NOW";
  const date=timing==="NOW"?clock.date:(text(formData,"date")||clock.date);
  const start=timing==="NOW"?clock.time:(text(formData,"time")||null);
  const end=text(formData,"end")||null;
  const key=text(formData,"activityType")||"OTHER";
  const definition=activityDefinition(key);
  const customTitle=text(formData,"customTitle").trim();
  const title=definition.key==="OTHER"?(customTitle||"Autre"):definition.label;
  const childIds=formData.getAll("childIds").map(String).filter(Boolean);
  const requestedMembers=formData.getAll("memberIds").map(String).filter(Boolean);
  const memberIds=isParentRole(membership.role)?requestedMembers:[membership.id];
  await assertChildren(membership.id,childIds);
  await assertMembers(spaceId,memberIds);
  await assertMembersCanAccessChildren(spaceId,memberIds,childIds);
  const status=timing==="NOW"?"DONE":activityStatusFor(date,start,clock.date,clock.time);
  const actualStart=status==="DONE"?(localDateTime(date,start||clock.time)||new Date()):null;
  const actualEnd=status==="DONE"?(localDateTime(date,end||start||clock.time)||actualStart):null;
  return {date,start,end,key,definition,title,childIds,memberIds,status,actualStart,actualEnd,description:text(formData,"description")||null};
}

export async function addActivityAction(formData:FormData){
  const spaceId=text(formData,"spaceId");
  const {session,membership}=await requirePermission(spaceId,"program");
  const input=await activityInput(formData,spaceId,membership);
  const [item]=await db.insert(s.programItems).values({
    careSpaceId:spaceId,
    programDate:input.date,
    type:input.definition.label,
    title:input.title,
    description:input.description,
    plannedStart:input.start,
    plannedEnd:input.end,
    status:input.status,
    actualStart:input.actualStart,
    actualEnd:input.actualEnd,
    createdBy:session.user.id,
  }).returning({id:s.programItems.id});
  if(input.childIds.length)await db.insert(s.programChildren).values(input.childIds.map(childId=>({programItemId:item.id,childId})));
  if(input.memberIds.length)await db.insert(s.programAssignees).values(input.memberIds.map(memberId=>({programItemId:item.id,memberId})));
  await db.insert(s.activityLogs).values({careSpaceId:spaceId,actorUserId:session.user.id,action:"ACTIVITY_CREATED",entityType:"program_item",entityId:item.id,metadata:{status:input.status,type:input.key}});
  revalidatePath("/app");
  redirect(safeReturnTo(formData));
}

export async function updateActivityAction(formData:FormData){
  const spaceId=text(formData,"spaceId"),itemId=text(formData,"itemId");
  const {session,membership}=await requirePermission(spaceId,"program");
  await activityAccess(spaceId,itemId,membership);
  const input=await activityInput(formData,spaceId,membership);
  await db.update(s.programItems).set({
    programDate:input.date,
    type:input.definition.label,
    title:input.title,
    description:input.description,
    plannedStart:input.start,
    plannedEnd:input.end,
    status:input.status,
    actualStart:input.actualStart,
    actualEnd:input.actualEnd,
  }).where(and(eq(s.programItems.id,itemId),eq(s.programItems.careSpaceId,spaceId)));
  await db.delete(s.programChildren).where(eq(s.programChildren.programItemId,itemId));
  await db.delete(s.programAssignees).where(eq(s.programAssignees.programItemId,itemId));
  if(input.childIds.length)await db.insert(s.programChildren).values(input.childIds.map(childId=>({programItemId:itemId,childId})));
  if(input.memberIds.length)await db.insert(s.programAssignees).values(input.memberIds.map(memberId=>({programItemId:itemId,memberId})));
  await db.insert(s.activityLogs).values({careSpaceId:spaceId,actorUserId:session.user.id,action:"ACTIVITY_UPDATED",entityType:"program_item",entityId:itemId,metadata:{status:input.status,type:input.key}});
  revalidatePath("/app");
  redirect(safeReturnTo(formData));
}

export async function deleteActivityAction(formData:FormData){
  const spaceId=text(formData,"spaceId"),itemId=text(formData,"itemId");
  const {session,membership}=await requirePermission(spaceId,"program");
  await activityAccess(spaceId,itemId,membership);
  await db.delete(s.programItems).where(and(eq(s.programItems.id,itemId),eq(s.programItems.careSpaceId,spaceId)));
  await db.insert(s.activityLogs).values({careSpaceId:spaceId,actorUserId:session.user.id,action:"ACTIVITY_DELETED",entityType:"program_item",entityId:itemId,metadata:{}});
  revalidatePath("/app");
  redirect(safeReturnTo(formData));
}
