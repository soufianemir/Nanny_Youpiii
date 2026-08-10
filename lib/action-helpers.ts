import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { allChildrenAllowed, isTimeWithinWindow } from "@/lib/coherence";

export const money = (v: FormDataEntryValue | null) => Math.round(Number(v || 0) * 100) / 100;
export const text = (f: FormData, k: string) => String(f.get(k) || "").trim();

export const dateInTimeZone = (date = new Date(), timeZone = "Europe/Paris") => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const today = (timeZone = "Europe/Paris") => dateInTimeZone(new Date(), timeZone);

export const log = async (tx: any, spaceId: string, userId: string, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) => {
  await tx.insert(s.activityLogs).values({ careSpaceId: spaceId, actorUserId: userId, action, entityType, entityId, metadata });
};

export async function allowedChildIds(memberId:string){
  return (await db.select({id:s.memberChildren.childId}).from(s.memberChildren).where(eq(s.memberChildren.memberId,memberId))).map(x=>x.id);
}
export async function assertChildren(memberId:string, childIds:string[]){
  if(!childIds.length) return;
  const allowed=await allowedChildIds(memberId);
  if(!allChildrenAllowed(allowed, childIds)) throw new Error("FORBIDDEN_CHILD");
}
export async function assertMembers(spaceId:string, memberIds:string[]){
  if(!memberIds.length) return;
  const rows=await db.select({id:s.members.id}).from(s.members).where(and(eq(s.members.careSpaceId,spaceId),inArray(s.members.id,memberIds)));
  if(rows.length!==new Set(memberIds).size) throw new Error("INVALID_MEMBER");
}

export async function assertMembersCanAccessChildren(spaceId:string, memberIds:string[], childIds:string[]){
  if(!memberIds.length||!childIds.length) return;
  await assertMembers(spaceId,memberIds);
  const links=await db.select().from(s.memberChildren).where(inArray(s.memberChildren.memberId,memberIds));
  for(const memberId of new Set(memberIds)){
    const allowed=links.filter(x=>x.memberId===memberId).map(x=>x.childId);
    if(!allChildrenAllowed(allowed,childIds)) throw new Error("ASSIGNEE_CANNOT_ACCESS_CHILD");
  }
}

export async function careWindowForMember(spaceId:string, memberId:string, date:string){
  const [explicit]=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId),eq(s.shifts.shiftDate,date))).limit(1);
  if(explicit){
    if(explicit.status==="CANCELLED") return null;
    return {start:explicit.plannedStart,end:explicit.plannedEnd};
  }
  const weekday=new Date(`${date}T12:00:00`).getDay();
  const [rule]=await db.select().from(s.scheduleRules).where(and(eq(s.scheduleRules.careSpaceId,spaceId),eq(s.scheduleRules.memberId,memberId),eq(s.scheduleRules.weekday,weekday),eq(s.scheduleRules.active,true))).limit(1);
  return rule?{start:rule.startTime,end:rule.endTime}:null;
}

export async function assertWithinCareWindow(spaceId:string, memberIds:string[], date:string, start:string, end?:string|null){
  if(!memberIds.length||!start) return;
  for(const memberId of new Set(memberIds)){
    const window=await careWindowForMember(spaceId,memberId,date);
    if(!window) throw new Error("ASSIGNEE_NOT_SCHEDULED");
    if(!isTimeWithinWindow(start,end,window.start,window.end)) throw new Error("OUTSIDE_CARE_WINDOW");
  }
}
