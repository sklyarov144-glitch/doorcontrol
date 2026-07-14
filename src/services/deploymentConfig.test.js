import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const validEnv = {
  ...globalThis.process.env,
  SUPABASE_ACCESS_TOKEN: "token",
  SUPABASE_PROJECT_ID: "abcdefghijklmnopqrst",
  APP_ALLOWED_ORIGINS: "https://app.example.ru,https://admin.example.ru",
  APP_PUBLIC_URL: "https://app.example.ru",
  VERCEL_TOKEN: "token",
  VERCEL_ORG_ID: "org",
  VERCEL_PROJECT_ID: "project",
};

function verify(overrides = {}) {
  return spawnSync(globalThis.process.execPath, ["scripts/verify-deployment-config.mjs"], {
    cwd: globalThis.process.cwd(),
    env: { ...validEnv, ...overrides },
    encoding: "utf8",
  });
}

function verifyPublicEnvironment(overrides = {}) {
  return spawnSync(globalThis.process.execPath, ["scripts/verify-env.mjs"], {
    cwd: globalThis.process.cwd(),
    env: {
      ...globalThis.process.env,
      DEPLOY_ENV: "production",
      VITE_DATA_PROVIDER: "supabase",
      VITE_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      VITE_SUPABASE_ANON_KEY: "a".repeat(100),
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      ...overrides,
    },
    encoding: "utf8",
  });
}

describe("deployment configuration preflight", () => {
  it("accepts a complete HTTPS configuration", () => {
    const result = verify();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Deployment configuration is valid");
  });

  it("rejects localhost and origins outside the allowlist", () => {
    expect(verify({ APP_PUBLIC_URL: "http://localhost:5173" }).status).not.toBe(0);
    expect(verify({ APP_ALLOWED_ORIGINS: "https://admin.example.ru" }).status).not.toBe(0);
  });
});

describe("public runtime configuration preflight", () => {
  it("accepts a hosted Supabase production runtime", () => {
    expect(verifyPublicEnvironment().status).toBe(0);
  });

  it("rejects local providers and non-hosted database URLs", () => {
    expect(verifyPublicEnvironment({ VITE_DATA_PROVIDER: "local" }).status).not.toBe(0);
    expect(verifyPublicEnvironment({ VITE_SUPABASE_URL: "http://localhost:54321" }).status).not.toBe(0);
  });
});
