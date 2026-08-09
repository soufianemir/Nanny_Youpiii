"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return <button className="btn soft" onClick={async () => { await authClient.signOut(); router.push("/"); router.refresh(); }}>Déconnexion</button>;
}
