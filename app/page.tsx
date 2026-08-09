import Link from "next/link";
import { redirect } from "next/navigation";
import { missingServerEnv, serverConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export default async function Home() {
  if (!serverConfigured()) {
    const missing = missingServerEnv();
    return <main className="main setup"><div className="card"><div className="logo">Y!</div><h1>Nanny Youpiii V3</h1><p className="muted">Le code V3 est déployé, mais le backend multi-utilisateurs attend ses ressources de production.</p><div className="divider"/><div className="sectiontitle">Configuration manquante</div><div className="list">{missing.map(k=><div className="item" key={k}><code>{k}</code><span className="pill red">requis</span></div>)}</div><p className="muted">Tant que ces secrets ne sont pas configurés, l’authentification reste volontairement désactivée : aucune fausse session ni donnée non sécurisée n’est créée.</p></div></main>;
  }
  const { auth } = await import("@/lib/auth");
  const { data } = await auth.getSession();
  if (data?.user) redirect("/app");
  return <main className="authwrap"><div className="authcard"><div className="logo">Y!</div><h1>Nanny Youpiii</h1><p className="muted">Le quotidien des enfants, partagé simplement entre toutes les personnes qui s’en occupent.</p><div className="row wrap" style={{marginTop:20}}><Link className="btn brandbtn" href="/auth/sign-up">Créer mon compte</Link><Link className="btn soft" href="/auth/sign-in">Se connecter</Link></div></div></main>;
}
