import Link from "next/link";
import { redirect } from "next/navigation";
import { missingServerEnv, serverConfigured } from "@/lib/env";
import { Icon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function Home(){
  if(!serverConfigured()){
    const missing=missingServerEnv();
    return <main className="v4-main setup"><section className="v4-card"><span className="v4-logo">Y</span><h1>Nanny Youpiii</h1><p className="muted">Le frontend est prêt. La configuration serveur suivante est nécessaire.</p><div className="v4-divider"/>{missing.map(key=><div className="v4-list-row" key={key}><code>{key}</code><span className="v4-badge v4-badge-danger">Requis</span></div>)}</section></main>;
  }
  const {auth}=await import("@/lib/auth");
  const {data}=await auth.getSession();
  if(data?.user)redirect("/app");

  return <main className="v4-landing">
    <header className="v4-landing-header"><Link href="/" className="v4-brand"><span className="v4-logo">Y</span><span className="v4-brand-copy"><strong>Nanny Youpiii</strong><small>Le quotidien, bien transmis</small></span></Link><div className="v4-landing-header-actions"><Link className="btn soft" href="/auth/sign-in">Se connecter</Link><Link className="btn primary v4-desktop-cta" href="/auth/sign-up">Créer mon espace</Link></div></header>

    <section className="v4-landing-hero"><div><span className="v4-eyebrow">Parents · nounous · baby-sitters</span><h1>Organisez simplement le quotidien de vos enfants avec toutes les personnes qui s’en occupent.</h1><p className="v4-landing-lead">Chacun sait quoi faire, quand le faire et ce qu’il faut transmettre — sans messages dispersés ni organisation compliquée.</p><div className="v4-landing-actions"><Link className="btn brandbtn" href="/auth/sign-up">Créer mon espace</Link><Link className="btn soft" href="/demo?role=parent&section=today">Voir la démo <Icon name="chevronRight" size={17}/></Link></div><div className="v4-landing-proof"><span>Plusieurs enfants</span><span>Plusieurs parents</span><span>Plusieurs intervenants</span><span>Permissions fines</span></div></div>
      <div className="v4-landing-phone" aria-label="Aperçu de l’application"><div className="v4-landing-phone-screen"><div className="v4-mini-top"><span className="v4-avatar v4-avatar-sm">C</span><span><strong>Aujourd’hui</strong><small>Constance · 14:00 → 18:00</small></span></div><div className="v4-mini-next"><span className="v4-eyebrow">Ensuite</span><strong>15:00 · Parc</strong><small>Avec Aurore</small></div><div className="v4-mini-timeline"><div><time>14:00</time><span><Icon name="school" size={16}/></span><strong>Sortie d’école</strong><b>✓</b></div><div><time>14:30</time><span><Icon name="meal" size={16}/></span><strong>Goûter</strong></div><div><time>15:00</time><span><Icon name="park" size={16}/></span><strong>Parc</strong></div><div><time>17:15</time><span><Icon name="bath" size={16}/></span><strong>Bain</strong></div></div><div className="v4-mini-alert"><Icon name="alert" size={16}/><span>Bonnet de piscine dans le sac bleu</span></div></div></div>
    </section>

    <section className="v4-landing-section"><span className="v4-eyebrow">Une seule logique</span><h2>Prévoir. Faire. Transmettre.</h2><p>La profondeur reste disponible quand vous en avez besoin. Le reste du temps, l’application montre seulement la prochaine chose utile.</p><div className="v4-feature-line"><article><Icon name="sun"/><h3>Aujourd’hui</h3><p>La garde, le prochain geste et les consignes importantes en quelques secondes.</p></article><article><Icon name="calendar"/><h3>Planning</h3><p>Une timeline lisible pour le passé, aujourd’hui et les jours à venir.</p></article><article><Icon name="handover"/><h3>Transmission</h3><p>Une vraie continuité entre les adultes qui se relaient auprès des enfants.</p></article><article><Icon name="shopping"/><h3>Courses & caisse</h3><p>Un prix saisi une fois ; la caisse et l’avance éventuelle se calculent seules.</p></article></div></section>

    <section className="v4-landing-quote"><span>Parent → Enfant → Intervenant → Aujourd’hui → Action → Transmission</span><h2>Une application familiale qui ne ressemble pas à un back-office.</h2></section>

    <section className="v4-landing-cta"><div><span className="v4-eyebrow">Sans inscription</span><h2>Voyez d’abord comment ça fonctionne.</h2><p>Explorez exactement la même interface qu’un parent et qu’une intervenante avec une famille de démonstration.</p></div><div className="v4-landing-actions"><Link className="btn brandbtn" href="/demo?role=parent&section=today">Voir la démo</Link><Link className="btn soft" href="/auth/sign-up">Créer mon espace</Link></div></section>
    <footer className="v4-landing-footer"><span>Nanny Youpiii</span><span>Le quotidien des enfants, partagé avec les bonnes personnes.</span></footer>
  </main>;
}
