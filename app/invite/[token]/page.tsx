import Link from "next/link";

export default function InvitePage(){
  return <main className="authwrap"><div className="authcard"><div className="logo">Y!</div><h1>Lien d’invitation remplacé</h1><p className="muted">Les invitations Nanny Youpiii sont maintenant sécurisées par Neon Auth. Demandez au parent de renvoyer l’invitation depuis l’application.</p><Link className="btn soft" href="/auth/sign-in">Se connecter</Link></div></main>;
}
