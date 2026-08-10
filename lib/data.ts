import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { hasPermission, isAdminRole, isParentRole } from "@/lib/security";
import { allChildrenAllowed, canSeeCashFromPermissions, EXCEPTION_SHIFT_NOTE } from "@/lib/coherence";

export async function spacesForUser(userId: string) {
  return db.select({ member: s.members, space: s.careSpaces })
    .from(s.members).innerJoin(s.careSpaces, eq(s.members.careSpaceId, s.careSpaces.id))
    .where(and(eq(s.members.userId, userId), eq(s.members.status, "ACTIVE")));
}

async function materializeScheduleRules(spaceId:string, selectedDate:string){
  const weekday=new Date(`${selectedDate}T12:00:00`).getDay();
  const rules=await db.select().from(s.scheduleRules).where(and(eq(s.scheduleRules.careSpaceId,spaceId),eq(s.scheduleRules.weekday,weekday),eq(s.scheduleRules.active,true)));
  for(const rule of rules){
    const [existing]=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,rule.memberId),eq(s.shifts.shiftDate,selectedDate))).limit(1);
    if(!existing){
      await db.insert(s.shifts).values({careSpaceId:spaceId,memberId:rule.memberId,shiftDate:selectedDate,plannedStart:rule.startTime,plannedEnd:rule.endTime,status:"PLANNED"}).onConflictDoNothing();
    } else if(existing.status==="PLANNED" && existing.note!==EXCEPTION_SHIFT_NOTE && (existing.plannedStart!==rule.startTime||existing.plannedEnd!==rule.endTime)){
      await db.update(s.shifts).set({plannedStart:rule.startTime,plannedEnd:rule.endTime}).where(eq(s.shifts.id,existing.id));
    }
  }
}

