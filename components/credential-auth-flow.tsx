"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function messageOf(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message || "");
  return String(error || "Une erreur est survenue.");
}

function emailVerificationRequired(message: string) {
  const value = message.toLowerCase();
  return value.includes("email verification") || value.includes("verify your email") || value.includes("verification required");
}

export function CredentialsSignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      await authClient.signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        fetchOptions: { throw: true },
      });
      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (e) {
      setError(messageOf(e) || "Impossible de créer le compte.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack auth-flow">
      <div>
        <h2>Créer mon compte</h2>
        <p className="muted">Créez votre compte parent. Nous vous demanderons ensuite le code reçu par e-mail.</p>
      </div>
      <form className="form" onSubmit={submit}>
        <div className="field"><label htmlFor="signup-name">Prénom et nom</label><input id="signup-name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required /></div>
        <div className="field"><label htmlFor="signup-email">E-mail</label><input id="signup-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div className="field"><label htmlFor="signup-password">Mot de passe</label><input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required /></div>
        <div className="field"><label htmlFor="signup-confirm">Confirmer le mot de passe</label><input id="signup-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={8} required /></div>
        {error && <div className="auth-message error" role="alert">{error}</div>}
        <button className="btn primary full" disabled={busy}>{busy ? "Création…" : "Créer mon compte"}</button>
      </form>
      <p className="muted auth-switch">Déjà un compte ? <Link href="/auth/sign-in"><b>Se connecter</b></Link></p>
    </div>
  );
}

export function CredentialsSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function goToVerification() {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    try {
      await authClient.emailOtp.sendVerificationOtp({ email: normalized, type: "email-verification", fetchOptions: { throw: true } });
    } catch {
      // A code may already be valid. The verification screen also offers an explicit resend action.
    }
    router.push(`/verify-email?email=${encodeURIComponent(normalized)}`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await authClient.signIn.email({ email: email.trim().toLowerCase(), password, fetchOptions: { throw: true } });
      router.replace("/app");
      router.refresh();
    } catch (e) {
      const message = messageOf(e);
      if (emailVerificationRequired(message)) {
        await goToVerification();
        return;
      }
      setError(message || "E-mail ou mot de passe incorrect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack auth-flow">
      <div>
        <h2>Se connecter</h2>
        <p className="muted">Retrouvez votre famille, votre planning et vos transmissions.</p>
      </div>
      <form className="form" onSubmit={submit}>
        <div className="field"><label htmlFor="signin-email">E-mail</label><input id="signin-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div className="field"><div className="row between"><label htmlFor="signin-password">Mot de passe</label><Link className="auth-inline-link" href="/auth/forgot-password">Mot de passe oublié ?</Link></div><input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
        {error && <div className="auth-message error" role="alert">{error}</div>}
        <button className="btn primary full" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      </form>
      <button type="button" className="btn soft full" disabled={busy || !email.trim()} onClick={goToVerification}>J’ai un code de vérification</button>
      <p className="muted auth-switch">Pas encore de compte ? <Link href="/auth/sign-up"><b>Créer mon compte</b></Link></p>
    </div>
  );
}

export function EmailVerification({ initialEmail }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(initialEmail ? "Un code à 6 chiffres a été envoyé à votre adresse e-mail." : "");
  const [busy, setBusy] = useState(false);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  async function sendCode() {
    setError("");
    if (!normalizedEmail) {
      setError("Saisissez votre adresse e-mail.");
      return;
    }
    setBusy(true);
    try {
      await authClient.emailOtp.sendVerificationOtp({ email: normalizedEmail, type: "email-verification", fetchOptions: { throw: true } });
      setInfo("Nouveau code envoyé. Vérifiez votre boîte e-mail.");
    } catch (e) {
      setError(messageOf(e) || "Impossible d’envoyer le code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (code.replace(/\D/g, "").length !== 6) {
      setError("Saisissez les 6 chiffres reçus par e-mail.");
      return;
    }
    setBusy(true);
    try {
      await authClient.emailOtp.verifyEmail({ email: normalizedEmail, otp: code.replace(/\D/g, ""), fetchOptions: { throw: true } });
      router.replace("/onboarding");
      router.refresh();
    } catch (e) {
      setError(messageOf(e) || "Code incorrect ou expiré.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack auth-flow">
      <div>
        <div className="verification-icon">✉️</div>
        <h2>Vérifiez votre e-mail</h2>
        <p className="muted">Entrez simplement le code à 6 chiffres reçu par e-mail pour activer votre compte.</p>
      </div>
      <form className="form" onSubmit={verify}>
        <div className="field"><label htmlFor="verify-email">E-mail</label><input id="verify-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div className="field"><label htmlFor="verify-code">Code de vérification</label><input id="verify-code" className="otp-field" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g, "").slice(0,6))} required /></div>
        {info && <div className="auth-message success">{info}</div>}
        {error && <div className="auth-message error" role="alert">{error}</div>}
        <button className="btn primary full" disabled={busy || !normalizedEmail}>{busy ? "Vérification…" : "Valider le code"}</button>
      </form>
      <button type="button" className="btn soft full" disabled={busy || !normalizedEmail} onClick={sendCode}>Renvoyer un code</button>
      <p className="muted auth-switch"><Link href="/auth/sign-in">← Retour à la connexion</Link></p>
    </div>
  );
}
