import crypto from "node:crypto";

export const requiredServerEnv = ["DATABASE_URL", "NEON_AUTH_BASE_URL"] as const;

export function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

export function neonAuthCookieSecret() {
  if (process.env.NEON_AUTH_COOKIE_SECRET) return process.env.NEON_AUTH_COOKIE_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return "build-only-cookie-secret-32-characters-minimum";
  return crypto.createHash("sha256").update(`nanny-youpiii:v3:neon-auth-cookie:${databaseUrl}`).digest("hex");
}

export function missingServerEnv() { return requiredServerEnv.filter(k => !process.env[k]); }
export function serverConfigured() { return missingServerEnv().length === 0; }
