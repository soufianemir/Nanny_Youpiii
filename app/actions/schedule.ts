"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertMembers, text, today } from "@/lib/action-helpers";
import { EXCEPTION_SHIFT_NOTE } from "@/lib/coherence";
import { CARE_PERIOD_PREFIX, carePeriodNote, datesInPeriod, weekdayFromIso } from "@/lib/care-schedule";
import { isParentRole, requireMembership, requirePermission } from "@/lib/security";
import { notifySpaceUsers, trackProductEvent } from "@/lib/notifications";

async function requireParentPlanning(spaceId:string){const ctx=await requirePermission(spaceId,"program");if(!isParentRole(ctx.membership.role))throw new Error("FORBIDDEN");return ctx;}
async function scheduleContext(spaceId:string,memberId:string){await assertMembers(spaceId,[memberId]);const [target]=await db.select().from(s.members).where(and(eq(s.members.id,memberId),eq(s.members.careSpaceId,spaceId))).limit(1);if(!target||isParentRole(target.role))throw new Error("Intervenant invalide");const [space]=await db.select({timezone:s.careSpaces.timezone}).from(s.careSpaces).where(eq(s.careSpaces.id,spaceId)).limit(1);if(!space)throw new Error("Espace introuvable");return {target,timezone:space.timezone};}
async function memberChildIds(memberId:string){return (await db.select({id:s.memberChildren.childId}).from(s.memberChildren).where(eq(s.memberChildren.memberId,memberId))).map(item=>item.id);}

