import test from "node:test";
import assert from "node:assert/strict";
import { platformAdminConfigured } from "../lib/platform-admin";

test("le back-office reste fermé tant que le mot de passe serveur n'est pas configuré",()=>{
  const previous=process.env.PLATFORM_ADMIN_PASSWORD;
  delete process.env.PLATFORM_ADMIN_PASSWORD;
  assert.equal(platformAdminConfigured(),false);
  if(previous===undefined) delete process.env.PLATFORM_ADMIN_PASSWORD;
  else process.env.PLATFORM_ADMIN_PASSWORD=previous;
});
