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
