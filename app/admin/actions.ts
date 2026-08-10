"use server";

import crypto from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, pool } from "@/db";
import * as s from "@/db/schema";
import { auth } from "@/lib/auth";
import { authOrganizationIdForSpace, latestAuthInvitation } from "@/lib/membership-sync";
import { requirePlatformAdmin } from "@/lib/platform-admin";

const permissionKeys = ["children", "program", "tasks", "journal", "shopping", "cash"] as const;
const roleValues = new Set<string>(s.memberRole.enumValues);
const statusValues = new Set<string>(s.memberStatus.enumValues);
const text = (formData: FormData, key: string) => String(formData.get(key) || "").trim();

function selectedPermissions(formData: FormData, role: string) {
  if (role === "PARENT_ADMIN") return { all: true };
  const permissions: Record<string, boolean> = {};
  for (const key of permissionKeys) permissions[key] = formData.get(key) === "on";
  if (role !== "PARENT") permissions.children = false;
  if (permissions.shopping) permissions.cash = true;
  return permissions;
}

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

async function memberHasHistory(memberId: string) {
  const [expenses, advances, reimbursements, notes, shifts, handovers] = await Promise.all([
    db.select({ id: s.expenses.id }).from(s.expenses).where(eq(s.expenses.memberId, memberId)).limit(1),
    db.select({ id: s.caregiverAdvances.id }).from(s.caregiverAdvances).where(eq(s.caregiverAdvances.memberId, memberId)).limit(1),
    db.select({ id: s.reimbursements.id }).from(s.reimbursements).where(eq(s.reimbursements.memberId, memberId)).limit(1),
    db.select({ id: s.dailyNotes.id }).from(s.dailyNotes).where(eq(s.dailyNotes.memberId, memberId)).limit(1),
    db.select({ id: s.shifts.id }).from(s.shifts).where(eq(s.shifts.memberId, memberId)).limit(1),
    db.select({ id: s.handovers.id }).from(s.handovers).where(or(eq(s.handovers.fromMemberId, memberId), eq(s.handovers.toMemberId, memberId))).limit(1),
  ]);
  return [expenses, advances, reimbursements, notes, shifts, handovers].some((rows) => rows.length > 0);
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
  if (member.userId === session.user.id && status === "SUSPENDED") throw new Error("ADMIN_CANNOT_SUSPEND_SELF");

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
  if (!email || !roleValues.has(role) || role === "PARENT_ADMIN") throw new Error("ADMIN_INVALID_USER");
  await assertSpace(spaceId);
  const result = await pool.query<{ id: string }>('select id from neon_auth."user" where lower(email)=lower($1) limit 1', [email]);
  const userId = result.rows[0]?.id;
  if (!userId) throw new Error("ADMIN_AUTH_USER_NOT_FOUND");
  const [existing] = await db.select().from(s.members).where(and(eq(s.members.careSpaceId, spaceId), eq(s.members.userId, userId))).limit(1);
  if (existing) throw new Error("ADMIN_USER_ALREADY_MEMBER");

  const childIds = formData.getAll("childIds").map(String);
  await assertChildrenInSpace(spaceId, childIds);
  const permissions = selectedPermissions(formData, role);
  const organizationId = await authOrganizationIdForSpace(spaceId);

  await db.transaction(async (tx) => {
    const [member] = await tx.insert(s.members).values({ careSpaceId: spaceId, userId, role: role as typeof s.memberRole.enumValues[number], permissions }).returning();
    if (childIds.length) await tx.insert(s.memberChildren).values(childIds.map((childId) => ({ memberId: member.id, childId })));
    await tx.insert(s.activityLogs).values({ careSpaceId: spaceId, actorUserId: session.user.id, action: "PLATFORM_ADMIN_MEMBER_ADDED", entityType: "member", entityId: member.id, metadata: { email, role, childIds, permissions } });
  });

  await pool.query(
    'insert into neon_auth.member (id, "organizationId", "userId", role, "createdAt") values ($1,$2,$3,$4,now()) on conflict do nothing',
    [crypto.randomUUID(), organizationId, userId, "member"],
  );
  revalidatePath("/admin");
}

export async function adminInviteUserAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const spaceId = text(formData, "spaceId");
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role");
  if (!email || !roleValues.has(role) || role === "PARENT_ADMIN") throw new Error("ADMIN_INVALID_INVITATION");
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
  if (member.userId === session.user.id) throw new Error("ADMIN_CANNOT_REMOVE_SELF");
  await protectLastParentAdmin(member, "CAREGIVER", "SUSPENDED");
  if (await memberHasHistory(member.id)) throw new Error("ADMIN_MEMBER_HAS_HISTORY_USE_SUSPEND");

  const organizationId = await authOrganizationIdForSpace(member.careSpaceId);
  await audit(member.careSpaceId, session.user.id, "PLATFORM_ADMIN_MEMBER_REMOVED", "member", member.id, { userId: member.userId, role: member.role });
  await db.delete(s.members).where(eq(s.members.id, member.id));
  await pool.query('delete from neon_auth.member where "organizationId"=$1 and "userId"=$2', [organizationId, member.userId]);
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
    for (const member of memberships) await tx.insert(s.activityLogs).values({ careSpaceId: member.careSpaceId, actorUserId: session.user.id, action: "PLATFORM_ADMIN_USER_SUSPENDED", entityType: "user", entityId: userId, metadata: { memberId: member.id } });
  });
  revalidatePath("/admin");
}

export async function adminDeleteAuthUserAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const userId = text(formData, "userId");
  const confirmation = text(formData, "confirmation");
  if (!userId || userId === session.user.id) throw new Error("ADMIN_CANNOT_DELETE_SELF");
  if (confirmation !== "SUPPRIMER") throw new Error("ADMIN_DELETE_CONFIRMATION_REQUIRED");
  const memberships = await db.select({ id: s.members.id }).from(s.members).where(eq(s.members.userId, userId));
  if (memberships.length) throw new Error("ADMIN_DELETE_REQUIRES_ZERO_MEMBERSHIPS");
  await pool.query('delete from neon_auth.member where "userId"=$1', [userId]);
  await pool.query('delete from neon_auth."user" where id=$1', [userId]);
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
  const space = await assertSpace(spaceId);
  const name = text(formData, "name");
  const timezone = text(formData, "timezone") || "Europe/Paris";
  if (!name) throw new Error("ADMIN_SPACE_NAME_REQUIRED");
  await db.update(s.careSpaces).set({ name, timezone }).where(eq(s.careSpaces.id, space.id));
  await audit(space.id, session.user.id, "PLATFORM_ADMIN_SPACE_UPDATED", "care_space", space.id, { name, timezone });
  revalidatePath("/admin");
}
