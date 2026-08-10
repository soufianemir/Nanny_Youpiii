"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertMembers, text, today } from "@/lib/action-helpers";
import { EXCEPTION_SHIFT_NOTE } from "@/lib/coherence";
import { CARE_PERIOD_PREFIX, carePeriodNote, datesInPeriod, weekdayFromIso } from "@/lib/care-schedule";
import { isParentRole, requireMembership, requirePermission } from "@/lib/security";

async function requireParentPlanning(spaceId:string){
  const ctx=await requirePermission(spaceId,"program");
  if(!isParentRole(ctx.membership.role)) throw new Error("FORBIDDEN");
  return ctx;
}

async function scheduleContext(spaceId:string,memberId:string){
  await assertMembers(spaceId,[memberId]);
  const [target]=await db.select().from(s.members).where(and(eq(s.members.id,memberId),eq(s.members.careSpaceId,spaceId))).limit(1);
  if(!target||isParentRole(target.role))throw new Error("Intervenant invalide");
  const [space]=await db.select({timezone:s.careSpaces.timezone}).from(s.careSpaces).where(eq(s.careSpaces.id,spaceId)).limit(1);
  if(!space)throw new Error("Espace introuvable");
  return {target,timezone:space.timezone};
}

export async function addShiftAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  await requireParentPlanning(spaceId);
  const memberId=text(formData, "memberId");
  await scheduleContext(spaceId,memberId);
  const date=text(formData,"date"), start=text(formData,"start"), end=text(formData,"end");
  if(!date||!start||!end||end<=start)throw new Error("Horaires invalides");
  const [existing]=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId),eq(s.shifts.shiftDate,date))).limit(1);
  if(existing && (existing.status==="ACTIVE"||existing.status==="ENDED")) throw new Error("Une garde commencée ou terminée ne peut plus être remplacée");
  await db.insert(s.shifts).values({ careSpaceId: spaceId, memberId, shiftDate: date, plannedStart: start, plannedEnd: end, status: "PLANNED", note:EXCEPTION_SHIFT_NOTE })
    .onConflictDoUpdate({target:[s.shifts.memberId,s.shifts.shiftDate],set:{plannedStart:start,plannedEnd:end,status:"PLANNED",note:EXCEPTION_SHIFT_NOTE}});
  revalidatePath("/app");
}

export async function updatePlannedShiftAction(formData:FormData){
  const spaceId=text(formData,"spaceId");
  await requireParentPlanning(spaceId);
  const shiftId=text(formData,"shiftId");
  const [shift]=await db.select().from(s.shifts).where(and(eq(s.shifts.id,shiftId),eq(s.shifts.careSpaceId,spaceId))).limit(1);
  if(!shift||shift.status!=="PLANNED")throw new Error("Garde non modifiable");
  const date=text(formData,"date"),start=text(formData,"start"),end=text(formData,"end");
  if(!date||!start||!end||end<=start)throw new Error("Horaires invalides");
  const [conflict]=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,shift.memberId),eq(s.shifts.shiftDate,date))).limit(1);
  if(conflict&&conflict.id!==shift.id){
    if(conflict.status==="ACTIVE"||conflict.status==="ENDED")throw new Error("Une garde commencée ou terminée existe déjà ce jour");
    await db.delete(s.shifts).where(eq(s.shifts.id,conflict.id));
  }
  await db.update(s.shifts).set({shiftDate:date,plannedStart:start,plannedEnd:end,status:"PLANNED",note:EXCEPTION_SHIFT_NOTE}).where(eq(s.shifts.id,shift.id));
  revalidatePath("/app");
}

export async function removePlannedShiftAction(formData:FormData){
  const spaceId=text(formData,"spaceId");
  await requireParentPlanning(spaceId);
  const shiftId=text(formData,"shiftId");
  const [shift]=await db.select().from(s.shifts).where(and(eq(s.shifts.id,shiftId),eq(s.shifts.careSpaceId,spaceId))).limit(1);
  if(!shift||shift.status!=="PLANNED")throw new Error("Garde non modifiable");
  await db.delete(s.shifts).where(eq(s.shifts.id,shift.id));
  revalidatePath("/app");
}

