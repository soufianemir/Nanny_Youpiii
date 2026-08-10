import test from "node:test";
import assert from "node:assert/strict";
import { platformAdminPublicUsername } from "../lib/platform-admin";

test("le back-office conserve Admin comme identifiant par défaut",()=>{
  const previous=process.env.PLATFORM_ADMIN_USERNAME;
  delete process.env.PLATFORM_ADMIN_USERNAME;
  assert.equal(platformAdminPublicUsername(),"Admin");
  if(previous===undefined) delete process.env.PLATFORM_ADMIN_USERNAME;
  else process.env.PLATFORM_ADMIN_USERNAME=previous;
});
