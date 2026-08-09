"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth-client";

export function NeonAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      credentials={{ forgotPassword: true }}
      additionalFields={{
        firstName: { label: "Prénom", placeholder: "Prénom", type: "string", required: true },
        lastName: { label: "Nom", placeholder: "Nom", type: "string", required: true },
      }}
      signUp={{ fields: ["name", "firstName", "lastName"] }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
