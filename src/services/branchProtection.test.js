import { describe, expect, it } from "vitest";
import {
  auditMainProtection,
  buildMainProtectionPayload,
  requiredMainChecks,
  validateApprovalCapacity,
  validateMainProtectionInput,
  validateObservedChecks,
} from "./branchProtection";

function configuredProtection(overrides = {}) {
  return {
    required_status_checks: { strict: true, contexts: [...requiredMainChecks] },
    enforce_admins: { enabled: true },
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      required_approving_review_count: 0,
      require_last_push_approval: false,
    },
    required_linear_history: { enabled: true },
    required_conversation_resolution: { enabled: true },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
    ...overrides,
  };
}

describe("main branch protection", () => {
  it("binds apply confirmation to repository, checks and approval count", () => {
    const input = validateMainProtectionInput({
      GITHUB_REPOSITORY: "gross/app",
      BRANCH_REQUIRED_APPROVALS: "0",
    });
    expect(input.expectedConfirmation).toBe("MAIN:gross/app:verify,database,e2e:0");
    expect(() => validateMainProtectionInput({
      GITHUB_REPOSITORY: "gross/app",
      BRANCH_PROTECTION_CONFIRM: "MAIN:gross/app:verify,database,e2e:1",
    }, { apply: true })).toThrow(input.expectedConfirmation);
  });

  it.each(["-1", "7", "one", "1.5"])("rejects invalid approval count %s", (value) => {
    expect(() => validateMainProtectionInput({ BRANCH_REQUIRED_APPROVALS: value })).toThrow();
  });

  it("cannot target a branch other than main", () => {
    expect(() => validateMainProtectionInput({ PROTECTED_BRANCH: "feature/test" })).toThrow(
      "PROTECTED_BRANCH must be main",
    );
  });

  it("builds PR-only protection without deadlocking a single-owner repository", () => {
    expect(buildMainProtectionPayload()).toMatchObject({
      required_status_checks: { strict: true, contexts: requiredMainChecks },
      enforce_admins: true,
      required_pull_request_reviews: {
        required_approving_review_count: 0,
        dismiss_stale_reviews: true,
        require_last_push_approval: false,
      },
      required_linear_history: true,
      allow_force_pushes: false,
      allow_deletions: false,
      required_conversation_resolution: true,
    });
  });

  it("requires last-push approval when independent approvals are enabled", () => {
    expect(buildMainProtectionPayload({ approvalCount: 1 }).required_pull_request_reviews).toMatchObject({
      required_approving_review_count: 1,
      require_last_push_approval: true,
    });
  });

  it("accepts a complete main protection response", () => {
    expect(auditMainProtection(configuredProtection())).toEqual({ ready: true, missing: [] });
  });

  it("reports protection gaps independently", () => {
    const result = auditMainProtection(configuredProtection({
      required_status_checks: { strict: false, contexts: ["verify"] },
      enforce_admins: { enabled: false },
      required_pull_request_reviews: null,
      allow_force_pushes: { enabled: true },
    }));
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining([
      "required checks: database, e2e",
      "branch must be up to date before merge",
      "protection applies to administrators",
      "changes require a pull request",
      "force pushes disabled",
    ]));
  });

  it("rejects required checks that have never run on main", () => {
    expect(() => validateObservedChecks(requiredMainChecks, ["verify", "database"]))
      .toThrow("e2e");
    expect(validateObservedChecks(requiredMainChecks, ["deploy", ...requiredMainChecks])).toBe(true);
  });

  it("rejects an approval policy without enough independent collaborators", () => {
    const collaborators = [{ login: "owner", permissions: { admin: true, push: true } }];
    expect(() => validateApprovalCapacity(1, collaborators, "owner")).toThrow(
      "0 independent collaborator(s)",
    );
    expect(validateApprovalCapacity(0, collaborators, "owner")).toBe(true);
  });
});
