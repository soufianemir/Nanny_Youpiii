import { redirect } from "next/navigation";
import { createSpaceAction } from "@/app/actions";
import { requireUser } from "@/lib/security";
import { spacesForUser } from "@/lib/data";
import { serverConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export default async function OnboardingPage(){
  if(!serverConfigured()) redirect("/");
  const session = await requireUser();
  const spaces = await spacesForUser(session.user.id);
  if (spaces.length) redirect(`/app?space=${spaces[0].space.id}`);
  return <main className="authwrap"><div className="authcard"><div className="logo">Y!</div><h1>Créer votre espace</h1><p className="muted">Commencez simplement. Vous pourrez ajouter d’autres enfants, parents et intervenants ensuite.</p><form className="form" action={createSpaceAction}><div className="field"><label>Nom de la famille / espace</label><input name="spaceName" placeholder="Famille Martin" required/></div><div className="field"><label>Prénom du premier enfant</label><input name="childName" placeholder="Emma" required/></div><div className="field"><label>Date de naissance (facultatif)</label><input type="date" name="birthDate"/></div><button className="btn brandbtn full">Créer l’espace</button></form></div></main>;
}
