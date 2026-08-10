import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { neonAuthCookieSecret } from "@/lib/env";

const COOKIE_NAME = "__Host-nanny-admin";
const SESSION_SECONDS = 8 * 60 * 60;

export type PlatformAdminPrincipal = {
  username: string;
  actorUserId: string;
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

function tokenFor(username: string, expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ username, expiresAt }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function principalFromToken(value: string | undefined): PlatformAdminPrincipal | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { username?: string; expiresAt?: number };
    if (!decoded.username || !decoded.expiresAt || decoded.expiresAt < Date.now()) return null;
    if (!safeEqual(decoded.username, adminUsername())) return null;
    return { username: decoded.username, actorUserId: `platform-admin:${decoded.username}` };
  } catch {
    return null;
  }
}

export function platformAdminConfigured() {
  return Boolean(adminUsername() && adminPassword());
}

export function platformAdminPublicUsername() {
  return adminUsername();
}

export function validatePlatformAdminCredentials(username: string, password: string) {
  if (!platformAdminConfigured()) return false;
  return safeEqual(username.trim(), adminUsername()) && safeEqual(password, adminPassword());
}

export async function createPlatformAdminSession(username: string) {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const store = await cookies();
  store.set(COOKIE_NAME, tokenFor(username, expiresAt), {
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

export async function currentPlatformAdmin() {
  const store = await cookies();
  return principalFromToken(store.get(COOKIE_NAME)?.value);
}

export async function requirePlatformAdmin() {
  const principal = await currentPlatformAdmin();
  if (!principal) redirect("/admin/login");
  return principal;
}
