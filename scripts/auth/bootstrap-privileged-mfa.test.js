import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMfaBootstrapConfig, writeMfaSecretsFile } from "./bootstrap-privileged-mfa.mjs";

const validValues = {
  MFA_BOOTSTRAP_CONFIRM: "STAGING",
  MFA_BOOTSTRAP_OUTPUT: "/tmp/gross-mfa.json",
  AUTH_SMOKE_SUPABASE_URL: "https://example.supabase.co",
  AUTH_SMOKE_SUPABASE_ANON_KEY: "anon-key",
  AUTH_SMOKE_CREATOR_EMAIL: "creator@example.com",
  AUTH_SMOKE_CREATOR_PASSWORD: "password-creator",
  AUTH_SMOKE_COMPANY_HEAD_EMAIL: "head@example.com",
  AUTH_SMOKE_COMPANY_HEAD_PASSWORD: "password-head",
  AUTH_SMOKE_CONSTRUCTION_DIRECTOR_EMAIL: "director@example.com",
  AUTH_SMOKE_CONSTRUCTION_DIRECTOR_PASSWORD: "password-director",
};

describe("privileged MFA bootstrap preflight", () => {
  it("fails closed without explicit environment confirmation", () => {
    expect(() => parseMfaBootstrapConfig(["--enroll"], {
      ...validValues,
      MFA_BOOTSTRAP_CONFIRM: "",
    })).toThrow("MFA_BOOTSTRAP_CONFIRM");
  });

  it("requires an absolute output path before enrollment", () => {
    expect(() => parseMfaBootstrapConfig(["--enroll"], {
      ...validValues,
      MFA_BOOTSTRAP_OUTPUT: "mfa.json",
    })).toThrow("absolute path");
  });

  it("does not require an output file for verification", () => {
    const config = parseMfaBootstrapConfig(["--verify"], {
      ...validValues,
      MFA_BOOTSTRAP_OUTPUT: "",
    });
    expect(config.mode).toBe("verify");
    expect(config.accounts).toHaveLength(3);
  });

  it("writes the secret bundle with owner-only permissions and refuses overwrite", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gross-mfa-"));
    const file = path.join(directory, "secrets.json");
    writeMfaSecretsFile(file, "STAGING", { AUTH_SMOKE_CREATOR_TOTP_SECRET: "secret" });
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).secrets.AUTH_SMOKE_CREATOR_TOTP_SECRET).toBe("secret");
    expect(() => writeMfaSecretsFile(file, "STAGING", {})).toThrow();
    fs.rmSync(directory, { recursive: true, force: true });
  });
});
