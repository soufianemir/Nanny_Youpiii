"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertMembers, text } from "@/lib/action-helpers";
import { DAY_OFF_SHIFT_NOTE } from "@/lib/care-schedule";
import { isParentRole, requirePermission } from "@/lib/security";

export async function cancelShiftDateAction(formData:FormData){
  const spaceId=text(formData,"spaceId");const {membership}=await requirePermission(spaceId,"program");if(!isParentRole(membership.role))throw new Error("FORBIDDEN");const memberId=text(formData,"memberId"),date=text(formData,"date");if(!memberId||!date)throw new Error("Date invalide");await assertMembers(spaceId,[memberId]);const [target]=await db.select().from(s.members).where(and(eq(s.members.id,memberId),eq(s.members.careSpaceId,spaceId))).limit(1);if(!target||isParentRole(target.role))throw new Error("Intervenant invalide");const [existing]=await db.select().from(s.shifts).where(and(eq(s.shifts.careSpaceId,spaceId),eq(s.shifts.memberId,memberId),eq(s.shifts.shiftDate,date))).limit(1);if(existing?.status==="ACTIVE"||existing?.status==="ENDED")throw new Error("Une garde commencée ou terminée ne peut plus être annulée");if(existing)await db.update(s.shifts).set({status:"CANCELLED",note:DAY_OFF_SHIFT_NOTE}).where(eq(s.shifts.id,existing.id));else await db.insert(s.shifts).values({careSpaceId:spaceId,memberId,shiftDate:date,plannedStart:"00:00",plannedEnd:"00:01",status:"CANCELLED",note:DAY_OFF_SHIFT_NOTE}).onConflictDoUpdate({target:[s.shifts.memberId,s.shifts.shiftDate],set:{status:"CANCELLED",note:DAY_OFF_SHIFT_NOTE}});revalidatePath("/app");
}