export async function spaceSnapshot(spaceId: string, membership: typeof s.members.$inferSelect, selectedDate: string) {
  const parent = isParentRole(membership.role);
  const allowedChildIds = (await db.select({ childId: s.memberChildren.childId }).from(s.memberChildren).where(eq(s.memberChildren.memberId, membership.id))).map(x => x.childId);
  const allChildren = await db.select().from(s.children).where(eq(s.children.careSpaceId, spaceId)).orderBy(asc(s.children.firstName));
  const visibleChildren = allChildren.filter(c => allowedChildIds.includes(c.id));
  const team = parent ? await db.select().from(s.members).where(and(eq(s.members.careSpaceId, spaceId), eq(s.members.status, "ACTIVE"))) : [membership];

  await materializeScheduleRules(spaceId,selectedDate);
  const shiftsAll = await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId, spaceId), eq(s.shifts.shiftDate, selectedDate))).orderBy(asc(s.shifts.plannedStart));
  const canProgram=hasPermission(membership,"program");
  const canTasks=hasPermission(membership,"tasks");
  const shifts = !canProgram ? [] : parent ? shiftsAll : shiftsAll.filter(x=>x.memberId===membership.id);

  const programBase = await db.select().from(s.programItems).where(and(eq(s.programItems.careSpaceId, spaceId), eq(s.programItems.programDate, selectedDate))).orderBy(asc(s.programItems.plannedStart));
  const programLinks = programBase.length ? await db.select().from(s.programChildren).where(inArray(s.programChildren.programItemId,programBase.map(p=>p.id))) : [];
  const accessibleProgram = programBase.filter(p => {
    const links=programLinks.filter(l=>l.programItemId===p.id).map(l=>l.childId);
    return allChildrenAllowed(allowedChildIds,links);
  });
  let program=canProgram?accessibleProgram:[];
  let tasks = canTasks ? await db.select().from(s.tasks).where(and(eq(s.tasks.careSpaceId, spaceId), eq(s.tasks.taskDate, selectedDate))).orderBy(asc(s.tasks.time)) : [];
  const taskLinks = tasks.length ? await db.select().from(s.taskChildren).where(inArray(s.taskChildren.taskId,tasks.map(t=>t.id))) : [];
  tasks=tasks.filter(t=>{const links=taskLinks.filter(l=>l.taskId===t.id).map(l=>l.childId);return allChildrenAllowed(allowedChildIds,links);});
  if (!parent) {
    const assignedProgramIds = program.length ? (await db.select({ id: s.programAssignees.programItemId }).from(s.programAssignees).where(and(eq(s.programAssignees.memberId, membership.id),inArray(s.programAssignees.programItemId,program.map(p=>p.id))))).map(x=>x.id) : [];
    program = program.filter(p => assignedProgramIds.includes(p.id));
    const assignedTaskIds = tasks.length ? (await db.select({ id: s.taskAssignees.taskId }).from(s.taskAssignees).where(and(eq(s.taskAssignees.memberId, membership.id),inArray(s.taskAssignees.taskId,tasks.map(t=>t.id))))).map(x=>x.id) : [];
    tasks = tasks.filter(t => assignedTaskIds.includes(t.id));
  }
  const canJournal=hasPermission(membership,"journal");
  const allInstructions = canJournal ? await db.select().from(s.instructions).where(eq(s.instructions.careSpaceId, spaceId)) : [];
  const instructions=allInstructions.filter(i=>(i.permanent||i.validOn===selectedDate)&&allChildrenAllowed(allowedChildIds,i.childIds)&&(i.memberIds.length===0||i.memberIds.includes(membership.id)||parent));
  const lists = await db.select().from(s.shoppingLists).where(and(eq(s.shoppingLists.careSpaceId, spaceId), eq(s.shoppingLists.active, true))).limit(1);
  const canShop=hasPermission(membership,"shopping");
  let shopping = canShop&&lists[0] ? await db.select().from(s.shoppingItems).where(eq(s.shoppingItems.shoppingListId, lists[0].id)) : [];
  shopping=shopping.filter(i=>!i.childId||allowedChildIds.includes(i.childId));
  const canSeeCash=canSeeCashFromPermissions(canShop,hasPermission(membership,"cash"));
  const [cash] = canSeeCash ? await db.select().from(s.cashAccounts).where(eq(s.cashAccounts.careSpaceId, spaceId)).limit(1) : [undefined];
  const advances = !canSeeCash ? [] : parent
    ? await db.select().from(s.caregiverAdvances).where(eq(s.caregiverAdvances.careSpaceId, spaceId))
    : await db.select().from(s.caregiverAdvances).where(and(eq(s.caregiverAdvances.careSpaceId, spaceId), eq(s.caregiverAdvances.memberId, membership.id)));
  const expenses = !canShop ? [] : parent
    ? await db.select().from(s.expenses).where(and(eq(s.expenses.careSpaceId, spaceId), eq(s.expenses.expenseDate, selectedDate))).orderBy(desc(s.expenses.createdAt))
    : await db.select().from(s.expenses).where(and(eq(s.expenses.careSpaceId, spaceId), eq(s.expenses.memberId, membership.id), eq(s.expenses.expenseDate, selectedDate))).orderBy(desc(s.expenses.createdAt));
  let notes = !canJournal ? [] : parent
    ? await db.select().from(s.dailyNotes).where(and(eq(s.dailyNotes.careSpaceId, spaceId), eq(s.dailyNotes.noteDate, selectedDate))).orderBy(desc(s.dailyNotes.createdAt))
    : await db.select().from(s.dailyNotes).where(and(eq(s.dailyNotes.careSpaceId, spaceId), eq(s.dailyNotes.memberId, membership.id), eq(s.dailyNotes.noteDate, selectedDate))).orderBy(desc(s.dailyNotes.createdAt));
  notes=notes.filter(n=>!n.childId||allowedChildIds.includes(n.childId));
  const handovers=!canJournal?[]:parent
    ? await db.select().from(s.handovers).where(and(eq(s.handovers.careSpaceId,spaceId),eq(s.handovers.handoverDate,selectedDate))).orderBy(desc(s.handovers.createdAt))
    : await db.select().from(s.handovers).where(and(eq(s.handovers.careSpaceId,spaceId),eq(s.handovers.handoverDate,selectedDate),or(isNull(s.handovers.toMemberId),eq(s.handovers.toMemberId,membership.id)))).orderBy(desc(s.handovers.createdAt));
  const activity=isAdminRole(membership.role)?await db.select().from(s.activityLogs).where(eq(s.activityLogs.careSpaceId,spaceId)).orderBy(desc(s.activityLogs.createdAt)).limit(30):[];
  return { children: visibleChildren, team, shifts, program, tasks, instructions, shopping, cash, advances, expenses, notes, handovers, activity };
}
