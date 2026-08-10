import test from "node:test";
import assert from "node:assert/strict";
import { isEmailInPlatformAdminList, parsePlatformAdminEmails } from "../lib/platform-admin-policy";

test("la liste super-admin est normalisée et ignore les entrées vides", () => {
  assert.deepEqual([...parsePlatformAdminEmails(" Admin@Example.com, second@example.com , ")], ["admin@example.com", "second@example.com"]);
});

test("l'accès admin est insensible à la casse mais fermé sans configuration", () => {
  assert.equal(isEmailInPlatformAdminList("admin@example.com", "ADMIN@example.com"), true);
  assert.equal(isEmailInPlatformAdminList("admin@example.com", "other@example.com"), false);
  assert.equal(isEmailInPlatformAdminList(undefined, "admin@example.com"), false);
});
