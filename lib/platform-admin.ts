import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pool } from "@/db";
import { auth } from "@/lib/auth";
import { neonAuthCookieSecret } from "@/lib/env";
import { isPlatformAdminIdentity, parsePlatformAdminEmails } from "@/lib/platform-admin-policy";

const COOKIE_NAME = "__Host-nanny-admin";
const SESSION_SECONDS = 8 * 60 * 60;

export type PlatformAdminSession = {
  user: { id: string; email: string; name: string | null };
  source: "credentials" | "neon";
};

function adminUsername() {
  return (process.env.PLATFORM_ADMIN_USERNAME || "Admin").trim();
}

function adminPassword() {
  return process.env.PLATFORM_ADMIN_PASSWORD || "";
}

function sessionSecret() {
  return process.env.PLATFORM_ADMIN_SESSION_SECRET || neonAuthCookieSecret();
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(payload: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function makeToken(username: string, expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ username, expiresAt }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function credentialSessionFromToken(value: string | undefined): PlatformAdminSession | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { username?: string; expiresAt?: number };
    if (!decoded.username || !decoded.expiresAt || decoded.expiresAt < Date.now()) return null;
    if (!safeEqual(decoded.username, adminUsername())) return null;
    const id = `platform-admin:${decoded.username}`;
    return { user: { id, email: decoded.username, name: decoded.username }, source: "credentials" };
  } catch {
    return null;
  }
}

export function platformAdminConfigured() {
  return Boolean(adminPassword()) || parsePlatformAdminEmails(process.env.PLATFORM_ADMIN_EMAILS).size > 0;
}

export function credentialPlatformAdminConfigured() {
  return Boolean(adminUsername() && adminPassword());
}

export function platformAdminPublicUsername() {
  return adminUsername();
}

export function validatePlatformAdminCredentials(username: string, password: string) {
  if (!credentialPlatformAdminConfigured()) return false;
  return safeEqual(username.trim(), adminUsername()) && safeEqual(password, adminPassword());
}

export async function createPlatformAdminSession(username: string) {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const store = await cookies();
  store.set(COOKIE_NAME, makeToken(username, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearPlatformAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function currentPlatformAdmin(): Promise<PlatformAdminSession | null> {
  const store = await cookies();
  const credentialSession = credentialSessionFromToken(store.get(COOKIE_NAME)?.value);
  if (credentialSession) return credentialSession;

  const { data } = await auth.getSession();
  if (!data?.user) return null;
  const result = await pool.query<{ role: string | null }>('select role from neon_auth."user" where id=$1 limit 1', [data.user.id]);
  if (!isPlatformAdminIdentity(process.env.PLATFORM_ADMIN_EMAILS, data.user.email, result.rows[0]?.role)) return null;
  return {
    user: {
      id: data.user.id,
      email: data.user.email || data.user.name || "Neon admin",
      name: data.user.name || null,
    },
    source: "neon",
  };
}

export async function requirePlatformAdmin() {
  const session = await currentPlatformAdmin();
  if (!session) redirect("/admin/login");
  return session;
}
