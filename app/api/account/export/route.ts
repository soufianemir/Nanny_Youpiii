import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/lib/security";

export const dynamic="force-dynamic";
export async function GET(){
  const session=await requireUser();const memberships=await db.select().from(s.members).where(eq(s.members.userId,session.user.id));const memberIds=memberships.map(item=>item.id),spaceIds=memberships.map(item=>item.careSpaceId);const spaces=spaceIds.length?await db.select().from(s.careSpaces).where(inArray(s.careSpaces.id,spaceIds)):[];const shifts=memberIds.length?await db.select().from(s.shifts).where(inArray(s.shifts.memberId,memberIds)):[];const notes=memberIds.length?await db.select().from(s.dailyNotes).where(inArray(s.dailyNotes.memberId,memberIds)):[];const messages=memberIds.length?await db.select().from(s.spaceMessages).where(inArray(s.spaceMessages.authorMemberId,memberIds)):[];const notifications=await db.select().from(s.notifications).where(eq(s.notifications.userId,session.user.id));const createdActivities=await db.select().from(s.programItems).where(eq(s.programItems.createdBy,session.user.id));const payload={exportedAt:new Date().toISOString(),account:{id:session.user.id,name:session.user.name,email:session.user.email},spaces,memberships,shifts,notes,messages,notifications,createdActivities};return new Response(JSON.stringify(payload,null,2),{headers:{"content-type":"application/json; charset=utf-8","content-disposition":"attachment; filename=\"nanny-youpiii-mes-donnees.json\""}});
}
