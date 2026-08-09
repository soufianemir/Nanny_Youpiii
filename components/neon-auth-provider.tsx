"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth-client";

export function NeonAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      Link={Link}
      emailOTP
      redirectTo="/app"
      credentials={{ forgotPassword: true }}
      signUp={{ fields: ["name"] }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
