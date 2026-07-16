import { describe, expect, it } from "vitest";
import { environmentRequirements } from "./deploymentEnvironment";
import { auditEnvironmentInventory } from "./githubEnvironmentAudit";

function completeInventory(environment) {
  const requirements = environmentRequirements(environment);
  return {
    secrets: requirements.secrets,
    variables: requirements.variables,
    protectionRules: ["production", "production-restore"].includes(environment)
      ? [{ type: "required_reviewers", prevent_self_review: true, reviewers: [{ type: "User", id: 1 }] }]
      : [],
    canAdminsBypass: ["production", "production-restore"].includes(environment) ? false : true,
    deploymentBranchPolicy: environment === "production-backup"
      ? { protected_branches: false, custom_branch_policies: true }
      : null,
    branchPolicies: environment === "production-backup" ? [{ name: "main", type: "branch" }] : [],
  };
}

describe("auditEnvironmentInventory", () => {
  it("accepts a complete production inventory without reading secret values", () => {
    const result = auditEnvironmentInventory("production", completeInventory("production"));

    expect(result.ready).toBe(true);
    expect(result.missingSecrets).toEqual([]);
    expect(result.missingVariables).toEqual([]);
    expect(result.missingProtections).toEqual([]);
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

  it("rejects production without an independent reviewer gate", () => {
    const inventory = completeInventory("production");
    const result = auditEnvironmentInventory("production", {
      ...inventory,
      protectionRules: [],
      canAdminsBypass: true,
    });

    expect(result.ready).toBe(false);
    expect(result.missingProtections).toEqual([
      "required reviewer",
      "self-review disabled",
      "admin bypass disabled",
    ]);
  });

  it("rejects production when the deployment initiator can approve their own release", () => {
    const inventory = completeInventory("production");
    inventory.protectionRules[0].prevent_self_review = false;

    const result = auditEnvironmentInventory("production", inventory);

    expect(result.ready).toBe(false);
    expect(result.missingProtections).toEqual(["self-review disabled"]);
  });

  it("warns when optional staging monitoring is absent", () => {
    const result = auditEnvironmentInventory("staging", completeInventory("staging"));

    expect(result.ready).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("VITE_SENTRY_DSN");
  });

  it("accepts an unattended backup environment and protects restore separately", () => {
    expect(auditEnvironmentInventory("production-backup", completeInventory("production-backup")).ready).toBe(true);
    expect(auditEnvironmentInventory("production-restore", completeInventory("production-restore")).ready).toBe(true);
  });

  it("rejects a manual reviewer that would block scheduled backups", () => {
    const inventory = completeInventory("production-backup");
    inventory.protectionRules = [{ type: "required_reviewers", reviewers: [{ type: "User", id: 1 }] }];
    const result = auditEnvironmentInventory("production-backup", inventory);
    expect(result.ready).toBe(false);
    expect(result.missingProtections).toEqual(["scheduled backup must not require manual reviewer"]);
  });

  it("rejects backup secrets exposed to branches other than main", () => {
    const inventory = completeInventory("production-backup");
    inventory.branchPolicies.push({ name: "feature/*", type: "branch" });
    const result = auditEnvironmentInventory("production-backup", inventory);
    expect(result.ready).toBe(false);
    expect(result.missingProtections).toEqual(["backup deployments restricted to main"]);
  });

  it("reports a missing GitHub environment without treating empty inventory as success", () => {
    const result = auditEnvironmentInventory("production-backup", { exists: false });
    expect(result.ready).toBe(false);
    expect(result.missingProtections).toContain("environment exists");
    expect(result.missingSecrets).toContain("SUPABASE_DB_URL");
  });
});
