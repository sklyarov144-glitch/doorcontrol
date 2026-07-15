import { describe, expect, it } from "vitest";
import { requiredUatScenarios, validateUatEvidence } from "./uatEvidence";

function validEvidence() {
  return {
    environment: "staging",
    releaseSha: "a".repeat(40),
    appUrl: "https://staging.gross.example",
    scenarios: requiredUatScenarios.map((id) => ({ id, status: "pass", executedBy: "Tester", executedAt: "2026-07-15T12:00:00Z" })),
    defects: [],
    signoffs: {
      productOwner: { approved: true, name: "Owner", approvedAt: "2026-07-15T14:00:00Z" },
      itrRepresentative: { approved: true, name: "ITR", approvedAt: "2026-07-15T14:05:00Z" },
    },
  };
}

describe("pilot UAT evidence", () => {
  it("accepts a fully signed successful staging protocol", () => {
    expect(validateUatEvidence(validEvidence())).toEqual({ valid: true, errors: [], passed: requiredUatScenarios.length });
  });

  it("rejects missing scenarios and open critical defects", () => {
    const evidence = validEvidence();
    evidence.scenarios.pop();
    evidence.defects.push({ id: "DEF-1", severity: "critical", status: "open" });
    const result = validateUatEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/scenario .* is missing/);
    expect(result.errors.join(" ")).toContain("critical defect DEF-1 is not closed");
  });

  it("rejects unsigned or failed acceptance", () => {
    const evidence = validEvidence();
    evidence.scenarios[0].status = "fail";
    evidence.signoffs.itrRepresentative.approved = false;
    const result = validateUatEvidence(evidence);
    expect(result.errors.join(" ")).toContain("must pass");
    expect(result.errors.join(" ")).toContain("itrRepresentative sign-off is incomplete");
  });

  it("binds acceptance to the expected staging SHA", () => {
    const evidence = validEvidence();
    const result = validateUatEvidence(evidence, "b".repeat(40));
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("does not match expected staging release");
  });
});
