import { redirect } from "next/navigation";
import {
  credentialPlatformAdminConfigured,
  currentPlatformAdmin,
  platformAdminPublicUsername,
} from "@/lib/platform-admin";
import { platformAdminLoginAction } from "./actions";
import styles from "../admin.module.css";

export const metadata = { title: "Connexion administration · Nanny Youpiii", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const current = await currentPlatformAdmin();
  if (current) redirect("/admin");
  const params = await searchParams;
  const configured = credentialPlatformAdminConfigured();

  return <main className={styles.page}>
    <section className={styles.setup}>
      <div className={styles.brand}><span className={styles.logo}>Y</span><span><strong>Nanny Youpiii Admin</strong><small>Accès support privé</small></span></div>
      <h1>Administration</h1>
      <p className={styles.muted}>Cet espace est séparé des comptes Parent et Nounou. Il permet uniquement les opérations de support de la plateforme.</p>

      {!configured ? <>
        <div className={styles.notice}>L’accès par identifiant n’est pas encore activé sur ce déploiement. Le mot de passe doit être ajouté aux variables d’environnement Vercel.</div>
        <code>PLATFORM_ADMIN_USERNAME={platformAdminPublicUsername()}{"\n"}PLATFORM_ADMIN_PASSWORD=••••••••••••</code>
      </> : <form action={platformAdminLoginAction} className={styles.form}>
        {params.error && <div className={styles.notice}>Identifiant ou mot de passe incorrect.</div>}
        <div className={styles.field}><label>Identifiant</label><input className={styles.input} name="username" defaultValue={platformAdminPublicUsername()} autoComplete="username" required autoFocus/></div>
        <div className={styles.field}><label>Mot de passe</label><input className={styles.input} name="password" type="password" autoComplete="current-password" required/></div>
        <button className={styles.buttonPrimary}>Se connecter</button>
      </form>}
    </section>
  </main>;
}
