"use server";

import { redirect } from "next/navigation";
import {
  clearPlatformAdminSession,
  createPlatformAdminSession,
  validatePlatformAdminCredentials,
} from "@/lib/platform-admin";

const text = (formData: FormData, key: string) => String(formData.get(key) || "");

export async function platformAdminLoginAction(formData: FormData) {
  const username = text(formData, "username").trim();
  const password = text(formData, "password");
  if (!validatePlatformAdminCredentials(username, password)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    redirect("/admin/login?error=1");
  }
  await createPlatformAdminSession(username);
  redirect("/admin");
}

export async function platformAdminLogoutAction() {
  await clearPlatformAdminSession();
  redirect("/admin/login");
}
