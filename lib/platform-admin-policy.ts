export function parsePlatformAdminEmails(raw: string | undefined) {
  return new Set((raw || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function isEmailInPlatformAdminList(raw: string | undefined, email: string | null | undefined) {
  return Boolean(email && parsePlatformAdminEmails(raw).has(email.trim().toLowerCase()));
}
