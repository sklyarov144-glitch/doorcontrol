import { describe, expect, it } from "vitest";
import {
  buildProductionEnvironmentPayload,
  parseProductionReviewers,
  validateProductionProtectionInput,
  verifyProductionProtection,
} from "./productionProtection";

describe("production protection configuration", () => {
  it("parses explicit user and team reviewers", () => {
    expect(parseProductionReviewers("User:42, Team:81")).toEqual([
      { type: "User", id: 42 },
      { type: "Team", id: 81 },
    ]);
  });

  it.each(["", "user:1", "User:0", "User:nope", "User:1,User:1"])(
    "rejects invalid reviewer input %s",
    (value) => expect(() => parseProductionReviewers(value)).toThrow(),
  );

  it("requires an exact apply confirmation bound to repository and reviewers", () => {
    const values = {
      GITHUB_REPOSITORY: "gross/app",
      PRODUCTION_REVIEWERS: "User:42",
      PRODUCTION_PROTECTION_CONFIRM: "PRODUCTION:gross/app:User:41",
    };
    expect(() => validateProductionProtectionInput(values, { apply: true })).toThrow(
      "PRODUCTION:gross/app:User:42",
    );
  });

  it("binds restore protection confirmation to the restore environment", () => {
    const result = validateProductionProtectionInput({
      GITHUB_REPOSITORY: "gross/app",
      PROTECTED_ENVIRONMENT: "production-restore",
      PRODUCTION_REVIEWERS: "Team:81",
    });
    expect(result.environment).toBe("production-restore");
    expect(result.expectedConfirmation).toBe("PRODUCTION-RESTORE:gross/app:Team:81");
  });

  it("rejects unprotected or unknown target environments", () => {
    expect(() => validateProductionProtectionInput({
      PROTECTED_ENVIRONMENT: "production-backup",
      PRODUCTION_REVIEWERS: "User:42",
    })).toThrow("production or production-restore");
  });

  it("preserves wait timer and deployment branch policy", () => {
    const policy = { protected_branches: false, custom_branch_policies: true };
    const payload = buildProductionEnvironmentPayload({
      protection_rules: [{ type: "wait_timer", wait_timer: 15 }],
      deployment_branch_policy: policy,
    }, [{ type: "User", id: 42 }]);

    expect(payload).toEqual({
      wait_timer: 15,
      prevent_self_review: true,
      reviewers: [{ type: "User", id: 42 }],
      deployment_branch_policy: policy,
    });
  });

  it("verifies reviewers, self-review and admin bypass independently", () => {
    const required = [{ type: "User", id: 42 }];
    const settings = {
      protection_rules: [{
        type: "required_reviewers",
        prevent_self_review: true,
        reviewers: [{ type: "User", reviewer: { id: 42 } }],
      }],
      can_admins_bypass: true,
    };
    expect(verifyProductionProtection(settings, required)).toMatchObject({
      ready: false,
      apiConfigurationReady: true,
      missing: ["admin bypass disabled"],
    });
    expect(verifyProductionProtection({ ...settings, can_admins_bypass: false }, required).ready).toBe(true);
  });

  it("reports missing configured reviewers", () => {
    const result = verifyProductionProtection({ protection_rules: [], can_admins_bypass: false }, [
      { type: "Team", id: 81 },
    ]);
    expect(result.apiConfigurationReady).toBe(false);
    expect(result.missing).toContain("required reviewers");
    expect(result.missing).toContain("self-review disabled");
  });
});
