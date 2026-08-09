import Link from "next/link";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invitations, careSpaces } from "@/db/schema";
import { acceptInvitationAction } from "@/app/actions";
import { serverConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export default async function InvitePage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  if(!serverConfigured()) return <main className="authwrap"><div className="authcard"><h1>Invitation indisponible</h1><p className="muted">Le backend V3 n’est pas encore configuré.</p></div></main>;
  const hash=crypto.createHash("sha256").update(token).digest("hex");
  const [invite]=await db.select({invite:invitations,space:careSpaces}).from(invitations).innerJoin(careSpaces,eq(invitations.careSpaceId,careSpaces.id)).where(and(eq(invitations.tokenHash,hash),eq(invitations.status,"PENDING"))).limit(1);
  if(!invite||invite.invite.expiresAt<new Date()) return <main className="authwrap"><div className="authcard"><h1>Invitation expirée</h1><p className="muted">Demandez au parent de renvoyer l’invitation.</p></div></main>;
  const {auth}=await import("@/lib/auth"); const {headers}=await import("next/headers"); const session=await auth.api.getSession({headers:await headers()});
  if(!session){const next=`/invite/${token}`;return <main className="authwrap"><div className="authcard"><div className="logo">Y!</div><h1>Rejoindre {invite.space.name}</h1><p className="muted">Invitation pour <b>{invite.invite.email}</b> en tant que {invite.invite.role.toLowerCase().replace("_"," ")}.</p><div className="row wrap"><Link className="btn brandbtn" href={`/sign-up?next=${encodeURIComponent(next)}`}>Créer mon compte</Link><Link className="btn soft" href={`/sign-in?next=${encodeURIComponent(next)}`}>J’ai déjà un compte</Link></div></div></main>}
  return <main className="authwrap"><div className="authcard"><div className="logo">Y!</div><h1>Rejoindre {invite.space.name}</h1><p className="muted">Vous êtes connecté avec {session.user.email}.</p><form action={acceptInvitationAction}><input type="hidden" name="token" value={token}/><button className="btn brandbtn full">Accepter l’invitation</button></form></div></main>;
}
