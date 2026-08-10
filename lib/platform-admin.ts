import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function adminEmails() {
  return new Set(
    (process.env.PLATFORM_ADMIN_EMAILS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function platformAdminConfigured() {
  return adminEmails().size > 0;
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

export async function requirePlatformAdmin() {
  const { data } = await auth.getSession();
  if (!data?.user) redirect("/auth/sign-in?callbackURL=/admin");
  if (!platformAdminConfigured() || !isPlatformAdminEmail(data.user.email)) notFound();
  return data;
}
