"use server";

import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, pool } from "@/db";
import * as s from "@/db/schema";
import { auth } from "@/lib/auth";
import { authOrganizationIdForSpace, latestAuthInvitation } from "@/lib/membership-sync";
import { requirePlatformAdmin } from "@/lib/platform-admin";

const roleValues = new Set<string>(s.memberRole.enumValues);
const statusValues = new Set<string>(s.memberStatus.enumValues);
const permissionKeys = ["children", "program", "tasks", "journal", "shopping", "cash"] as const;

const text = (formData: FormData, key: string) => String(formData.get(key) || "").trim();
const selectedPermissions = (formData: FormData, role: string) => {
  const result: Record<string, boolean> = {};
  for (const key of permissionKeys) result[key] = formData.get(key) === "on";
  if (role !== "PARENT") result.children = false;
  if (result.shopping) result.cash = true;
  return result;
};

async function assertSpace(spaceId: string) {
  const [space] = await db.select().from(s.careSpaces).where(eq(s.careSpaces.id, spaceId)).limit(1);
  if (!space) throw new Error("ADMIN_SPACE_NOT_FOUND");
  return space;
}

async function assertChildrenInSpace(spaceId: string, childIds: string[]) {
  if (!childIds.length) return;
  const rows = await db.select({ id: s.children.id }).from(s.children).where(and(eq(s.children.careSpaceId, spaceId), inArray(s.children.id, childIds)));
  if (rows.length !== new Set(childIds).size) throw new Error("ADMIN_INVALID_CHILD");
}

async function protectLastParentAdmin(member: typeof s.members.$inferSelect, nextRole: string, nextStatus: string) {
  if (member.role !== "PARENT_ADMIN" || member.status !== "ACTIVE") return;
  if (nextRole === "PARENT_ADMIN" && nextStatus === "ACTIVE") return;
  const admins = await db.select({ id: s.members.id }).from(s.members).where(and(
    eq(s.members.careSpaceId, member.careSpaceId),
    eq(s.members.role, "PARENT_ADMIN"),
    eq(s.members.status, "ACTIVE"),
  ));
  if (admins.length <= 1) throw new Error("ADMIN_LAST_PARENT_ADMIN");
}

async function audit(spaceId: string, actorUserId: string, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
  await db.insert(s.activityLogs).values({ careSpaceId: spaceId, actorUserId, action, entityType, entityId, metadata });
}

export async function adminUpdateMembershipAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const memberId = text(formData, "memberId");
  const [member] = await db.select().from(s.members).where(eq(s.members.id, memberId)).limit(1);
  if (!member) throw new Error("ADMIN_MEMBER_NOT_FOUND");

  const role = text(formData, "role");
  const status = text(formData, "status");
  if (!roleValues.has(role) || !statusValues.has(status)) throw new Error("ADMIN_INVALID_ROLE_OR_STATUS");
  await protectLastParentAdmin(member, role, status);

  const childIds = formData.getAll("childIds").map(String);
  await assertChildrenInSpace(member.careSpaceId, childIds);
  const permissions = selectedPermissions(formData, role);
  const label = text(formData, "label") || null;

  await db.transaction(async (tx) => {
    await tx.update(s.members).set({ role: role as typeof s.memberRole.enumValues[number], status: status as typeof s.memberStatus.enumValues[number], label, permissions }).where(eq(s.members.id, member.id));
    await tx.delete(s.memberChildren).where(eq(s.memberChildren.memberId, member.id));
    if (childIds.length) await tx.insert(s.memberChildren).values(childIds.map((childId) => ({ memberId: member.id, childId })));
    await tx.insert(s.activityLogs).values({ careSpaceId: member.careSpaceId, actorUserId: session.user.id, action: "PLATFORM_ADMIN_MEMBER_UPDATED", entityType: "member", entityId: member.id, metadata: { role, status, label, childIds, permissions } });
  });
  revalidatePath("/admin");
}

export async function adminAddExistingUserAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const email = text(formData, "email").toLowerCase();
  const spaceId = text(formData, "spaceId");
  const role = text(formData, "role");
  if (!email || !roleValues.has(role)) throw new Error("ADMIN_INVALID_USER");
  await assertSpace(spaceId);

  const result = await pool.query<{ id: string }>('select id from neon_auth."user" where lower(email)=lower($1) limit 1', [email]);
  const userId = result.rows[0]?.id;
  if (!userId) throw new Error("ADMIN_AUTH_USER_NOT_FOUND");
  const [existing] = await db.select().from(s.members).where(and(eq(s.members.careSpaceId, spaceId), eq(s.members.userId, userId))).limit(1);
  if (existing) throw new Error("ADMIN_USER_ALREADY_MEMBER");

  const childIds = formData.getAll("childIds").map(String);
  await assertChildrenInSpace(spaceId, childIds);
  const permissions = selectedPermissions(formData, role);
  await db.transaction(async (tx) => {
    const [member] = await tx.insert(s.members).values({ careSpaceId: spaceId, userId, role: role as typeof s.memberRole.enumValues[number], permissions }).returning();
    if (childIds.length) await tx.insert(s.memberChildren).values(childIds.map((childId) => ({ memberId: member.id, childId })));
    await tx.insert(s.activityLogs).values({ careSpaceId: spaceId, actorUserId: session.user.id, action: "PLATFORM_ADMIN_MEMBER_ADDED", entityType: "member", entityId: member.id, metadata: { email, role, childIds, permissions } });
  });
  revalidatePath("/admin");
}

