import { describe, expect, it } from "vitest";
import { createStagingReleaseEvidence, validateStagingReleaseEvidence } from "./stagingReleaseEvidence";

const valid = {
  releaseSha: "a".repeat(40),
  supabaseProjectId: "abcdefghijklmnopqrst",
  deployUrl: "https://gross-preview.vercel.app",
  canonicalUrl: "https://staging.gross.example",
  githubRunId: "22",
  githubRunUrl: "https://github.com/acme/gross/actions/runs/22",
  sourceCiRunId: "21",
  sourceCiRunUrl: "https://github.com/acme/gross/actions/runs/21",
  deployedAt: "2026-07-16T14:00:00.000Z",
  deployedBy: "release-bot",
  repository: "acme/gross",
  sentryEvidence: {
    configured: true,
    accepted: true,
    environment: "staging",
    release: "a".repeat(40),
    eventId: "event-1",
    projectId: "42",
    checkedAt: "2026-07-16T14:01:00.000Z",
  },
};

describe("staging release evidence", () => {
  it("records an immutable production-eligible staging release", () => {
    const result = createStagingReleaseEvidence(valid);
    expect(result.productionEligible).toBe(true);
    expect(result.sourceCiRunId).toBe("21");
    expect(result.checks.sentryIngestion).toBe("passed");
    expect(Object.values(result.checks).every((value) => value === "passed")).toBe(true);
  });

  it("marks manual staging and missing Sentry explicitly", () => {
    const result = createStagingReleaseEvidence({
      ...valid,
      sourceCiRunId: "",
      sourceCiRunUrl: "",
      sentryEvidence: {
        configured: false,
        environment: "staging",
        release: valid.releaseSha,
        checkedAt: "2026-07-16T14:01:00.000Z",
      },
    });
    expect(result.productionEligible).toBe(false);
    expect(result.sourceCiRunId).toBeNull();
    expect(result.checks.sentryIngestion).toBe("not_configured");
    expect(result.productionEligibilityReasons).toEqual(["missing_source_ci", "sentry_not_verified"]);
  });

  it("blocks a CI-linked release until staging monitoring is verified", () => {
    const result = createStagingReleaseEvidence({
      ...valid,
      sentryEvidence: {
        configured: false,
        environment: "staging",
        release: valid.releaseSha,
        checkedAt: "2026-07-16T14:01:00.000Z",
      },
    });
    expect(result.productionEligible).toBe(false);
    expect(result.sourceCiRunId).toBe("21");
    expect(result.sourceCiRunUrl).toBe(valid.sourceCiRunUrl);
    expect(result.productionEligibilityReasons).toEqual(["sentry_not_verified"]);
  });

  it("rejects mismatched monitoring evidence and mutable release ids", () => {
    expect(() => createStagingReleaseEvidence({ ...valid, releaseSha: "main" })).toThrow("full commit SHA");
    expect(() => createStagingReleaseEvidence({
      ...valid,
      sentryEvidence: { ...valid.sentryEvidence, release: "b".repeat(40) },
    })).toThrow("does not match");
  });

  it("validates the artifact against the exact production request", () => {
    const evidence = createStagingReleaseEvidence(valid);
    expect(validateStagingReleaseEvidence(evidence, {
      releaseSha: valid.releaseSha,
      githubRunId: valid.githubRunId,
      githubRunUrl: valid.githubRunUrl,
    })).toEqual({ valid: true, errors: [] });

    const drifted = { ...evidence, checks: { ...evidence.checks, fourRoleUiSmoke: "failed" } };
    const result = validateStagingReleaseEvidence(drifted, { releaseSha: "b".repeat(40), githubRunId: "99" });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/releaseSha does not match/);
    expect(result.errors.join(" ")).toMatch(/githubRunId does not match/);
    expect(result.errors.join(" ")).toMatch(/fourRoleUiSmoke must pass/);
  });
});