export async function saveCarePeriodAction(formData:FormData){
  const spaceId=text(formData,"spaceId");
  await requireParentPlanning(spaceId);
  const memberId=text(formData,"memberId");
  const {timezone}=await scheduleContext(spaceId,memberId);
  const periodStart=text(formData,"periodStart");
  const periodEnd=text(formData,"periodEnd");
  const allDates=datesInPeriod(periodStart,periodEnd);
  const weekdays=[1,2,3,4,5,6,0];
  const selected=weekdays.flatMap(weekday=>{
    if(formData.get(`day-${weekday}`)!=="on")return [];
    const start=text(formData,`start-${weekday}`);
    const end=text(formData,`end-${weekday}`);
    if(!start||!end||end<=start)throw new Error("Horaires invalides");
    return [{weekday,start,end}];
  });
  const todayIso=today(timezone);
  const note=carePeriodNote(periodStart,periodEnd);

  await db.transaction(async tx=>{
    const existing=await tx.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId)));
    const removable=existing.filter(shift=>shift.status==="PLANNED"&&shift.shiftDate>=todayIso&&shift.note!==EXCEPTION_SHIFT_NOTE).map(shift=>shift.id);
    if(removable.length)await tx.delete(s.shifts).where(inArray(s.shifts.id,removable));

    await tx.delete(s.scheduleRules).where(and(eq(s.scheduleRules.careSpaceId,spaceId),eq(s.scheduleRules.memberId,memberId)));
    if(selected.length)await tx.insert(s.scheduleRules).values(selected.map(day=>({
      careSpaceId:spaceId,
      memberId,
      weekday:day.weekday,
      startTime:day.start,
      endTime:day.end,
      active:false,
    })));

    const protectedDates=new Set(existing.filter(shift=>shift.status!=="PLANNED"||shift.note===EXCEPTION_SHIFT_NOTE).map(shift=>shift.shiftDate));
    const rows=allDates.filter(date=>date>=todayIso&&!protectedDates.has(date)).flatMap(date=>{
      const day=selected.find(candidate=>candidate.weekday===weekdayFromIso(date));
      return day?[{careSpaceId:spaceId,memberId,shiftDate:date,plannedStart:day.start,plannedEnd:day.end,status:"PLANNED" as const,note}]:[];
    });
    if(rows.length)await tx.insert(s.shifts).values(rows).onConflictDoNothing();
  });
  revalidatePath("/app");
}

export async function saveScheduleRuleAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  await requireParentPlanning(spaceId);
  const memberId = text(formData, "memberId");
  await assertMembers(spaceId,[memberId]);
  const weekday = Number(text(formData, "weekday"));
  if(!Number.isInteger(weekday)||weekday<0||weekday>6) throw new Error("Jour invalide");
  const [space]=await db.select({timezone:s.careSpaces.timezone}).from(s.careSpaces).where(eq(s.careSpaces.id,spaceId)).limit(1);
  if(!space) throw new Error("Espace introuvable");
  const todayIso=today(space.timezone);
  const planned=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId),eq(s.shifts.status,"PLANNED")));
  const generatedIds=planned.filter(x=>x.note!==EXCEPTION_SHIFT_NOTE&&!x.note?.startsWith(CARE_PERIOD_PREFIX)&&x.shiftDate>=todayIso&&new Date(`${x.shiftDate}T12:00:00`).getDay()===weekday).map(x=>x.id);

  await db.delete(s.scheduleRules).where(and(eq(s.scheduleRules.careSpaceId,spaceId),eq(s.scheduleRules.memberId, memberId), eq(s.scheduleRules.weekday, weekday)));
  if (text(formData, "active") === "on") {
    const start=text(formData,"start"), end=text(formData,"end"); if(!start||!end||end<=start) throw new Error("Horaires invalides");
    await db.insert(s.scheduleRules).values({ careSpaceId: spaceId, memberId, weekday, startTime: start, endTime: end, active: true });
    if(generatedIds.length) await db.update(s.shifts).set({plannedStart:start,plannedEnd:end}).where(inArray(s.shifts.id,generatedIds));
  } else if(generatedIds.length) {
    await db.delete(s.shifts).where(inArray(s.shifts.id,generatedIds));
  }
  revalidatePath("/app");
}

export async function startShiftAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const shiftId = text(formData, "shiftId");
  const { membership } = await requireMembership(spaceId);
  const [started] = await db.update(s.shifts)
    .set({ actualStart: new Date(), status: "ACTIVE" })
    .where(and(
      eq(s.shifts.id, shiftId),
      eq(s.shifts.careSpaceId, spaceId),
      eq(s.shifts.memberId, membership.id),
      eq(s.shifts.status, "PLANNED"),
    ))
    .returning({ id: s.shifts.id });
  if (!started) throw new Error("SHIFT_NOT_STARTABLE");
  revalidatePath("/app");
}

export async function endShiftAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const shiftId = text(formData, "shiftId");
  const { membership } = await requireMembership(spaceId);
  const note = text(formData, "note") || null;
  const [ended] = await db.update(s.shifts)
    .set({ actualEnd: new Date(), status: "ENDED", note })
    .where(and(
      eq(s.shifts.id, shiftId),
      eq(s.shifts.careSpaceId, spaceId),
      eq(s.shifts.memberId, membership.id),
      eq(s.shifts.status, "ACTIVE"),
    ))
    .returning({ shiftDate: s.shifts.shiftDate });
  if (!ended) throw new Error("SHIFT_NOT_ENDABLE");
  const handover = text(formData, "handover");
  if (handover) await db.insert(s.handovers).values({ careSpaceId: spaceId, handoverDate: ended.shiftDate, fromMemberId: membership.id, text: handover });
  revalidatePath("/app");
}
