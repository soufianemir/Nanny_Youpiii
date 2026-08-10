import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isEmailInPlatformAdminList, parsePlatformAdminEmails } from "@/lib/platform-admin-policy";

export function platformAdminConfigured() {
  return parsePlatformAdminEmails(process.env.PLATFORM_ADMIN_EMAILS).size > 0;
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  return isEmailInPlatformAdminList(process.env.PLATFORM_ADMIN_EMAILS, email);
}

export async function requirePlatformAdmin() {
  const { data } = await auth.getSession();
  if (!data?.user) redirect("/auth/sign-in?callbackURL=/admin");
  if (!platformAdminConfigured() || !isPlatformAdminEmail(data.user.email)) notFound();
  return data;
}
