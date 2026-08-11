"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertChildren, assertMembers, assertMembersCanAccessChildren, text } from "@/lib/action-helpers";
import { ACTIVITY_LIBRARY_ROUTINE_NAME, MAX_ACTIVITY_PRESETS, activityDefinition, activityKeyFromStored, activityStatusFor } from "@/lib/activity";
import { isParentRole, requirePermission } from "@/lib/security";
import { notifySpaceUsers, trackProductEvent } from "@/lib/notifications";

function safeReturnTo(formData:FormData){const value=text(formData,"returnTo");return value.startsWith("/app?")?value:"/app";}
async function spaceClock(spaceId:string){const [space]=await db.select({timezone:s.careSpaces.timezone}).from(s.careSpaces).where(eq(s.careSpaces.id,spaceId)).limit(1);if(!space)throw new Error("Espace introuvable");const parts=new Intl.DateTimeFormat("fr-CA",{timeZone:space.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find(part=>part.type===type)?.value||"";return {date:`${get("year")}-${get("month")}-${get("day")}`,time:`${get("hour")}:${get("minute")}`};}
async function activityAccess(spaceId:string,itemId:string,membership:typeof s.members.$inferSelect){const [item]=await db.select().from(s.programItems).where(and(eq(s.programItems.id,itemId),eq(s.programItems.careSpaceId,spaceId))).limit(1);if(!item)throw new Error("ACTIVITY_NOT_FOUND");if(!isParentRole(membership.role)){const [assigned]=await db.select().from(s.programAssignees).where(and(eq(s.programAssignees.programItemId,itemId),eq(s.programAssignees.memberId,membership.id))).limit(1);if(!assigned)throw new Error("FORBIDDEN");}return item;}
async function defaultCaregivers(spaceId:string,childIds:string[],date:string,start:string|null){const candidates=await db.select().from(s.members).where(and(eq(s.members.careSpaceId,spaceId),eq(s.members.status,"ACTIVE")));let caregivers=candidates.filter(member=>!isParentRole(member.role));if(!caregivers.length)return [];if(childIds.length){const links=await db.select().from(s.memberChildren).where(inArray(s.memberChildren.memberId,caregivers.map(member=>member.id)));caregivers=caregivers.filter(member=>childIds.every(childId=>links.some(link=>link.memberId===member.id&&link.childId===childId)));}if(!caregivers.length)return [];if(start){const shifts=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.shiftDate,date),inArray(s.shifts.memberId,caregivers.map(member=>member.id))));const onDuty=shifts.filter(shift=>shift.status!=="CANCELLED"&&shift.plannedStart<=start&&shift.plannedEnd>=start).map(shift=>shift.memberId);if(onDuty.length)return [...new Set(onDuty)];}return caregivers.map(member=>member.id);}

function cleanPresetNames(formData:FormData){
  const names=formData.getAll("names").map(String).map(name=>name.trim().replace(/\s+/g," ").slice(0,60)).filter(Boolean);
  const unique:string[]=[];const seen=new Set<string>();
  for(const name of names){const key=name.toLocaleLowerCase("fr-FR");if(key==="autre"||seen.has(key))continue;seen.add(key);unique.push(name);}
  if(!unique.length)throw new Error("Gardez au moins une activité régulière");
  if(unique.length>MAX_ACTIVITY_PRESETS)throw new Error(`Maximum ${MAX_ACTIVITY_PRESETS} activités régulières`);
  return unique;
}

export async function saveActivityLibraryAction(formData:FormData){
  const spaceId=text(formData,"spaceId");const {session,membership}=await requirePermission(spaceId,"program");if(!isParentRole(membership.role))throw new Error("FORBIDDEN");const names=cleanPresetNames(formData);
  await db.transaction(async tx=>{
    let [library]=await tx.select().from(s.routines).where(and(eq(s.routines.careSpaceId,spaceId),eq(s.routines.name,ACTIVITY_LIBRARY_ROUTINE_NAME))).limit(1);
    if(!library)[library]=await tx.insert(s.routines).values({careSpaceId:spaceId,name:ACTIVITY_LIBRARY_ROUTINE_NAME,description:"Configuration interne des activités régulières",createdBy:session.user.id}).returning();
    await tx.delete(s.routineItems).where(eq(s.routineItems.routineId,library.id));
    await tx.insert(s.routineItems).values(names.map((name,position)=>({routineId:library.id,position,title:name,description:null})));
  });
  await trackProductEvent("ACTIVITY_LIBRARY_UPDATED",session.user.id,spaceId,{count:names.length});revalidatePath("/app");
}

function activityChoice(formData:FormData){
  const raw=text(formData,"activityType")||"OTHER";
  if(raw==="OTHER"){
    const title=text(formData,"customTitle").trim().replace(/\s+/g," ").slice(0,80);
    if(!title)throw new Error("Nommez l’activité ponctuelle");
    return {key:activityKeyFromStored("",title),title};
  }
  if(raw.startsWith("PRESET::")||raw.startsWith("CURRENT::")){
    const title=raw.slice(raw.indexOf("::")+2).trim().slice(0,80);
    if(!title)throw new Error("Activité invalide");
    return {key:activityKeyFromStored("",title),title};
  }
  const definition=activityDefinition(raw);
  return {key:definition.key,title:definition.key==="OTHER"?"Autre":definition.label};
}

