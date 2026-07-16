import { describe, expect, it } from "vitest";
import { createImportExecutionEvidence, parseImportExecutionConfig } from "./importExecution";

const companyId = "10000000-0000-4000-8000-000000000001";
const sourceSha256 = "a".repeat(64);
const values = {
  IMPORT_TARGET: "STAGING",
  IMPORT_CONFIRM: `STAGING:${companyId}:${sourceSha256.slice(0, 12)}`,
  SUPABASE_COMPANY_ID: companyId,
  SUPABASE_PROJECT_ID: "abcdefghijklmnopqrst",
  SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  IMPORT_EVIDENCE_PATH: "/tmp/import-evidence.json",
  RELEASE_SHA: "b".repeat(40),
};

describe("pilot import execution", () => {
  it("keeps dry-run independent from hosted credentials", () => {
    expect(parseImportExecutionConfig({}, { apply: false, sourceSha256 })).toEqual({ apply: false });
  });

  it("requires exact target, company and source confirmation", () => {
    expect(() => parseImportExecutionConfig({ ...values, IMPORT_CONFIRM: "STAGING" }, {
      apply: true, allowUnassigned: false, sourceSha256,
    })).toThrow(`STAGING:${companyId}`);
  });

  it("rejects cross-project URLs and unassigned production imports", () => {
    expect(() => parseImportExecutionConfig({ ...values, SUPABASE_URL: "https://bbbbbbbbbbbbbbbbbbbb.supabase.co" }, {
      apply: true, allowUnassigned: false, sourceSha256,
    })).toThrow("match SUPABASE_PROJECT_ID");
    expect(() => parseImportExecutionConfig({ ...values, IMPORT_TARGET: "PRODUCTION" }, {
      apply: true, allowUnassigned: true, sourceSha256,
    })).toThrow("forbidden");
  });

  it("creates evidence only when all applied counts match", () => {
    const config = parseImportExecutionConfig(values, { apply: true, allowUnassigned: false, sourceSha256 });
    const counts = { objects: 1, buildings: 3, floors: 33, doors: 198 };
    expect(createImportExecutionEvidence(config, counts, counts, "2026-07-16T12:00:00Z")).toMatchObject({
      environment: "staging", result: "passed", expectedCounts: counts, appliedCounts: counts,
    });
    expect(() => createImportExecutionEvidence(config, counts, { ...counts, doors: 197 })).toThrow("doors");
  });
});
