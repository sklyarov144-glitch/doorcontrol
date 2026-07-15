import { describe, expect, it } from "vitest";
import { environmentRequirements } from "./deploymentEnvironment";
import { auditEnvironmentInventory } from "./githubEnvironmentAudit";

function completeInventory(environment) {
  const requirements = environmentRequirements(environment);
  return { secrets: requirements.secrets, variables: requirements.variables };
}

describe("auditEnvironmentInventory", () => {
  it("accepts a complete production inventory without reading secret values", () => {
    const result = auditEnvironmentInventory("production", completeInventory("production"));

    expect(result.ready).toBe(true);
    expect(result.missingSecrets).toEqual([]);
    expect(result.missingVariables).toEqual([]);
  });

  it("reports missing production secrets and variables", () => {
    const result = auditEnvironmentInventory("production", {
      secrets: ["VERCEL_TOKEN"],
      variables: ["APP_PUBLIC_URL"],
    });

    expect(result.ready).toBe(false);
    expect(result.missingSecrets).toContain("SUPABASE_PROJECT_ID");
    expect(result.missingSecrets).toContain("UAT_EVIDENCE_JSON");
    expect(result.missingVariables).toEqual(["APP_ALLOWED_ORIGINS"]);
  });

  it("warns when optional staging monitoring is absent", () => {
    const result = auditEnvironmentInventory("staging", completeInventory("staging"));

    expect(result.ready).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("VITE_SENTRY_DSN");
  });
});