export async function adminInviteUserAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const spaceId = text(formData, "spaceId");
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role");
  if (!email || !roleValues.has(role)) throw new Error("ADMIN_INVALID_INVITATION");
  await assertSpace(spaceId);
  const childIds = formData.getAll("childIds").map(String);
  await assertChildrenInSpace(spaceId, childIds);
  const permissions = selectedPermissions(formData, role);

  const organizationId = await authOrganizationIdForSpace(spaceId);
  const { error } = await auth.organization.inviteMember({ organizationId, email, role: "member" });
  if (error) throw new Error(error.message || "ADMIN_AUTH_INVITE_FAILED");
  const remoteInvite = await latestAuthInvitation(spaceId, email);
  if (!remoteInvite) throw new Error("ADMIN_REMOTE_INVITE_NOT_FOUND");
  const tokenHash = crypto.createHash("sha256").update(`neon:${remoteInvite.id}`).digest("hex");

  const [existing] = await db.select().from(s.invitations).where(and(eq(s.invitations.careSpaceId, spaceId), eq(s.invitations.email, email), eq(s.invitations.status, "PENDING"))).limit(1);
  const invitation = existing
    ? (await db.update(s.invitations).set({ role: role as typeof s.memberRole.enumValues[number], childIds, tokenHash, expiresAt: remoteInvite.expiresAt }).where(eq(s.invitations.id, existing.id)).returning())[0]
    : (await db.insert(s.invitations).values({ careSpaceId: spaceId, email, role: role as typeof s.memberRole.enumValues[number], tokenHash, childIds, invitedBy: session.user.id, expiresAt: remoteInvite.expiresAt }).returning())[0];

  await audit(spaceId, session.user.id, "INVITATION_SENT", "invitation", invitation.id, { email, role, childIds, permissions, platformAdmin: true });
  await audit(spaceId, session.user.id, "PLATFORM_ADMIN_INVITATION_SENT", "invitation", invitation.id, { email, role });
  revalidatePath("/admin");
}

export async function adminRemoveMembershipAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const memberId = text(formData, "memberId");
  const [member] = await db.select().from(s.members).where(eq(s.members.id, memberId)).limit(1);
  if (!member) throw new Error("ADMIN_MEMBER_NOT_FOUND");
  await protectLastParentAdmin(member, "CAREGIVER", "SUSPENDED");

  const [expenseRows, advanceRows, reimbursementRows] = await Promise.all([
    db.select({ id: s.expenses.id }).from(s.expenses).where(eq(s.expenses.memberId, member.id)).limit(1),
    db.select({ id: s.caregiverAdvances.id }).from(s.caregiverAdvances).where(eq(s.caregiverAdvances.memberId, member.id)).limit(1),
    db.select({ id: s.reimbursements.id }).from(s.reimbursements).where(eq(s.reimbursements.memberId, member.id)).limit(1),
  ]);
  if (expenseRows.length || advanceRows.length || reimbursementRows.length) throw new Error("ADMIN_MEMBER_HAS_FINANCIAL_HISTORY");

  await audit(member.careSpaceId, session.user.id, "PLATFORM_ADMIN_MEMBER_REMOVED", "member", member.id, { userId: member.userId, role: member.role });
  await db.delete(s.members).where(eq(s.members.id, member.id));
  revalidatePath("/admin");
}

export async function adminSuspendUserEverywhereAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const userId = text(formData, "userId");
  if (!userId || userId === session.user.id) throw new Error("ADMIN_CANNOT_SUSPEND_SELF");
  const memberships = await db.select().from(s.members).where(eq(s.members.userId, userId));
  for (const member of memberships) await protectLastParentAdmin(member, member.role, "SUSPENDED");
  await db.transaction(async (tx) => {
    await tx.update(s.members).set({ status: "SUSPENDED" }).where(eq(s.members.userId, userId));
    for (const member of memberships) {
      await tx.insert(s.activityLogs).values({ careSpaceId: member.careSpaceId, actorUserId: session.user.id, action: "PLATFORM_ADMIN_USER_SUSPENDED", entityType: "user", entityId: userId, metadata: { memberId: member.id } });
    }
  });
  revalidatePath("/admin");
}

export async function adminUpdateChildAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const childId = text(formData, "childId");
  const [child] = await db.select().from(s.children).where(eq(s.children.id, childId)).limit(1);
  if (!child) throw new Error("ADMIN_CHILD_NOT_FOUND");
  const firstName = text(formData, "firstName");
  if (!firstName) throw new Error("ADMIN_CHILD_NAME_REQUIRED");
  const birthDate = text(formData, "birthDate") || null;
  const notes = text(formData, "notes") || null;
  await db.update(s.children).set({ firstName, birthDate, notes }).where(eq(s.children.id, child.id));
  await audit(child.careSpaceId, session.user.id, "PLATFORM_ADMIN_CHILD_UPDATED", "child", child.id, { firstName, birthDate });
  revalidatePath("/admin");
}

export async function adminUpdateSpaceAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const spaceId = text(formData, "spaceId");
  const [space] = await db.select().from(s.careSpaces).where(eq(s.careSpaces.id, spaceId)).limit(1);
  if (!space) throw new Error("ADMIN_SPACE_NOT_FOUND");
  const name = text(formData, "name");
  const timezone = text(formData, "timezone") || "Europe/Paris";
  if (!name) throw new Error("ADMIN_SPACE_NAME_REQUIRED");
  await db.update(s.careSpaces).set({ name, timezone }).where(eq(s.careSpaces.id, space.id));
  await audit(space.id, session.user.id, "PLATFORM_ADMIN_SPACE_UPDATED", "care_space", space.id, { name, timezone });
  revalidatePath("/admin");
}
