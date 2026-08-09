import crypto from "node:crypto";

export const requiredServerEnv = ["DATABASE_URL", "RESEND_API_KEY"] as const;

export function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

export function authSecret() {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return "build-only-placeholder-secret-not-used-without-database";
  return crypto.createHash("sha256").update(`nanny-youpiii-v3:${databaseUrl}`).digest("hex");
}

export function emailFrom() {
  return process.env.EMAIL_FROM || "Nanny Youpiii <onboarding@resend.dev>";
}

export function missingServerEnv() { return requiredServerEnv.filter(k => !process.env[k]); }
export function serverConfigured() { return missingServerEnv().length === 0; }
export function customEmailDomainConfigured() { return Boolean(process.env.EMAIL_FROM); }
