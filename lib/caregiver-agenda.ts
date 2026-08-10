import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { isParentRole } from "@/lib/security";

export type CaregiverAgendaItem={spaceId:string;spaceName:string;membershipId:string;shift:null|{start:string;end:string;status:string};next:null|{time:string|null;title:string;status:string}};
export async function caregiverAgenda(userId:string,date:string):Promise<CaregiverAgendaItem[]>{
  const rows=await db.select({member:s.members,space:s.careSpaces}).from(s.members).innerJoin(s.careSpaces,eq(s.members.careSpaceId,s.careSpaces.id)).where(and(eq(s.members.userId,userId),eq(s.members.status,"ACTIVE")));const caregiverRows=rows.filter(row=>!isParentRole(row.member.role));const result:CaregiverAgendaItem[]=[];
  for(const row of caregiverRows){const [shift]=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,row.space.id),eq(s.shifts.memberId,row.member.id),eq(s.shifts.shiftDate,date))).limit(1);const assigned=await db.select({item:s.programItems}).from(s.programAssignees).innerJoin(s.programItems,eq(s.programAssignees.programItemId,s.programItems.id)).where(and(eq(s.programAssignees.memberId,row.member.id),eq(s.programItems.careSpaceId,row.space.id),eq(s.programItems.programDate,date))).orderBy(asc(s.programItems.plannedStart));const next=assigned.map(x=>x.item).find(item=>item.status==="PLANNED")||null;result.push({spaceId:row.space.id,spaceName:row.space.name,membershipId:row.member.id,shift:shift?{start:shift.plannedStart,end:shift.plannedEnd,status:shift.status}:null,next:next?{time:next.plannedStart,title:next.title,status:next.status}:null});}
  return result.sort((a,b)=>(a.shift?.start||"99:99").localeCompare(b.shift?.start||"99:99"));
}
