"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertMembers, text } from "@/lib/action-helpers";
import { requireMembership, requireParent } from "@/lib/security";
export async function addShiftAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  await requireParent(spaceId);
  const memberId=text(formData, "memberId");
  const [target]=await db.select().from(s.members).where(and(eq(s.members.id,memberId),eq(s.members.careSpaceId,spaceId))).limit(1);
  if(!target) throw new Error("Intervenant invalide");
  await db.insert(s.shifts).values({ careSpaceId: spaceId, memberId, shiftDate: text(formData, "date"), plannedStart: text(formData, "start"), plannedEnd: text(formData, "end"), status: "PLANNED" })
    .onConflictDoUpdate({target:[s.shifts.memberId,s.shifts.shiftDate],set:{plannedStart:text(formData,"start"),plannedEnd:text(formData,"end"),status:"PLANNED"}});
  revalidatePath("/app");
}

export async function saveScheduleRuleAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  await requireParent(spaceId);
  const memberId = text(formData, "memberId");
  await assertMembers(spaceId,[memberId]);
  const weekday = Number(text(formData, "weekday"));
  if(!Number.isInteger(weekday)||weekday<0||weekday>6) throw new Error("Jour invalide");
  await db.delete(s.scheduleRules).where(and(eq(s.scheduleRules.memberId, memberId), eq(s.scheduleRules.weekday, weekday)));
  if (text(formData, "active") === "on") {
    const start=text(formData,"start"), end=text(formData,"end"); if(!start||!end) throw new Error("Horaires requis");
    await db.insert(s.scheduleRules).values({ careSpaceId: spaceId, memberId, weekday, startTime: start, endTime: end, active: true });
  }
  revalidatePath("/app");
}

export async function startShiftAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const shiftId = text(formData, "shiftId");
  const { membership } = await requireMembership(spaceId);
  const [shift] = await db.select().from(s.shifts).where(and(eq(s.shifts.id, shiftId), eq(s.shifts.careSpaceId, spaceId), eq(s.shifts.memberId, membership.id))).limit(1);
  if (!shift) throw new Error("FORBIDDEN");
  await db.update(s.shifts).set({ actualStart: new Date(), status: "ACTIVE" }).where(eq(s.shifts.id, shiftId));
  revalidatePath("/app");
}

export async function endShiftAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const shiftId = text(formData, "shiftId");
  const { membership } = await requireMembership(spaceId);
  const [shift] = await db.select().from(s.shifts).where(and(eq(s.shifts.id, shiftId), eq(s.shifts.careSpaceId, spaceId), eq(s.shifts.memberId, membership.id))).limit(1);
  if (!shift) throw new Error("FORBIDDEN");
  await db.update(s.shifts).set({ actualEnd: new Date(), status: "ENDED", note: text(formData, "note") || null }).where(eq(s.shifts.id, shiftId));
  if (text(formData, "handover")) await db.insert(s.handovers).values({ careSpaceId: spaceId, handoverDate: shift.shiftDate, fromMemberId: membership.id, text: text(formData, "handover") });
  revalidatePath("/app");
}
