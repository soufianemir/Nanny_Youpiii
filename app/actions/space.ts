"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertChildren, assertMembers, log, text } from "@/lib/action-helpers";
import { auth } from "@/lib/auth";
import { authOrganizationIdForSpace, authOrgSlug, latestAuthInvitation } from "@/lib/membership-sync";
import { requireAdmin, requireMembership, requireParent, requireUser } from "@/lib/security";

export async function createSpaceAction(formData: FormData) {
  const session = await requireUser();
  const spaceName = text(formData, "spaceName");
  const childName = text(formData, "childName");
  const birthDate = text(formData, "birthDate") || null;
  if (!spaceName || !childName) throw new Error("Nom de l’espace et prénom de l’enfant requis");

  const spaceId = await db.transaction(async (tx) => {
    const [space] = await tx.insert(s.careSpaces).values({ name: spaceName, createdBy: session.user.id }).returning();
    const [member] = await tx.insert(s.members).values({ careSpaceId: space.id, userId: session.user.id, role: "PARENT_ADMIN", permissions: { all: true } }).returning();
    const [child] = await tx.insert(s.children).values({ careSpaceId: space.id, firstName: childName, birthDate }).returning();
    await tx.insert(s.memberChildren).values({ memberId: member.id, childId: child.id });
    await tx.insert(s.shoppingLists).values({ careSpaceId: space.id, name: "Courses" });
    await tx.insert(s.cashAccounts).values({ careSpaceId: space.id, balance: "0" });
    await log(tx, space.id, session.user.id, "SPACE_CREATED", "care_space", space.id);
    return space.id;
  });

  const { error } = await auth.organization.create({ name: spaceName, slug: authOrgSlug(spaceId) });
  if (error) {
    await db.delete(s.careSpaces).where(eq(s.careSpaces.id, spaceId));
    throw new Error(error.message || "Impossible de créer l’espace sécurisé");
  }

  redirect(`/app?space=${spaceId}`);
}

export async function inviteMemberAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session, membership } = await requireAdmin(spaceId);
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role") as typeof s.memberRole.enumValues[number];
  const childIds = formData.getAll("childIds").map(String);
  if (!email || !s.memberRole.enumValues.includes(role)) throw new Error("Invitation invalide");
  await assertChildren(membership.id, childIds);

  const organizationId = await authOrganizationIdForSpace(spaceId);
  const { error } = await auth.organization.inviteMember({ organizationId, email, role: "member" });
  if (error) throw new Error(error.message || "Impossible d’envoyer l’invitation");

  const remoteInvite = await latestAuthInvitation(spaceId, email);
  if (!remoteInvite) throw new Error("Invitation Neon introuvable après création");
  const tokenHash = crypto.createHash("sha256").update(`neon:${remoteInvite.id}`).digest("hex");

  const [existing] = await db.select().from(s.invitations).where(and(
    eq(s.invitations.careSpaceId, spaceId),
    eq(s.invitations.email, email),
    eq(s.invitations.status, "PENDING"),
  )).limit(1);

  if (existing) {
    await db.update(s.invitations).set({ role, childIds, tokenHash, expiresAt: remoteInvite.expiresAt }).where(eq(s.invitations.id, existing.id));
  } else {
    await db.insert(s.invitations).values({
      careSpaceId: spaceId,
      email,
      role,
      tokenHash,
      childIds,
      invitedBy: session.user.id,
      expiresAt: remoteInvite.expiresAt,
    });
  }

  await db.insert(s.activityLogs).values({
    careSpaceId: spaceId,
    actorUserId: session.user.id,
    action: "INVITATION_SENT",
    entityType: "invitation",
    metadata: { email, role, childIds },
  });
  revalidatePath("/app");
}

export async function acceptInvitationAction() {
  throw new Error("Cette invitation doit être acceptée depuis le lien sécurisé reçu par e-mail.");
}

