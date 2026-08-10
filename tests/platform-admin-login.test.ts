import test from "node:test";
import assert from "node:assert/strict";
import {
  credentialPlatformAdminConfigured,
  platformAdminPublicUsername,
  validatePlatformAdminCredentials,
} from "../lib/platform-admin";

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("Admin reste l'identifiant par défaut", () => {
  withEnv({ PLATFORM_ADMIN_USERNAME: undefined }, () => {
    assert.equal(platformAdminPublicUsername(), "Admin");
  });
});

test("le login par identifiant reste fermé sans secret serveur", () => {
  withEnv({ PLATFORM_ADMIN_USERNAME: "Admin", PLATFORM_ADMIN_PASSWORD: undefined }, () => {
    assert.equal(credentialPlatformAdminConfigured(), false);
    assert.equal(validatePlatformAdminCredentials("Admin", "quelque-chose"), false);
  });
});

test("le login exige l'identifiant et le mot de passe exacts", () => {
  withEnv({ PLATFORM_ADMIN_USERNAME: "Admin", PLATFORM_ADMIN_PASSWORD: "test-only-secret" }, () => {
    assert.equal(credentialPlatformAdminConfigured(), true);
    assert.equal(validatePlatformAdminCredentials("Admin", "test-only-secret"), true);
    assert.equal(validatePlatformAdminCredentials("admin", "test-only-secret"), false);
    assert.equal(validatePlatformAdminCredentials("Admin", "mauvais"), false);
  });
});
