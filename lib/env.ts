export const requiredServerEnv = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "RESEND_API_KEY", "EMAIL_FROM"] as const;
export function missingServerEnv() { return requiredServerEnv.filter(k => !process.env[k]); }
export function serverConfigured() { return missingServerEnv().length === 0; }
