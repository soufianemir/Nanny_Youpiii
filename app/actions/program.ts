"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertChildren, assertMembers, text } from "@/lib/action-helpers";
import { requireParent, requirePermission, isParentRole } from "@/lib/security";
export async function addInstructionAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session, membership } = await requireParent(spaceId);
  const childIds=formData.getAll("childIds").map(String); const memberIds=formData.getAll("memberIds").map(String);
  await assertChildren(membership.id,childIds); await assertMembers(spaceId,memberIds);
  await db.insert(s.instructions).values({
    careSpaceId: spaceId,
    kind: text(formData, "kind") as typeof s.instructionKind.enumValues[number],
    text: text(formData, "text"),
    validOn: text(formData, "validOn") || null,
    permanent: !text(formData, "validOn"),
    childIds,
    memberIds,
    createdBy: session.user.id,
  });
  revalidatePath("/app");
}

export async function addProgramItemAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session, membership } = await requireParent(spaceId);
  const childIds = formData.getAll("childIds").map(String);
  const memberIds = formData.getAll("memberIds").map(String);
  await assertChildren(membership.id, childIds); await assertMembers(spaceId, memberIds);
  const [item] = await db.insert(s.programItems).values({
    careSpaceId: spaceId, programDate: text(formData, "date"), type: text(formData, "type"), title: text(formData, "title"),
    description: text(formData, "description") || null, location: text(formData, "location") || null,
    plannedStart: text(formData, "start") || null, plannedEnd: text(formData, "end") || null, createdBy: session.user.id,
  }).returning();
  if (childIds.length) await db.insert(s.programChildren).values(childIds.map(childId => ({ programItemId: item.id, childId })));
  if (memberIds.length) await db.insert(s.programAssignees).values(memberIds.map(memberId => ({ programItemId: item.id, memberId })));
  revalidatePath("/app");
}

export async function updateProgramStatusAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const itemId = text(formData, "itemId");
  const { session, membership } = await requirePermission(spaceId, "program");
  if (!isParentRole(membership.role)) {
    const [assigned] = await db.select().from(s.programAssignees).where(and(eq(s.programAssignees.programItemId, itemId), eq(s.programAssignees.memberId, membership.id))).limit(1);
    if (!assigned) throw new Error("FORBIDDEN");
  }
  const status = text(formData, "status") as typeof s.programStatus.enumValues[number];
  if (!s.programStatus.enumValues.includes(status)) throw new Error("INVALID_STATUS");
  await db.update(s.programItems).set({
    status,
    note: text(formData, "note") || null,
    actualStart: status === "DONE" ? new Date() : null,
    actualEnd: status === "DONE" ? new Date() : null,
  }).where(and(eq(s.programItems.id, itemId), eq(s.programItems.careSpaceId, spaceId)));
  await db.insert(s.activityLogs).values({ careSpaceId: spaceId, actorUserId: session.user.id, action: "PROGRAM_STATUS_CHANGED", entityType: "program_item", entityId: itemId, metadata: { status: text(formData, "status") } });
  revalidatePath("/app");
}

export async function addTaskAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session, membership } = await requireParent(spaceId);
  const assignees = formData.getAll("memberIds").map(String);
  const childIds = formData.getAll("childIds").map(String);
  await assertChildren(membership.id, childIds); await assertMembers(spaceId, assignees);
  const [task] = await db.insert(s.tasks).values({ careSpaceId: spaceId, taskDate: text(formData, "date") || null, time: text(formData, "time") || null, title: text(formData, "title"), description: text(formData, "description") || null, createdBy: session.user.id }).returning();
  if (assignees.length) await db.insert(s.taskAssignees).values(assignees.map(memberId => ({ taskId: task.id, memberId })));
  if (childIds.length) await db.insert(s.taskChildren).values(childIds.map(childId => ({ taskId: task.id, childId })));
  revalidatePath("/app");
}

export async function updateTaskStatusAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const taskId = text(formData, "taskId");
  const { membership } = await requirePermission(spaceId, "tasks");
  if (!isParentRole(membership.role)) {
    const [assigned] = await db.select().from(s.taskAssignees).where(and(eq(s.taskAssignees.taskId, taskId), eq(s.taskAssignees.memberId, membership.id))).limit(1);
    if (!assigned) throw new Error("FORBIDDEN");
  }
  const status = text(formData, "status") as typeof s.taskStatus.enumValues[number];
  if (!s.taskStatus.enumValues.includes(status)) throw new Error("INVALID_STATUS");
  await db.update(s.tasks).set({ status, note: text(formData, "note") || null }).where(and(eq(s.tasks.id, taskId), eq(s.tasks.careSpaceId, spaceId)));
  revalidatePath("/app");
}

export async function addRoutineAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session } = await requireParent(spaceId);
  const [routine] = await db.insert(s.routines).values({ careSpaceId: spaceId, name: text(formData, "name"), description: text(formData, "description") || null, createdBy: session.user.id }).returning();
  const lines = text(formData, "items").split("\n").map(x=>x.trim()).filter(Boolean);
  if (lines.length) await db.insert(s.routineItems).values(lines.map((title, position) => ({ routineId: routine.id, title, position })));
  revalidatePath("/app");
}

export async function applyRoutineAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session, membership } = await requireParent(spaceId);
  const routineId = text(formData, "routineId");
  const memberId = text(formData, "memberId");
  const childId = text(formData, "childId");
  const taskDate = text(formData, "date");
  await assertMembers(spaceId,[memberId]); if(childId) await assertChildren(membership.id,[childId]);
  const [routine] = await db.select().from(s.routines).where(and(eq(s.routines.id, routineId), eq(s.routines.careSpaceId, spaceId))).limit(1);
  if (!routine) throw new Error("INVALID_ROUTINE");
  const items = await db.select().from(s.routineItems).where(eq(s.routineItems.routineId, routineId));
  for (const item of items) {
    const [task] = await db.insert(s.tasks).values({ careSpaceId: spaceId, taskDate, title: item.title, description: item.description, createdBy: session.user.id }).returning();
    await db.insert(s.taskAssignees).values({ taskId: task.id, memberId });
    if (childId) await db.insert(s.taskChildren).values({ taskId: task.id, childId });
  }
  revalidatePath("/app");
}
