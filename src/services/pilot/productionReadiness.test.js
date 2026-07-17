import { describe, expect, it } from "vitest";
import { requiredUatScenarios } from "./uatEvidence";
import { validateProductionReadinessEvidence, validateRestoreEvidence } from "./productionReadiness";

const releaseSha = "a".repeat(40);
const now = new Date("2026-07-16T12:00:00Z");

function evidence() {
  const counts = { companies: 1, profiles: 4, objects: 1, buildings: 3, floors: 33, doors: 198, tasks: 2, documents: 1, storageObjects: 1 };
  const sourceSha256 = "b".repeat(64);
  return {
    uat: {
      environment: "staging", releaseSha, appUrl: "https://staging.gross.example",
      scenarios: requiredUatScenarios.map((id) => ({ id, status: "pass", executedBy: "Tester", executedAt: "2026-07-15T10:00:00Z" })),
      defects: [],
      signoffs: {
        productOwner: { approved: true, name: "Owner", approvedAt: "2026-07-15T12:00:00Z" },
        itrRepresentative: { approved: true, name: "ITR", approvedAt: "2026-07-15T12:05:00Z" },
      },
    },
    reconciliation: {
      schemaVersion: 1, environment: "staging", releaseSha, generatedAt: "2026-07-15T11:00:00Z",
      supabaseProjectId: "abcdefghijklmnopqrst", companyId: "company-1", sourceSha256,
      valid: true, mismatchCount: 0,
      expectedCounts: { objects: 1, buildings: 3, floors: 33, doors: 198 },
      actualCounts: { objects: 1, buildings: 3, floors: 33, doors: 198 },
    },
    restore: {
      version: 1, result: "passed", backupRunId: 123, archiveSha256: "c".repeat(64),
      restoreTarget: "isolated-local-supabase", startedAt: "2026-07-15T09:00:00Z",
      completedAt: "2026-07-15T09:05:00Z", durationSeconds: 300, sourceRows: counts,
      restoredRows: { ...counts }, countsMatch: true,
    },
    handoff: {
      version: 1, environment: "production", releaseSha,
      productionUrl: "https://gross.example.ru", repository: "gross/app", companyName: "ООО ГРОСС",
      owners: {
        businessOwner: { name: "Business", email: "business@gross.example" },
        technicalOwner: { name: "Tech", email: "tech@gross.example", githubLogin: "gross-tech" },
        dataOwner: { name: "Data", email: "data@gross.example" },
        supportOwner: { name: "Support", email: "support@gross.example", phone: "+7 999 000-00-00" },
        releaseReviewer: { name: "Review", email: "review@gross.example", githubLogin: "gross-review" },
      },
      pilot: {
        sourceSha256, expectedCounts: { objects: 1, buildings: 3, floors: 33, doors: 198 },
        dataFrozenAt: "2026-07-15T08:00:00Z",
      },
      releaseWindow: { startsAt: "2026-07-16T10:00:00Z", endsAt: "2026-07-16T14:00:00Z" },
      approvals: {
        businessOwner: { approved: true, approvedByEmail: "business@gross.example", approvedAt: "2026-07-15T12:10:00Z" },
        technicalOwner: { approved: true, approvedByEmail: "tech@gross.example", approvedAt: "2026-07-15T12:15:00Z" },
        dataOwner: { approved: true, approvedByEmail: "data@gross.example", approvedAt: "2026-07-15T12:20:00Z" },
      },
      operations: {
        runbookAcknowledged: true, rollbackPlanAcknowledged: true,
        backupOwnerEmail: "tech@gross.example", supportEmail: "support@gross.example",
      },
    },
  };
}

describe("production readiness evidence", () => {
  it("accepts exact signed UAT, reconciled pilot data and a fresh restore", () => {
    expect(validateProductionReadinessEvidence(evidence(), releaseSha, {
      now, expectedProductionUrl: "https://gross.example.ru", repository: "gross/app",
    })).toEqual({
      valid: true, errors: [], checks: { uat: true, reconciliation: true, restore: true, handoff: true },
    });
  });

  it("rejects a stale restore drill", () => {
    const input = evidence();
    input.restore.startedAt = "2026-05-01T09:00:00Z";
    input.restore.completedAt = "2026-05-01T09:05:00Z";
    expect(validateRestoreEvidence(input.restore, { now }).errors.join(" ")).toContain("older than 30 days");
  });

  it("rejects release drift and reconciliation mismatches", () => {
    const input = evidence();
    input.reconciliation.actualCounts.doors = 197;
    const result = validateProductionReadinessEvidence(input, "d".repeat(40), { now });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("requested production release");
    expect(result.errors.join(" ")).toContain("count doors must be positive and equal");
  });

  it("rejects a handoff that is not bound to the release and reconciled import", () => {
    const input = evidence();
    input.handoff.releaseSha = "d".repeat(40);
    input.handoff.pilot.expectedCounts.doors = 197;
    const result = validateProductionReadinessEvidence(input, releaseSha, { now });
    expect(result.valid).toBe(false);
    expect(result.checks.handoff).toBe(false);
    expect(result.errors.join(" ")).toContain("handoff: releaseSha does not match");
    expect(result.errors.join(" ")).toContain("handoff: pilot.expectedCounts.doors does not match");
  });
});
