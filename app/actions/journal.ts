"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertChildren, text, today } from "@/lib/action-helpers";
import { isParentRole, requirePermission } from "@/lib/security";

export async function addDailyNoteAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { membership } = await requirePermission(spaceId, "journal");
  const childId=text(formData,"childId")||null; if(childId) await assertChildren(membership.id,[childId]);
  await db.insert(s.dailyNotes).values({ careSpaceId: spaceId, noteDate: text(formData, "date") || today(), memberId: membership.id, childId, kind: text(formData, "kind"), value: text(formData, "value"), comment: text(formData, "comment") || null });
  revalidatePath("/app");
}

export async function updateDailyNoteAction(formData: FormData) {
  const spaceId=text(formData,"spaceId");
  const noteId=text(formData,"noteId");
  const { membership }=await requirePermission(spaceId,"journal");
  const [note]=await db.select().from(s.dailyNotes).where(and(eq(s.dailyNotes.id,noteId),eq(s.dailyNotes.careSpaceId,spaceId))).limit(1);
  if(!note)throw new Error("NOTE_NOT_FOUND");
  if(note.memberId!==membership.id&&!isParentRole(membership.role))throw new Error("FORBIDDEN");
  const childId=text(formData,"childId")||null;
  if(childId)await assertChildren(membership.id,[childId]);
  const value=text(formData,"value");
  if(!value)throw new Error("NOTE_VALUE_REQUIRED");
  await db.update(s.dailyNotes).set({
    childId,
    kind:text(formData,"kind")||note.kind,
    value,
    comment:text(formData,"comment")||null,
  }).where(and(eq(s.dailyNotes.id,noteId),eq(s.dailyNotes.careSpaceId,spaceId)));
  revalidatePath("/app");
}
