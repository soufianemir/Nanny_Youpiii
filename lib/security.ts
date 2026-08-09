import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { members, memberChildren } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function requireMembership(careSpaceId: string) {
  const session = await requireUser();
  const [membership] = await db.select().from(members).where(and(
    eq(members.careSpaceId, careSpaceId), eq(members.userId, session.user.id), eq(members.status, "ACTIVE")
  )).limit(1);
  if (!membership) throw new Error("FORBIDDEN");
  return { session, membership };
}

export function isParentRole(role: string) { return role === "PARENT_ADMIN" || role === "PARENT"; }
export function isAdminRole(role: string) { return role === "PARENT_ADMIN"; }

export function hasPermission(membership: typeof members.$inferSelect, permission: string) {
  if (isParentRole(membership.role)) return true;
  return membership.permissions?.[permission] === true;
}

export async function requirePermission(careSpaceId: string, permission: string) {
  const ctx = await requireMembership(careSpaceId);
  if (!hasPermission(ctx.membership, permission)) throw new Error("FORBIDDEN");
  return ctx;
}

export async function requireParent(careSpaceId: string) {
  const ctx = await requireMembership(careSpaceId);
  if (!isParentRole(ctx.membership.role)) throw new Error("FORBIDDEN");
  return ctx;
}

export async function requireAdmin(careSpaceId: string) {
  const ctx = await requireMembership(careSpaceId);
  if (!isAdminRole(ctx.membership.role)) throw new Error("FORBIDDEN");
  return ctx;
}

export async function canAccessChild(memberId: string, childId: string) {
  const [row] = await db.select().from(memberChildren).where(and(eq(memberChildren.memberId, memberId), eq(memberChildren.childId, childId))).limit(1);
  return Boolean(row);
}
