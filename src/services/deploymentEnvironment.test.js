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
  return values;
}

describe("GitHub deployment environment configuration", () => {
  it("requires role smoke accounts for staging", () => {
    expect(environmentRequirements("staging").secrets).toContain("AUTH_SMOKE_ITR_PASSWORD");
  });

  it("requires role smoke accounts for production", () => {
    expect(environmentRequirements("production").secrets).toContain("AUTH_SMOKE_COMPANY_HEAD_PASSWORD");
  });

  it("requires backup and monitoring secrets for production", () => {
    const secrets = environmentRequirements("production").secrets;
    expect(secrets).toContain("BACKUP_SUPABASE_SERVICE_ROLE_KEY");
    expect(secrets).toContain("VITE_SENTRY_DSN");
    expect(secrets).toContain("UAT_EVIDENCE_JSON");
    expect(secrets).toContain("AUTH_SMOKE_CREATOR_TOTP_SECRET");
    expect(secrets).toContain("AUTH_SMOKE_COMPANY_HEAD_TOTP_SECRET");
    expect(secrets).toContain("AUTH_SMOKE_CONSTRUCTION_DIRECTOR_TOTP_SECRET");
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

  it("rejects role smoke credentials for another backend", () => {
    const values = valuesFor("staging");
    values.AUTH_SMOKE_SUPABASE_URL = "https://bbbbbbbbbbbbbbbbbbbb.supabase.co";
    expect(validateEnvironmentValues("staging", values).errors).toContain("Auth smoke credentials must target the deployed Supabase project");
  });
});
