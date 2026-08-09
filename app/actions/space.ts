"use server";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { assertChildren, log, text } from "@/lib/action-helpers";
import { requireAdmin, requireMembership, requireParent, requireUser, isParentRole } from "@/lib/security";
import { sendTransactionalEmail } from "@/lib/email";
export async function createSpaceAction(formData: FormData) {
  const session = await requireUser();
  const spaceName = text(formData, "spaceName");
  const childName = text(formData, "childName");
  const birthDate = text(formData, "birthDate") || null;
  if (!spaceName || !childName) throw new Error("Nom de l’espace et prénom de l’enfant requis");
  const spaceId = await db.transaction(async tx => {
    const [space] = await tx.insert(s.careSpaces).values({ name: spaceName, createdBy: session.user.id }).returning();
    const [member] = await tx.insert(s.members).values({ careSpaceId: space.id, userId: session.user.id, role: "PARENT_ADMIN", permissions: { all: true } }).returning();
    const [child] = await tx.insert(s.children).values({ careSpaceId: space.id, firstName: childName, birthDate }).returning();
    await tx.insert(s.memberChildren).values({ memberId: member.id, childId: child.id });
    await tx.insert(s.shoppingLists).values({ careSpaceId: space.id, name: "Courses" });
    await tx.insert(s.cashAccounts).values({ careSpaceId: space.id, balance: "0" });
    await log(tx, space.id, session.user.id, "SPACE_CREATED", "care_space", space.id);
    return space.id;
  });
  redirect(`/app?space=${spaceId}`);
}

export async function inviteMemberAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session, membership } = await requireAdmin(spaceId);
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role") as typeof s.memberRole.enumValues[number];
  const childIds = formData.getAll("childIds").map(String);
  await assertChildren(membership.id, childIds);
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await db.insert(s.invitations).values({ careSpaceId: spaceId, email, role, tokenHash, childIds, invitedBy: session.user.id, expiresAt });
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
  await sendTransactionalEmail({
    to: email,
    subject: "Invitation à rejoindre Nanny Youpiii",
    html: `<p>Vous êtes invité(e) à rejoindre un espace de garde Nanny Youpiii.</p><p><a href="${base}/invite/${rawToken}">Accepter l’invitation</a></p><p>Cette invitation expire dans 7 jours.</p>`,
  });
  revalidatePath("/app");
}

export async function acceptInvitationAction(formData: FormData) {
  const session = await requireUser();
  const rawToken = text(formData, "token");
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const [invite] = await db.select().from(s.invitations).where(and(eq(s.invitations.tokenHash, hash), eq(s.invitations.status, "PENDING"))).limit(1);
  if (!invite || invite.expiresAt < new Date()) throw new Error("Invitation invalide ou expirée");
  if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) throw new Error("Cette invitation appartient à une autre adresse e-mail");
  await db.transaction(async tx => {
    const defaults: Record<string, boolean> = isParentRole(invite.role)
      ? { program:true, shopping:true, cash:true }
      : { program:true, tasks:true, shopping:true, cash:true, journal:true };
    let [member] = await tx.insert(s.members).values({ careSpaceId: invite.careSpaceId, userId: session.user.id, role: invite.role, permissions: defaults }).onConflictDoNothing().returning();
    if (!member) [member] = await tx.select().from(s.members).where(and(eq(s.members.careSpaceId,invite.careSpaceId),eq(s.members.userId,session.user.id))).limit(1);
    if (member && invite.childIds.length) await tx.insert(s.memberChildren).values(invite.childIds.map(childId => ({ memberId: member.id, childId }))).onConflictDoNothing();
    await tx.update(s.invitations).set({ status: "ACCEPTED" }).where(eq(s.invitations.id, invite.id));
    await log(tx, invite.careSpaceId, session.user.id, "INVITATION_ACCEPTED", "invitation", invite.id);
  });
  redirect(`/app?space=${invite.careSpaceId}`);
}

export async function cancelInvitationAction(formData: FormData) {
  const spaceId=text(formData,"spaceId"); await requireAdmin(spaceId); const invitationId=text(formData,"invitationId");
  await db.update(s.invitations).set({status:"CANCELLED"}).where(and(eq(s.invitations.id,invitationId),eq(s.invitations.careSpaceId,spaceId))); revalidatePath("/app");
}

export async function resendInvitationAction(formData: FormData) {
  const spaceId=text(formData,"spaceId"); await requireAdmin(spaceId); const invitationId=text(formData,"invitationId");
  const [invite]=await db.select().from(s.invitations).where(and(eq(s.invitations.id,invitationId),eq(s.invitations.careSpaceId,spaceId))).limit(1);
  if(!invite) throw new Error("Invitation introuvable");
  const rawToken=crypto.randomBytes(32).toString("base64url"); const tokenHash=crypto.createHash("sha256").update(rawToken).digest("hex"); const expiresAt=new Date(Date.now()+7*24*3600*1000);
  await db.update(s.invitations).set({tokenHash,status:"PENDING",expiresAt}).where(eq(s.invitations.id,invite.id));
  const base=process.env.NEXT_PUBLIC_APP_URL||process.env.BETTER_AUTH_URL||"http://localhost:3000";
  await sendTransactionalEmail({to:invite.email,subject:"Nouvelle invitation — Nanny Youpiii",html:`<p>Votre invitation a été renouvelée.</p><p><a href="${base}/invite/${rawToken}">Accepter l’invitation</a></p>`}); revalidatePath("/app");
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
