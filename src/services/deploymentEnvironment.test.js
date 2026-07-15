import { describe, expect, it } from "vitest";
import { environmentRequirements, validateEnvironmentValues } from "./deploymentEnvironment";

function valuesFor(environment) {
  const values = {};
  const requirements = environmentRequirements(environment);
  for (const name of [...requirements.secrets, ...requirements.variables]) values[name] = "configured";
  values.SUPABASE_PROJECT_ID = "abcdefghijklmnopqrst";
  values.VITE_SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co";
  values.APP_PUBLIC_URL = "https://app.example.ru";
  values.APP_ALLOWED_ORIGINS = "https://app.example.ru";
  return values;
}

describe("GitHub deployment environment configuration", () => {
  it("requires role smoke accounts for staging", () => {
    expect(environmentRequirements("staging").secrets).toContain("AUTH_SMOKE_ITR_PASSWORD");
  });

  it("requires backup and monitoring secrets for production", () => {
    const secrets = environmentRequirements("production").secrets;
    expect(secrets).toContain("BACKUP_SUPABASE_SERVICE_ROLE_KEY");
    expect(secrets).toContain("VITE_SENTRY_DSN");
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
});
