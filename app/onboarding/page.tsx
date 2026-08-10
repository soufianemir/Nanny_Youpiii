import { redirect } from "next/navigation";
import { createSpaceAction } from "@/app/actions/space";
import { requireUser } from "@/lib/security";
import { spacesForUser } from "@/lib/data";
import { serverConfigured } from "@/lib/env";
import { Icon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";
export default async function OnboardingPage(){
  if(!serverConfigured())redirect("/");
  const session=await requireUser();
  const spaces=await spacesForUser(session.user.id);
  if(spaces.length)redirect(`/app?space=${spaces[0].space.id}`);
  return <main className="v4-onboarding"><section className="v4-onboarding-card"><span className="v4-logo">Y</span><span className="v4-eyebrow">Bienvenue {session.user.name?.split(" ")[0]||""}</span><h1>Votre famille, en une minute.</h1><p className="v4-onboarding-lead">Créez l’espace et ajoutez votre premier enfant. Vous pourrez inviter les autres adultes directement depuis l’application.</p><div className="v4-onboarding-steps"><span className="is-active"><b>1</b>Famille</span><span><b>2</b>Enfant</span><span><b>3</b>Inviter</span><span><b>✓</b>Terminé</span></div><form className="v4-form" action={createSpaceAction}><div className="v4-field"><label>Nom de votre espace</label><input name="spaceName" placeholder="Famille Martin" required autoFocus/></div><div className="v4-field"><label>Prénom du premier enfant</label><input name="childName" placeholder="Emma" required/></div><div className="v4-field"><label>Date de naissance <span className="muted">· facultatif</span></label><input type="date" name="birthDate"/></div><button className="btn brandbtn full">Créer mon espace <Icon name="chevronRight" size={17}/></button></form><p className="v4-form-help">Ensuite : Plus → Équipe → Inviter. Pas de long assistant de configuration.</p></section></main>;
}
