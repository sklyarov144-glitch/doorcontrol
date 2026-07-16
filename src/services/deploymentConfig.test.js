import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  VITE_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
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
      VITE_REQUIRE_PRIVILEGED_MFA: "true",
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

  it("rejects a frontend database URL for another Supabase project", () => {
    expect(verify({ VITE_SUPABASE_URL: "https://bbbbbbbbbbbbbbbbbbbb.supabase.co" }).status).not.toBe(0);
  });
});

describe("production hosting security", () => {
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
  const headers = Object.fromEntries(vercel.headers[0].headers.map(({ key, value }) => [key, value]));

  it("enforces HTTPS, framing and opener isolation headers", () => {
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });
});

describe("production bundle verifier", () => {
  it("forbids demo account markers", () => {
    const source = readFileSync("scripts/verify-production-bundle.mjs", "utf8");
    expect(source).toContain("creator@example.test");
    expect(source).toContain("Демо: ИТР");
    expect(source).toContain("gross-lean-montage.visual.mvp.v7");
    expect(source).toContain("gross-lean-montage.auth-session.v1");
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

  it("requires privileged MFA in production", () => {
    expect(verifyPublicEnvironment({ VITE_REQUIRE_PRIVILEGED_MFA: "false" }).status).not.toBe(0);
  });
});

describe("authenticated domain load smoke", () => {
  it("refuses to run without dedicated ITR credentials", () => {
    const result = spawnSync(globalThis.process.execPath, ["scripts/pilot/domain-load-smoke.mjs"], {
      cwd: globalThis.process.cwd(),
      env: {
        ...globalThis.process.env,
        AUTH_SMOKE_SUPABASE_URL: "",
        AUTH_SMOKE_SUPABASE_ANON_KEY: "",
        AUTH_SMOKE_ITR_EMAIL: "",
        AUTH_SMOKE_ITR_PASSWORD: "",
      },
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Authenticated ITR smoke credentials are required");
  });
});

describe("staging smoke account bootstrap", () => {
  it("requires an explicit staging confirmation before reading credentials", () => {
    const result = spawnSync(globalThis.process.execPath, ["scripts/auth/bootstrap-staging-smoke.mjs"], {
      cwd: globalThis.process.cwd(),
      env: { ...globalThis.process.env, STAGING_BOOTSTRAP_CONFIRM: "" },
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("STAGING_BOOTSTRAP_CONFIRM=STAGING");
  });
});