export async function addShiftAction(formData:FormData){const spaceId=text(formData,"spaceId");await requireParentPlanning(spaceId);const memberId=text(formData,"memberId");await scheduleContext(spaceId,memberId);const date=text(formData,"date"),start=text(formData,"start"),end=text(formData,"end");if(!date||!start||!end||end<=start)throw new Error("Horaires invalides");const [existing]=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId),eq(s.shifts.shiftDate,date))).limit(1);if(existing&&(existing.status==="ACTIVE"||existing.status==="ENDED"))throw new Error("Une garde commencée ou terminée ne peut plus être remplacée");await db.insert(s.shifts).values({careSpaceId:spaceId,memberId,shiftDate:date,plannedStart:start,plannedEnd:end,status:"PLANNED",note:EXCEPTION_SHIFT_NOTE}).onConflictDoUpdate({target:[s.shifts.memberId,s.shifts.shiftDate],set:{plannedStart:start,plannedEnd:end,status:"PLANNED",note:EXCEPTION_SHIFT_NOTE}});revalidatePath("/app");}
export async function updatePlannedShiftAction(formData:FormData){const spaceId=text(formData,"spaceId");await requireParentPlanning(spaceId);const shiftId=text(formData,"shiftId");const [shift]=await db.select().from(s.shifts).where(and(eq(s.shifts.id,shiftId),eq(s.shifts.careSpaceId,spaceId))).limit(1);if(!shift||shift.status!=="PLANNED")throw new Error("Garde non modifiable");const date=text(formData,"date"),start=text(formData,"start"),end=text(formData,"end");if(!date||!start||!end||end<=start)throw new Error("Horaires invalides");const [conflict]=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,shift.memberId),eq(s.shifts.shiftDate,date))).limit(1);if(conflict&&conflict.id!==shift.id){if(conflict.status==="ACTIVE"||conflict.status==="ENDED")throw new Error("Une garde commencée ou terminée existe déjà ce jour");await db.delete(s.shifts).where(eq(s.shifts.id,conflict.id));}await db.update(s.shifts).set({shiftDate:date,plannedStart:start,plannedEnd:end,status:"PLANNED",note:EXCEPTION_SHIFT_NOTE}).where(eq(s.shifts.id,shift.id));revalidatePath("/app");}
export async function removePlannedShiftAction(formData:FormData){const spaceId=text(formData,"spaceId");await requireParentPlanning(spaceId);const shiftId=text(formData,"shiftId");const [shift]=await db.select().from(s.shifts).where(and(eq(s.shifts.id,shiftId),eq(s.shifts.careSpaceId,spaceId))).limit(1);if(!shift||shift.status!=="PLANNED")throw new Error("Garde non modifiable");await db.delete(s.shifts).where(eq(s.shifts.id,shift.id));revalidatePath("/app");}
export async function saveCarePeriodAction(formData:FormData){const spaceId=text(formData,"spaceId");await requireParentPlanning(spaceId);const memberId=text(formData,"memberId");const {timezone}=await scheduleContext(spaceId,memberId);const periodStart=text(formData,"periodStart"),periodEnd=text(formData,"periodEnd");const allDates=datesInPeriod(periodStart,periodEnd);const weekdays=[1,2,3,4,5,6,0];const selected=weekdays.flatMap(weekday=>{if(formData.get(`day-${weekday}`)!=="on")return [];const start=text(formData,`start-${weekday}`),end=text(formData,`end-${weekday}`);if(!start||!end||end<=start)throw new Error("Horaires invalides");return [{weekday,start,end}];});const todayIso=today(timezone);const note=carePeriodNote(periodStart,periodEnd);await db.transaction(async tx=>{const existing=await tx.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId)));const removable=existing.filter(shift=>shift.status==="PLANNED"&&shift.shiftDate>=todayIso&&shift.note!==EXCEPTION_SHIFT_NOTE).map(shift=>shift.id);if(removable.length)await tx.delete(s.shifts).where(inArray(s.shifts.id,removable));await tx.delete(s.scheduleRules).where(and(eq(s.scheduleRules.careSpaceId,spaceId),eq(s.scheduleRules.memberId,memberId)));if(selected.length)await tx.insert(s.scheduleRules).values(selected.map(day=>({careSpaceId:spaceId,memberId,weekday:day.weekday,startTime:day.start,endTime:day.end,active:false})));const protectedDates=new Set(existing.filter(shift=>shift.status!=="PLANNED"||shift.note===EXCEPTION_SHIFT_NOTE).map(shift=>shift.shiftDate));const rows=allDates.filter(date=>date>=todayIso&&!protectedDates.has(date)).flatMap(date=>{const day=selected.find(candidate=>candidate.weekday===weekdayFromIso(date));return day?[{careSpaceId:spaceId,memberId,shiftDate:date,plannedStart:day.start,plannedEnd:day.end,status:"PLANNED" as const,note}]:[];});if(rows.length)await tx.insert(s.shifts).values(rows).onConflictDoNothing();});revalidatePath("/app");}
export async function saveScheduleRuleAction(formData:FormData){const spaceId=text(formData,"spaceId");await requireParentPlanning(spaceId);const memberId=text(formData,"memberId");await assertMembers(spaceId,[memberId]);const weekday=Number(text(formData,"weekday"));if(!Number.isInteger(weekday)||weekday<0||weekday>6)throw new Error("Jour invalide");const [space]=await db.select({timezone:s.careSpaces.timezone}).from(s.careSpaces).where(eq(s.careSpaces.id,spaceId)).limit(1);if(!space)throw new Error("Espace introuvable");const todayIso=today(space.timezone);const planned=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId),eq(s.shifts.status,"PLANNED")));const generatedIds=planned.filter(x=>x.note!==EXCEPTION_SHIFT_NOTE&&!x.note?.startsWith(CARE_PERIOD_PREFIX)&&x.shiftDate>=todayIso&&new Date(`${x.shiftDate}T12:00:00`).getDay()===weekday).map(x=>x.id);await db.delete(s.scheduleRules).where(and(eq(s.scheduleRules.careSpaceId,spaceId),eq(s.scheduleRules.memberId,memberId),eq(s.scheduleRules.weekday,weekday)));if(text(formData,"active")==="on"){const start=text(formData,"start"),end=text(formData,"end");if(!start||!end||end<=start)throw new Error("Horaires invalides");await db.insert(s.scheduleRules).values({careSpaceId:spaceId,memberId,weekday,startTime:start,endTime:end,active:true});if(generatedIds.length)await db.update(s.shifts).set({plannedStart:start,plannedEnd:end}).where(inArray(s.shifts.id,generatedIds));}else if(generatedIds.length)await db.delete(s.shifts).where(inArray(s.shifts.id,generatedIds));revalidatePath("/app");}

