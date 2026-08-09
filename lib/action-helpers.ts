import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

export const money = (v: FormDataEntryValue | null) => Math.round(Number(v || 0) * 100) / 100;
export const text = (f: FormData, k: string) => String(f.get(k) || "").trim();
export const today = () => new Date().toISOString().slice(0,10);
export const log = async (tx: any, spaceId: string, userId: string, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) => {
  await tx.insert(s.activityLogs).values({ careSpaceId: spaceId, actorUserId: userId, action, entityType, entityId, metadata });
};

export async function allowedChildIds(memberId:string){
  return (await db.select({id:s.memberChildren.childId}).from(s.memberChildren).where(eq(s.memberChildren.memberId,memberId))).map(x=>x.id);
}
export async function assertChildren(memberId:string, childIds:string[]){
  if(!childIds.length) return;
  const allowed=await allowedChildIds(memberId);
  if(childIds.some(id=>!allowed.includes(id))) throw new Error("FORBIDDEN_CHILD");
}
export async function assertMembers(spaceId:string, memberIds:string[]){
  if(!memberIds.length) return;
  const rows=await db.select({id:s.members.id}).from(s.members).where(and(eq(s.members.careSpaceId,spaceId),inArray(s.members.id,memberIds)));
  if(rows.length!==new Set(memberIds).size) throw new Error("INVALID_MEMBER");
}
