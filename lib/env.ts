export const requiredServerEnv = ["DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_AUTH_COOKIE_SECRET"] as const;

export function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

export function missingServerEnv() { return requiredServerEnv.filter(k => !process.env[k]); }
export function serverConfigured() { return missingServerEnv().length === 0; }