export async function startShiftAction(formData:FormData){const spaceId=text(formData,"spaceId"),shiftId=text(formData,"shiftId");const {session,membership}=await requireMembership(spaceId);const [started]=await db.update(s.shifts).set({actualStart:new Date(),status:"ACTIVE"}).where(and(eq(s.shifts.id,shiftId),eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,membership.id),eq(s.shifts.status,"PLANNED"))).returning({id:s.shifts.id});if(!started)throw new Error("SHIFT_NOT_STARTABLE");const childIds=await memberChildIds(membership.id);await trackProductEvent("SHIFT_STARTED",session.user.id,spaceId);await notifySpaceUsers({spaceId,excludeUserId:session.user.id,kind:"handovers",type:"SHIFT_STARTED",title:"La garde a commencé",body:"L’intervenant a confirmé le début de la garde.",url:`/app?space=${spaceId}&section=today`,childIds});revalidatePath("/app");}

type Shift=typeof s.shifts.$inferSelect;
type ProgramItem=typeof s.programItems.$inferSelect;
type Task=typeof s.tasks.$inferSelect;
type ShiftItems={program:ProgramItem[];tasks:Task[]};

function overlapsShift(start:string|null,end:string|null,shift:Shift){
  if(!start)return true;
  const finish=end||start;
  return start<=shift.plannedEnd&&finish>=shift.plannedStart;
}

async function activeShift(spaceId:string,shiftId:string,memberId:string){
  const [shift]=await db.select().from(s.shifts).where(and(eq(s.shifts.id,shiftId),eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId),eq(s.shifts.status,"ACTIVE"))).limit(1);
  if(!shift)throw new Error("SHIFT_NOT_ENDABLE");
  return shift;
}

async function assignedShiftItems(spaceId:string,memberId:string,shift:Shift):Promise<ShiftItems>{
  const programIds=(await db.select({id:s.programAssignees.programItemId}).from(s.programAssignees).where(eq(s.programAssignees.memberId,memberId))).map(row=>row.id);
  const program=programIds.length?(await db.select().from(s.programItems).where(and(eq(s.programItems.careSpaceId,spaceId),eq(s.programItems.programDate,shift.shiftDate),inArray(s.programItems.id,programIds)))).filter(item=>overlapsShift(item.plannedStart,item.plannedEnd,shift)):[];
  const taskIds=(await db.select({id:s.taskAssignees.taskId}).from(s.taskAssignees).where(eq(s.taskAssignees.memberId,memberId))).map(row=>row.id);
  const tasks=taskIds.length?(await db.select().from(s.tasks).where(and(eq(s.tasks.careSpaceId,spaceId),eq(s.tasks.taskDate,shift.shiftDate),inArray(s.tasks.id,taskIds)))).filter(item=>overlapsShift(item.time,item.time,shift)):[];
  return {program,tasks};
}

async function completeRemaining(items:ShiftItems,memberId:string){
  const now=new Date();
  const programIds=items.program.filter(item=>item.status==="PLANNED").map(item=>item.id);
  if(programIds.length)await db.update(s.programItems).set({status:"DONE",completedByMemberId:memberId,completedAt:now}).where(inArray(s.programItems.id,programIds));
  const taskIds=items.tasks.filter(item=>item.status==="TODO"||item.status==="IN_PROGRESS").map(item=>item.id);
  if(taskIds.length)await db.update(s.tasks).set({status:"DONE"}).where(inArray(s.tasks.id,taskIds));
}

