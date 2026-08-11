"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { text } from "@/lib/action-helpers";
import { requireMembership } from "@/lib/security";
import { endShiftAsPlannedAction, endShiftWithFeedbackAction } from "@/app/actions/schedule";

async function makeShiftEndable(formData:FormData){
  const spaceId=text(formData,"spaceId"),shiftId=text(formData,"shiftId");
  const {membership}=await requireMembership(spaceId);
  const [shift]=await db.select({status:s.shifts.status}).from(s.shifts).where(and(eq(s.shifts.id,shiftId),eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,membership.id))).limit(1);
  if(!shift)throw new Error("SHIFT_NOT_ENDABLE");
  if(shift.status==="PLANNED")await db.update(s.shifts).set({status:"ACTIVE"}).where(and(eq(s.shifts.id,shiftId),eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,membership.id),eq(s.shifts.status,"PLANNED")));
  else if(shift.status!=="ACTIVE")throw new Error("SHIFT_NOT_ENDABLE");
}

export async function endShiftAsPlannedFlexibleAction(formData:FormData){await makeShiftEndable(formData);return endShiftAsPlannedAction(formData);}
export async function endShiftWithFeedbackFlexibleAction(formData:FormData){await makeShiftEndable(formData);return endShiftWithFeedbackAction(formData);}
