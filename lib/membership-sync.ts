import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "@/db";
import * as s from "@/db/schema";

export const authOrgSlug = (spaceId: string) => `nanny-${spaceId}`;

export async function authOrganizationIdForSpace(spaceId: string) {
  const result = await pool.query<{ id: string }>(
    'select id from neon_auth.organization where slug = $1 limit 1',
    [authOrgSlug(spaceId)],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error("AUTH_ORGANIZATION_NOT_FOUND");
  return id;
}

export async function latestAuthInvitation(spaceId: string, email: string) {
  const organizationId = await authOrganizationIdForSpace(spaceId);
  const result = await pool.query<{ id: string; expiresAt: Date; status: string }>(
    'select id, "expiresAt", status from neon_auth.invitation where "organizationId" = $1 and lower(email) = lower($2) order by "createdAt" desc limit 1',
    [organizationId, email],
  );
  return result.rows[0] || null;
}

export async function syncAcceptedInvitations(userId: string, email: string) {
  const result = await pool.query<{
    invitationId: string;
    careSpaceId: string;
    role: typeof s.memberRole.enumValues[number];
    childIds: string[];
  }>(
    `select i.id as "invitationId", i.care_space_id as "careSpaceId", i.role, i.child_ids as "childIds"
       from invitations i
       join neon_auth.organization o on o.slug = ('nanny-' || i.care_space_id::text)
       join neon_auth.member am on am."organizationId" = o.id and am."userId" = $1
      where lower(i.email) = lower($2) and i.status = 'PENDING'`,
    [userId, email],
  );

  for (const invite of result.rows) {
    await db.transaction(async (tx) => {
      const defaults: Record<string, boolean> = invite.role === "PARENT" || invite.role === "PARENT_ADMIN"
        ? { program: true, shopping: true, cash: true }
        : { program: true, tasks: true, shopping: true, cash: true, journal: true };

      let [member] = await tx.insert(s.members).values({
        careSpaceId: invite.careSpaceId,
        userId,
        role: invite.role,
        permissions: defaults,
      }).onConflictDoNothing().returning();

      if (!member) {
        [member] = await tx.select().from(s.members).where(and(
          eq(s.members.careSpaceId, invite.careSpaceId),
          eq(s.members.userId, userId),
        )).limit(1);
      }

      if (member && invite.childIds?.length) {
        const validChildren = await tx.select({ id: s.children.id }).from(s.children).where(and(
          eq(s.children.careSpaceId, invite.careSpaceId),
          inArray(s.children.id, invite.childIds),
        ));
        if (validChildren.length) {
          await tx.insert(s.memberChildren).values(validChildren.map(({ id }) => ({ memberId: member.id, childId: id }))).onConflictDoNothing();
        }
      }

      await tx.update(s.invitations).set({ status: "ACCEPTED" }).where(eq(s.invitations.id, invite.invitationId));
    });
  }
}
