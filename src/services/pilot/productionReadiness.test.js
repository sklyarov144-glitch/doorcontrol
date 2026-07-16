import { describe, expect, it } from "vitest";
import { requiredUatScenarios } from "./uatEvidence";
import { validateProductionReadinessEvidence, validateRestoreEvidence } from "./productionReadiness";

const releaseSha = "a".repeat(40);
const now = new Date("2026-07-16T12:00:00Z");

function evidence() {
  const counts = { companies: 1, profiles: 4, objects: 1, buildings: 3, floors: 33, doors: 198, tasks: 2, documents: 1, storageObjects: 1 };
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
      supabaseProjectId: "abcdefghijklmnopqrst", companyId: "company-1", sourceSha256: "b".repeat(64),
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
  };
}

describe("production readiness evidence", () => {
  it("accepts exact signed UAT, reconciled pilot data and a fresh restore", () => {
    expect(validateProductionReadinessEvidence(evidence(), releaseSha, { now })).toEqual({
      valid: true, errors: [], checks: { uat: true, reconciliation: true, restore: true },
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
});
