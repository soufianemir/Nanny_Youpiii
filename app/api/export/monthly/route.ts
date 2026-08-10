import { NextRequest } from "next/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { isParentRole, requireMembership } from "@/lib/security";
import { usersByIds } from "@/lib/directory";

export const dynamic="force-dynamic";
function bounds(month:string){if(!/^\d{4}-\d{2}$/.test(month))throw new Error("INVALID_MONTH");const [y,m]=month.split("-").map(Number);return {start:`${month}-01`,end:`${month}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,"0")}`};}
function hours(row:typeof s.shifts.$inferSelect){if(row.actualStart&&row.actualEnd)return Math.max(0,(row.actualEnd.getTime()-row.actualStart.getTime())/3600000);const [sh,sm]=row.plannedStart.split(":").map(Number),[eh,em]=row.plannedEnd.split(":").map(Number);return Math.max(0,(eh*60+em-sh*60-sm)/60);}
function csv(value:unknown){return `"${String(value??"").replace(/"/g,'""')}"`;}
export async function GET(request:NextRequest){
  const spaceId=request.nextUrl.searchParams.get("space")||"",month=request.nextUrl.searchParams.get("month")||"";const {membership}=await requireMembership(spaceId);const {start,end}=bounds(month);let rows=await db.select({shift:s.shifts,member:s.members}).from(s.shifts).innerJoin(s.members,eq(s.shifts.memberId,s.members.id)).where(and(eq(s.shifts.careSpaceId,spaceId),gte(s.shifts.shiftDate,start),lte(s.shifts.shiftDate,end))).orderBy(asc(s.shifts.shiftDate),asc(s.shifts.plannedStart));if(!isParentRole(membership.role))rows=rows.filter(row=>row.member.id===membership.id);const directory=await usersByIds([...new Set(rows.map(row=>row.member.userId))]);const lines=[["Date","Intervenant","Prévu début","Prévu fin","Statut","Heures"],...rows.map(({shift,member})=>[shift.shiftDate,directory.get(member.userId)?.name||member.label||member.role,shift.plannedStart,shift.plannedEnd,shift.status,hours(shift).toFixed(2)])];const body="\uFEFF"+lines.map(line=>line.map(csv).join(";")).join("\n");return new Response(body,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="nanny-youpiii-heures-${month}.csv"`}});
}
