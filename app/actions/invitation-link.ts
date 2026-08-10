"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { auth } from "@/lib/auth";
import { latestAuthInvitation, syncAcceptedInvitations } from "@/lib/membership-sync";
import { requireUser } from "@/lib/security";
import { validInvitationSignature } from "@/lib/invite-link";
import { text } from "@/lib/action-helpers";
import { trackProductEvent } from "@/lib/notifications";

export async function acceptSharedInvitationAction(formData:FormData){
  const id=text(formData,"invitationId"),sig=text(formData,"sig");const session=await requireUser();const [invite]=await db.select().from(s.invitations).where(and(eq(s.invitations.id,id),eq(s.invitations.status,"PENDING"))).limit(1);if(!invite||invite.expiresAt.getTime()<Date.now())throw new Error("INVITATION_EXPIRED");if(!validInvitationSignature(invite.id,invite.email,sig))throw new Error("INVITATION_INVALID");if(session.user.email.toLowerCase()!==invite.email.toLowerCase())throw new Error("Utilisez le compte correspondant à l’adresse invitée");
  const remote=await latestAuthInvitation(invite.careSpaceId,invite.email);if(!remote)throw new Error("AUTH_INVITATION_NOT_FOUND");if(remote.status==="pending"){const {error}=await auth.organization.acceptInvitation({invitationId:remote.id});if(error)throw new Error(error.message||"Impossible d’accepter l’invitation");}
  await syncAcceptedInvitations(session.user.id,session.user.email);await trackProductEvent("SHARED_INVITATION_ACCEPTED",session.user.id,invite.careSpaceId);redirect(`/app?space=${invite.careSpaceId}`);
}
