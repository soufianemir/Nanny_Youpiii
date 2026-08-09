import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool } from "@/db";
import { sendTransactionalEmail } from "@/lib/email";

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || "build-only-placeholder-secret-please-configure-production",
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  user: {
    additionalFields: {
      firstName: { type: "string", required: true },
      lastName: { type: "string", required: true },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendTransactionalEmail({
        to: user.email,
        subject: "Réinitialiser votre mot de passe — Nanny Youpiii",
        html: `<p>Bonjour ${user.name || ""},</p><p>Utilisez ce lien sécurisé pour définir un nouveau mot de passe :</p><p><a href="${url}">Réinitialiser mon mot de passe</a></p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendTransactionalEmail({
        to: user.email,
        subject: "Vérifiez votre e-mail — Nanny Youpiii",
        html: `<p>Bonjour ${user.name || ""},</p><p>Confirmez votre adresse e-mail pour accéder à Nanny Youpiii.</p><p><a href="${url}">Vérifier mon adresse e-mail</a></p>`,
      });
    },
  },
  plugins: [nextCookies()],
});
