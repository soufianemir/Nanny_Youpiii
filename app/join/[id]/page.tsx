import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import * as s from "@/db/schema";
import { auth } from "@/lib/auth";
import { validInvitationSignature } from "@/lib/invite-link";
import { acceptSharedInvitationAction } from "@/app/actions/invitation-link";
import { roleLabel } from "@/components/app/utils";

export const dynamic="force-dynamic";
export default async function JoinPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{sig?:string}>}){
  const {id}=await params;const {sig=""}=await searchParams;const [row]=await db.select({invite:s.invitations,space:s.careSpaces}).from(s.invitations).innerJoin(s.careSpaces,eq(s.invitations.careSpaceId,s.careSpaces.id)).where(and(eq(s.invitations.id,id),eq(s.invitations.status,"PENDING"))).limit(1);if(!row||!validInvitationSignature(row.invite.id,row.invite.email,sig))notFound();const {data}=await auth.getSession();const expired=row.invite.expiresAt.getTime()<Date.now();const callback=`/join/${id}?sig=${encodeURIComponent(sig)}`;
  return <main className="v4-onboarding"><section className="v4-onboarding-card"><span className="v4-logo">Y</span><span className="v4-eyebrow">Invitation sécurisée</span><h1>Rejoindre {row.space.name}</h1><p className="v4-onboarding-lead">Vous êtes invité(e) comme <strong>{roleLabel(row.invite.role)}</strong>. Une fois accepté, cette famille apparaîtra automatiquement dans votre sélecteur.</p><div className="v5-invite-summary"><span>Compte attendu</span><strong>{row.invite.email}</strong></div>{expired?<p className="v5-alert">Ce lien a expiré. Demandez à la famille de renvoyer l’invitation.</p>:!data?.user?<div className="v4-stack"><Link className="btn brandbtn full" href={`/auth/sign-in?callbackURL=${encodeURIComponent(callback)}`}>Se connecter</Link><Link className="btn soft full" href={`/auth/sign-up?callbackURL=${encodeURIComponent(callback)}`}>Créer mon compte</Link><p className="v4-form-help">Utilisez la même adresse e-mail que celle indiquée ci-dessus.</p></div>:data.user.email.toLowerCase()!==row.invite.email.toLowerCase()?<div className="v5-alert">Vous êtes connecté avec {data.user.email}. Cette invitation est destinée à {row.invite.email}.</div>:<form action={acceptSharedInvitationAction}><input type="hidden" name="invitationId" value={id}/><input type="hidden" name="sig" value={sig}/><button className="btn brandbtn full">Accepter et rejoindre la famille</button></form>}</section></main>;
}
