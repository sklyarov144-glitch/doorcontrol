import { describe, expect, it } from "vitest";
import { environmentRequirements, validateEnvironmentValues } from "./deploymentEnvironment";

function valuesFor(environment) {
  const values = {};
  const requirements = environmentRequirements(environment);
  for (const name of [...requirements.secrets, ...requirements.variables]) values[name] = "configured";
  values.SUPABASE_PROJECT_ID = "abcdefghijklmnopqrst";
  values.VITE_SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co";
  values.AUTH_SMOKE_SUPABASE_URL = values.VITE_SUPABASE_URL;
  values.AUTH_SMOKE_SUPABASE_ANON_KEY = values.VITE_SUPABASE_ANON_KEY;
  values.APP_PUBLIC_URL = "https://app.example.ru";
  values.APP_ALLOWED_ORIGINS = "https://app.example.ru";
  values.BACKUP_ENCRYPTION_PASSWORD = "a-secure-backup-password-123456";
  values.SUPABASE_DB_URL = "postgresql://postgres:secret@db.example.ru:5432/postgres";
  values.BACKUP_SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co";
  values.VITE_SENTRY_DSN = "https://public@example.ingest.sentry.io/1";
  return values;
}

describe("GitHub deployment environment configuration", () => {
  it("requires role smoke accounts for staging", () => {
    expect(environmentRequirements("staging").secrets).toContain("AUTH_SMOKE_ITR_PASSWORD");
    expect(environmentRequirements("staging").secrets).toContain("VITE_SENTRY_DSN");
  });

  it("requires role smoke accounts for production", () => {
    expect(environmentRequirements("production").secrets).toContain("AUTH_SMOKE_COMPANY_HEAD_PASSWORD");
  });

  it("keeps deployment, backup and restore credentials in separate environments", () => {
    const secrets = environmentRequirements("production").secrets;
    expect(secrets).not.toContain("BACKUP_SUPABASE_SERVICE_ROLE_KEY");
    expect(secrets).not.toContain("BACKUP_ENCRYPTION_PASSWORD");
    expect(secrets).toContain("VITE_SENTRY_DSN");
    expect(secrets).toContain("UAT_EVIDENCE_JSON");
    expect(secrets).toContain("PILOT_RECONCILIATION_EVIDENCE_JSON");
    expect(secrets).toContain("RESTORE_EVIDENCE_JSON");
    expect(secrets).not.toContain("AUTH_SMOKE_CREATOR_TOTP_SECRET");
    expect(secrets).not.toContain("AUTH_SMOKE_COMPANY_HEAD_TOTP_SECRET");
    expect(secrets).not.toContain("AUTH_SMOKE_CONSTRUCTION_DIRECTOR_TOTP_SECRET");
    expect(environmentRequirements("production-backup")).toEqual({
      secrets: [
        "SUPABASE_DB_URL", "BACKUP_ENCRYPTION_PASSWORD",
        "BACKUP_SUPABASE_URL", "BACKUP_SUPABASE_SERVICE_ROLE_KEY",
      ],
      variables: [],
    });
    expect(environmentRequirements("production-restore")).toEqual({
      secrets: ["BACKUP_ENCRYPTION_PASSWORD"], variables: [],
    });
  });

  it("accepts a complete matched configuration", () => {
    expect(validateEnvironmentValues("staging", valuesFor("staging")).valid).toBe(true);
  });

  it("reports missing and cross-project values", () => {
    expect(validateEnvironmentValues("production", {}).missing).toContain("SUPABASE_ACCESS_TOKEN");
    const values = valuesFor("production");
    values.VITE_SUPABASE_URL = "https://bbbbbbbbbbbbbbbbbbbb.supabase.co";
    expect(validateEnvironmentValues("production", values).errors).toContain("VITE_SUPABASE_URL does not match SUPABASE_PROJECT_ID");
  });

  it("rejects an invalid Sentry DSN before deployment", () => {
    const values = valuesFor("staging");
    values.VITE_SENTRY_DSN = "not-a-sentry-dsn";
    expect(validateEnvironmentValues("staging", values).errors[0]).toContain("VITE_SENTRY_DSN is invalid");
  });

  it("validates isolated backup and restore credentials", () => {
    expect(validateEnvironmentValues("production-backup", valuesFor("production-backup")).valid).toBe(true);
    expect(validateEnvironmentValues("production-restore", valuesFor("production-restore")).valid).toBe(true);
    const weak = valuesFor("production-backup");
    weak.BACKUP_ENCRYPTION_PASSWORD = "short";
    expect(validateEnvironmentValues("production-backup", weak).errors).toContain(
      "BACKUP_ENCRYPTION_PASSWORD must contain at least 24 characters",
    );
  });
});