async function activityInput(formData:FormData,spaceId:string,membership:typeof s.members.$inferSelect,existing?:typeof s.programItems.$inferSelect){
  const clock=await spaceClock(spaceId);const timing=(text(formData,"timing")||"NOW") as "NOW"|"SCHEDULED";let date=timing==="NOW"?clock.date:(text(formData,"date")||clock.date);let start=timing==="NOW"?clock.time:(text(formData,"time")||null);let end=text(formData,"end")||null;if(existing?.status==="DONE"){date=existing.programDate;start=existing.plannedStart;end=existing.plannedEnd;}
  const choice=activityChoice(formData);const definition=activityDefinition(choice.key);const title=choice.title;
  const childIds=formData.getAll("childIds").map(String).filter(Boolean);const requestedMembers=formData.getAll("memberIds").map(String).filter(Boolean);let memberIds=isParentRole(membership.role)?requestedMembers:[membership.id];await assertChildren(membership.id,childIds);if(isParentRole(membership.role)&&memberIds.length===0)memberIds=await defaultCaregivers(spaceId,childIds,date,start);await assertMembers(spaceId,memberIds);await assertMembersCanAccessChildren(spaceId,memberIds,childIds);const status=existing?.status==="DONE"?"DONE":activityStatusFor(timing);const now=new Date();return {date,start,end,key:choice.key,definition,title,childIds,memberIds,status,description:text(formData,"description")||null,actualStart:status==="DONE"?(existing?.actualStart||now):null,actualEnd:status==="DONE"?(existing?.actualEnd||now):null,completedAt:status==="DONE"?(existing?.completedAt||now):null,completedByMemberId:status==="DONE"?(existing?.completedByMemberId||membership.id):null};
}

export async function addActivityAction(formData:FormData){const spaceId=text(formData,"spaceId");const {session,membership}=await requirePermission(spaceId,"program");const input=await activityInput(formData,spaceId,membership);const [item]=await db.insert(s.programItems).values({careSpaceId:spaceId,programDate:input.date,type:input.definition.label,title:input.title,description:input.description,plannedStart:input.start,plannedEnd:input.end,status:input.status,actualStart:input.actualStart,actualEnd:input.actualEnd,createdBy:session.user.id,completedByMemberId:input.completedByMemberId,completedAt:input.completedAt}).returning({id:s.programItems.id});if(input.childIds.length)await db.insert(s.programChildren).values(input.childIds.map(childId=>({programItemId:item.id,childId})));if(input.memberIds.length)await db.insert(s.programAssignees).values(input.memberIds.map(memberId=>({programItemId:item.id,memberId})));await db.insert(s.activityLogs).values({careSpaceId:spaceId,actorUserId:session.user.id,action:"ACTIVITY_CREATED",entityType:"program_item",entityId:item.id,metadata:{status:input.status,type:input.key,assignees:input.memberIds}});await trackProductEvent("ACTIVITY_CREATED",session.user.id,spaceId,{status:input.status,type:input.key,custom:input.key==="OTHER"});if(input.status==="DONE")await notifySpaceUsers({spaceId,excludeUserId:session.user.id,kind:"activities",type:"ACTIVITY_DONE",title:`${input.title} terminé`,body:input.description||"Activité ajoutée au journal",url:`/app?space=${spaceId}&section=journal`,childIds:input.childIds});revalidatePath("/app");redirect(safeReturnTo(formData));}
export async function updateActivityAction(formData:FormData){const spaceId=text(formData,"spaceId"),itemId=text(formData,"itemId");const {session,membership}=await requirePermission(spaceId,"program");const existing=await activityAccess(spaceId,itemId,membership);const input=await activityInput(formData,spaceId,membership,existing);await db.update(s.programItems).set({programDate:input.date,type:input.definition.label,title:input.title,description:input.description,plannedStart:input.start,plannedEnd:input.end,status:input.status,actualStart:input.actualStart,actualEnd:input.actualEnd,completedByMemberId:input.completedByMemberId,completedAt:input.completedAt}).where(and(eq(s.programItems.id,itemId),eq(s.programItems.careSpaceId,spaceId)));await db.delete(s.programChildren).where(eq(s.programChildren.programItemId,itemId));await db.delete(s.programAssignees).where(eq(s.programAssignees.programItemId,itemId));if(input.childIds.length)await db.insert(s.programChildren).values(input.childIds.map(childId=>({programItemId:itemId,childId})));if(input.memberIds.length)await db.insert(s.programAssignees).values(input.memberIds.map(memberId=>({programItemId:itemId,memberId})));await db.insert(s.activityLogs).values({careSpaceId:spaceId,actorUserId:session.user.id,action:"ACTIVITY_UPDATED",entityType:"program_item",entityId:itemId,metadata:{status:input.status,type:input.key,assignees:input.memberIds}});await trackProductEvent("ACTIVITY_UPDATED",session.user.id,spaceId,{status:input.status,type:input.key});revalidatePath("/app");redirect(safeReturnTo(formData));}
export async function deleteActivityAction(formData:FormData){const spaceId=text(formData,"spaceId"),itemId=text(formData,"itemId");const {session,membership}=await requirePermission(spaceId,"program");await activityAccess(spaceId,itemId,membership);await db.delete(s.programItems).where(and(eq(s.programItems.id,itemId),eq(s.programItems.careSpaceId,spaceId)));await db.insert(s.activityLogs).values({careSpaceId:spaceId,actorUserId:session.user.id,action:"ACTIVITY_DELETED",entityType:"program_item",entityId:itemId,metadata:{}});await trackProductEvent("ACTIVITY_DELETED",session.user.id,spaceId);revalidatePath("/app");redirect(safeReturnTo(formData));}