function compact(value:string|null|undefined){return (value||"").replace(/\s*\n\s*/g,", ").trim();}
async function automaticHandover(spaceId:string,memberId:string,shift:Shift,opening?:string){
  const items=await assignedShiftItems(spaceId,memberId,shift);
  const lines:string[]=[];
  for(const item of items.program){
    if(item.status==="DONE"){const detail=compact(item.note)||compact(item.description);lines.push(`✓ ${item.title}${detail?` — ${detail}`:""}`);}
    if(item.status==="NOT_DONE")lines.push(`↪ ${item.title} — ${compact(item.note)||"non fait"}`);
  }
  for(const item of items.tasks){
    if(item.status==="DONE")lines.push(`✓ ${item.title}${compact(item.note)?` — ${compact(item.note)}`:""}`);
    if(item.status==="NOT_DONE")lines.push(`↪ ${item.title} — ${compact(item.note)||"non fait"}`);
  }
  const visible=lines.slice(0,12);const more=lines.length-visible.length;
  return [opening,visible.length?visible.join("\n"):"Rien de particulier à signaler.",more>0?`• +${more} autre${more>1?"s":""}`:""].filter(Boolean).join("\n");
}

async function closeShift(spaceId:string,shift:Shift,memberId:string,userId:string,summary:string){
  const [ended]=await db.update(s.shifts).set({actualEnd:new Date(),status:"ENDED"}).where(and(eq(s.shifts.id,shift.id),eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId),eq(s.shifts.status,"ACTIVE"))).returning({id:s.shifts.id});
  if(!ended)throw new Error("SHIFT_NOT_ENDABLE");
  await db.insert(s.handovers).values({careSpaceId:spaceId,handoverDate:shift.shiftDate,fromMemberId:memberId,text:summary});
  const childIds=await memberChildIds(memberId);
  await trackProductEvent("SHIFT_ENDED",userId,spaceId,{lightweightSummary:true});
  await notifySpaceUsers({spaceId,excludeUserId:userId,kind:"handovers",type:"SHIFT_ENDED",title:"Résumé de fin de garde",body:summary.replace(/\n/g," ").slice(0,220),url:`/app?space=${spaceId}&section=journal`,childIds});
  revalidatePath("/app");
}

async function copyProgramChildren(programItemId:string){return (await db.select({id:s.programChildren.childId}).from(s.programChildren).where(eq(s.programChildren.programItemId,programItemId))).map(row=>row.id);}
async function copyTaskChildren(taskId:string){return (await db.select({id:s.taskChildren.childId}).from(s.taskChildren).where(eq(s.taskChildren.taskId,taskId))).map(row=>row.id);}
async function createActualActivity({spaceId,date,title,description,memberId,userId,childIds,plannedStart}:{spaceId:string;date:string;title:string;description?:string|null;memberId:string;userId:string;childIds:string[];plannedStart?:string|null}){
  const cleanTitle=title.trim().slice(0,80);if(!cleanTitle)return;
  const [item]=await db.insert(s.programItems).values({careSpaceId:spaceId,programDate:date,type:"Autre",title:cleanTitle,description:description?.trim().slice(0,1200)||null,plannedStart:plannedStart||null,status:"DONE",createdBy:userId,completedByMemberId:memberId,completedAt:new Date()}).returning({id:s.programItems.id});
  if(childIds.length)await db.insert(s.programChildren).values(childIds.map(childId=>({programItemId:item.id,childId}))).onConflictDoNothing();
  await db.insert(s.programAssignees).values({programItemId:item.id,memberId}).onConflictDoNothing();
}

export async function endShiftAsPlannedAction(formData:FormData){
  const spaceId=text(formData,"spaceId"),shiftId=text(formData,"shiftId");const {session,membership}=await requireMembership(spaceId);const shift=await activeShift(spaceId,shiftId,membership.id);const items=await assignedShiftItems(spaceId,membership.id,shift);await completeRemaining(items,membership.id);const summary=await automaticHandover(spaceId,membership.id,shift,"Tout s’est passé comme prévu.");await closeShift(spaceId,shift,membership.id,session.user.id,summary);
}

