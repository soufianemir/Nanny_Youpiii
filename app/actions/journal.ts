"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertChildren, text, today } from "@/lib/action-helpers";
import { requirePermission } from "@/lib/security";
export async function addDailyNoteAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { membership } = await requirePermission(spaceId, "journal");
  const childId=text(formData,"childId")||null; if(childId) await assertChildren(membership.id,[childId]);
  await db.insert(s.dailyNotes).values({ careSpaceId: spaceId, noteDate: text(formData, "date") || today(), memberId: membership.id, childId, kind: text(formData, "kind"), value: text(formData, "value"), comment: text(formData, "comment") || null });
  revalidatePath("/app");
}