export async function cancelInvitationAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  await requireAdmin(spaceId);
  const invitationId = text(formData, "invitationId");
  const [invite] = await db.select().from(s.invitations).where(and(
    eq(s.invitations.id, invitationId),
    eq(s.invitations.careSpaceId, spaceId),
  )).limit(1);
  if (!invite) throw new Error("Invitation introuvable");

  const remoteInvite = await latestAuthInvitation(spaceId, invite.email);
  if (remoteInvite?.status === "pending") {
    const { error } = await auth.organization.cancelInvitation({ invitationId: remoteInvite.id });
    if (error) throw new Error(error.message || "Impossible d’annuler l’invitation");
  }
  await db.update(s.invitations).set({ status: "CANCELLED" }).where(eq(s.invitations.id, invitationId));
  revalidatePath("/app");
}

export async function resendInvitationAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  await requireAdmin(spaceId);
  const invitationId = text(formData, "invitationId");
  const [invite] = await db.select().from(s.invitations).where(and(
    eq(s.invitations.id, invitationId),
    eq(s.invitations.careSpaceId, spaceId),
  )).limit(1);
  if (!invite) throw new Error("Invitation introuvable");

  const organizationId = await authOrganizationIdForSpace(spaceId);
  const { error } = await auth.organization.inviteMember({ organizationId, email: invite.email, role: "member", resend: true });
  if (error) throw new Error(error.message || "Impossible de renvoyer l’invitation");

  const remoteInvite = await latestAuthInvitation(spaceId, invite.email);
  if (!remoteInvite) throw new Error("Invitation Neon introuvable après renvoi");
  const tokenHash = crypto.createHash("sha256").update(`neon:${remoteInvite.id}`).digest("hex");
  await db.update(s.invitations).set({ tokenHash, status: "PENDING", expiresAt: remoteInvite.expiresAt }).where(eq(s.invitations.id, invite.id));
  revalidatePath("/app");
}

export async function addChildAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session } = await requireParent(spaceId);
  const firstName = text(formData, "firstName");
  const birthDate = text(formData, "birthDate") || null;
  const [child] = await db.insert(s.children).values({ careSpaceId: spaceId, firstName, birthDate }).returning();
  const { membership } = await requireMembership(spaceId);
  await db.insert(s.memberChildren).values({ memberId: membership.id, childId: child.id }).onConflictDoNothing();
  await db.insert(s.activityLogs).values({ careSpaceId: spaceId, actorUserId: session.user.id, action: "CHILD_ADDED", entityType: "child", entityId: child.id });
  revalidatePath("/app");
}

export async function updateMemberAccessAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session, membership: adminMembership } = await requireAdmin(spaceId);
  const memberId = text(formData, "memberId");
  const childIds = formData.getAll("childIds").map(String);
  await assertMembers(spaceId, [memberId]);
  await assertChildren(adminMembership.id, childIds);
  const [target] = await db.select().from(s.members).where(and(eq(s.members.id, memberId), eq(s.members.careSpaceId, spaceId))).limit(1);
  if (!target || target.role === "PARENT" || target.role === "PARENT_ADMIN") throw new Error("INVALID_CAREGIVER");
  const permissions = {
    program: formData.get("program") === "on",
    tasks: formData.get("tasks") === "on",
    shopping: formData.get("shopping") === "on",
    cash: formData.get("cash") === "on",
    journal: formData.get("journal") === "on",
  };
  await db.transaction(async tx => {
    await tx.update(s.members).set({ permissions }).where(eq(s.members.id, memberId));
    await tx.delete(s.memberChildren).where(eq(s.memberChildren.memberId, memberId));
    if (childIds.length) await tx.insert(s.memberChildren).values(childIds.map(childId => ({ memberId, childId })));
    await log(tx, spaceId, session.user.id, "MEMBER_ACCESS_UPDATED", "member", memberId, { childIds, permissions });
  });
  revalidatePath("/app");
}
