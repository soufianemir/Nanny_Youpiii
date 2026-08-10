export function parsePlatformAdminEmails(raw: string | undefined) {
  return new Set((raw || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function isEmailInPlatformAdminList(raw: string | undefined, email: string | null | undefined) {
  return Boolean(email && parsePlatformAdminEmails(raw).has(email.trim().toLowerCase()));
}

export function isPlatformAdminIdentity(raw: string | undefined, email: string | null | undefined, authRole: string | null | undefined) {
  return authRole === "platform_admin" || isEmailInPlatformAdminList(raw, email);
}
