import { notFound, redirect } from "next/navigation";
import { pool } from "@/db";
import { auth } from "@/lib/auth";
import { isEmailInPlatformAdminList, isPlatformAdminIdentity, parsePlatformAdminEmails } from "@/lib/platform-admin-policy";

export function platformAdminConfigured() {
  return parsePlatformAdminEmails(process.env.PLATFORM_ADMIN_EMAILS).size > 0;
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  return isEmailInPlatformAdminList(process.env.PLATFORM_ADMIN_EMAILS, email);
}

export async function requirePlatformAdmin() {
  const { data } = await auth.getSession();
  if (!data?.user) redirect("/auth/sign-in?callbackURL=/admin");
  const result = await pool.query<{ role: string | null }>('select role from neon_auth."user" where id=$1 limit 1', [data.user.id]);
  const authRole = result.rows[0]?.role;
  if (!isPlatformAdminIdentity(process.env.PLATFORM_ADMIN_EMAILS, data.user.email, authRole)) notFound();
  return data;
}
