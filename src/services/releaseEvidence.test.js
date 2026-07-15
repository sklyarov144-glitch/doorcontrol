import { describe, expect, it } from "vitest";
import { createReleaseEvidence } from "./releaseEvidence";

const valid = {
  releaseSha: "a".repeat(40),
  supabaseProjectId: "abcdefghijklmnopqrst",
  deployUrl: "https://gross-abc.vercel.app",
  canonicalUrl: "https://app.gross.example",
  stagingRunUrl: "https://github.com/acme/gross/actions/runs/10",
  stagingRunId: "10",
  githubRunId: "11",
  deployedAt: "2026-07-15T16:00:00.000Z",
  deployedBy: "release-manager",
  repository: "acme/gross",
};

describe("production release evidence", () => {
  it("records immutable release identity and completed checks", () => {
    const result = createReleaseEvidence(valid);
    expect(result.environment).toBe("production");
    expect(result.releaseSha).toBe(valid.releaseSha);
    expect(Object.values(result.checks)).toEqual(expect.arrayContaining(["passed"]));
    expect(Object.values(result.checks).every((value) => value === "passed")).toBe(true);
  });

  it("rejects mutable refs and non-HTTPS evidence URLs", () => {
    expect(() => createReleaseEvidence({ ...valid, releaseSha: "main" })).toThrow("full commit SHA");
    expect(() => createReleaseEvidence({ ...valid, canonicalUrl: "http://localhost:5173" })).toThrow("HTTPS");
  });
});
