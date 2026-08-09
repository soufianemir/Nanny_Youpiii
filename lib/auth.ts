import { createNeonAuth } from "@neondatabase/auth/next/server";
import { neonAuthCookieSecret } from "@/lib/env";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "https://example.invalid/auth",
  cookies: {
    secret: neonAuthCookieSecret(),
  },
  logLevel: process.env.NODE_ENV === "production" ? "warn" : "silent",
});