export async function endShiftWithFeedbackAction(formData:FormData){
  const spaceId=text(formData,"spaceId"),shiftId=text(formData,"shiftId");const {session,membership}=await requireMembership(spaceId);const shift=await activeShift(spaceId,shiftId,membership.id);const items=await assignedShiftItems(spaceId,membership.id,shift);const now=new Date();
  for(const item of items.program){
    if(item.status==="DONE"||item.status==="NOT_DONE")continue;
    const outcome=text(formData,`outcome-program-${item.id}`)||"AS_PLANNED";const note=text(formData,`feedback-program-${item.id}`).trim().slice(0,1200);const replacement=text(formData,`replacement-program-${item.id}`).trim().slice(0,80);
    if(outcome==="NOT_DONE"){await db.update(s.programItems).set({status:"NOT_DONE",note:note||"Non fait"}).where(eq(s.programItems.id,item.id));continue;}
    if(outcome==="REPLACED"){
      const replacementTitle=replacement||"Activité adaptée";const replacementNote=`Remplacé par ${replacementTitle}${note?` — ${note}`:""}`;await db.update(s.programItems).set({status:"NOT_DONE",note:replacementNote}).where(eq(s.programItems.id,item.id));const childIds=await copyProgramChildren(item.id);await createActualActivity({spaceId,date:shift.shiftDate,title:replacementTitle,description:[`À la place de ${item.title}`,note].filter(Boolean).join(". "),memberId:membership.id,userId:session.user.id,childIds,plannedStart:item.plannedStart});continue;
    }
    await db.update(s.programItems).set({status:"DONE",note:outcome==="NOTE"?(note||null):item.note,completedByMemberId:membership.id,completedAt:now}).where(eq(s.programItems.id,item.id));
  }
  for(const item of items.tasks){
    if(item.status==="DONE"||item.status==="NOT_DONE")continue;
    const outcome=text(formData,`outcome-task-${item.id}`)||"AS_PLANNED";const note=text(formData,`feedback-task-${item.id}`).trim().slice(0,1200);const replacement=text(formData,`replacement-task-${item.id}`).trim().slice(0,80);
    if(outcome==="NOT_DONE"){await db.update(s.tasks).set({status:"NOT_DONE",note:note||"Non fait"}).where(eq(s.tasks.id,item.id));continue;}
    if(outcome==="REPLACED"){
      const replacementTitle=replacement||"Activité adaptée";const replacementNote=`Remplacé par ${replacementTitle}${note?` — ${note}`:""}`;await db.update(s.tasks).set({status:"NOT_DONE",note:replacementNote}).where(eq(s.tasks.id,item.id));const childIds=await copyTaskChildren(item.id);await createActualActivity({spaceId,date:shift.shiftDate,title:replacementTitle,description:[`À la place de ${item.title}`,note].filter(Boolean).join(". "),memberId:membership.id,userId:session.user.id,childIds,plannedStart:item.time});continue;
    }
    await db.update(s.tasks).set({status:"DONE",note:outcome==="NOTE"?(note||null):item.note}).where(eq(s.tasks.id,item.id));
  }
  const extraTitle=text(formData,"extraTitle").trim().slice(0,80);if(extraTitle){const allowed=await memberChildIds(membership.id);const requested=formData.getAll("extraChildIds").map(String).filter(id=>allowed.includes(id));await createActualActivity({spaceId,date:shift.shiftDate,title:extraTitle,description:text(formData,"extraDetails").trim().slice(0,1200)||null,memberId:membership.id,userId:session.user.id,childIds:requested.length?requested:allowed});}
  const general=text(formData,"handover").trim().slice(0,1600);const auto=await automaticHandover(spaceId,membership.id,shift,"La journée a été adaptée si nécessaire.");const summary=general?`${auto}\n\nÀ retenir : ${general}`:auto;await closeShift(spaceId,shift,membership.id,session.user.id,summary);
}

// Backward compatibility for any old form still posting to the former action.
export async function endShiftAction(formData:FormData){return endShiftWithFeedbackAction(formData);}
