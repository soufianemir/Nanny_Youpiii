import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "https://example.invalid/auth",
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || "build-only-cookie-secret-32-characters-minimum",
  },
  logLevel: process.env.NODE_ENV === "production" ? "warn" : "silent",
});
