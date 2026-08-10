import { and, desc, eq, inArray } from "drizzle-orm";
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

export async function reconcileLegacyMemberships(userId: string, email: string) {
  const check = await pool.query<{ legacy: string | null }>(`select to_regclass('public."user"')::text as legacy`);
  if (!check.rows[0]?.legacy) return;

  await pool.query(
    `update members m
        set user_id = $1
       from public."user" legacy_user
      where m.user_id = legacy_user.id
        and lower(legacy_user.email) = lower($2)
        and not exists (
          select 1 from members current_member
           where current_member.care_space_id = m.care_space_id
             and current_member.user_id = $1
        )`,
    [userId, email],
  );
}

async function invitedPermissions(invitationId:string,role:typeof s.memberRole.enumValues[number]){
  const [event]=await db.select({metadata:s.activityLogs.metadata}).from(s.activityLogs).where(and(
    eq(s.activityLogs.entityType,"invitation"),
    eq(s.activityLogs.entityId,invitationId),
    eq(s.activityLogs.action,"INVITATION_SENT"),
  )).orderBy(desc(s.activityLogs.createdAt)).limit(1);
  const configured=event?.metadata?.permissions;
  if(configured&&typeof configured==="object"&&!Array.isArray(configured))return configured as Record<string,boolean>;
  return role === "PARENT" || role === "PARENT_ADMIN"
    ? { children: true, program: true, tasks: true, shopping: true, cash: true, journal: true }
    : { program: true, tasks: true, shopping: true, cash: true, journal: true };
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
    const permissions=await invitedPermissions(invite.invitationId,invite.role);
    await db.transaction(async (tx) => {
      let [member] = await tx.insert(s.members).values({
        careSpaceId: invite.careSpaceId,
        userId,
        role: invite.role,
        permissions,
      }).onConflictDoNothing().returning();

      if (!member) {
        [member] = await tx.select().from(s.members).where(and(
          eq(s.members.careSpaceId, invite.careSpaceId),
          eq(s.members.userId, userId),
        )).limit(1);
        if(member)await tx.update(s.members).set({permissions}).where(eq(s.members.id,member.id));
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
