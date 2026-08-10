import test from "node:test";
import assert from "node:assert/strict";
import { isEmailInPlatformAdminList, isPlatformAdminIdentity, parsePlatformAdminEmails } from "../lib/platform-admin-policy";

// Back-office platform: access must stay fail-closed unless the identity is explicitly trusted.
test("la liste super-admin est normalisée et ignore les entrées vides", () => {
  assert.deepEqual([...parsePlatformAdminEmails(" Admin@Example.com, second@example.com , ")], ["admin@example.com", "second@example.com"]);
});

test("l'allowlist admin est insensible à la casse et fermée sans configuration", () => {
  assert.equal(isEmailInPlatformAdminList("admin@example.com", "ADMIN@example.com"), true);
  assert.equal(isEmailInPlatformAdminList("admin@example.com", "other@example.com"), false);
  assert.equal(isEmailInPlatformAdminList(undefined, "admin@example.com"), false);
});

test("le rôle Neon platform_admin autorise le back-office sans variable Vercel", () => {
  assert.equal(isPlatformAdminIdentity(undefined, "owner@example.com", "platform_admin"), true);
  assert.equal(isPlatformAdminIdentity(undefined, "owner@example.com", "user"), false);
  assert.equal(isPlatformAdminIdentity("owner@example.com", "OWNER@example.com", "user"), true);
});
