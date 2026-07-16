import { describe, expect, it } from "vitest";
import { findVerifiedStagingRun } from "./releaseProvenance";

const sha = "a".repeat(40);

describe("production release provenance", () => {
  it("accepts a successful staging run for the exact main SHA", () => {
    const result = findVerifiedStagingRun({ workflow_runs: [{
      id: 42, head_sha: sha, head_branch: "main", status: "completed", conclusion: "success",
      event: "workflow_run",
      html_url: "https://github.example/runs/42",
    }] }, sha);
    expect(result).toEqual({ id: 42, url: "https://github.example/runs/42", sha });
  });

  it("rejects failed, non-main and different commits", () => {
    expect(() => findVerifiedStagingRun({ workflow_runs: [
      { head_sha: sha, head_branch: "main", event: "workflow_run", status: "completed", conclusion: "failure" },
      { head_sha: sha, head_branch: "feature", event: "workflow_run", status: "completed", conclusion: "success" },
      { head_sha: "b".repeat(40), head_branch: "main", event: "workflow_run", status: "completed", conclusion: "success" },
    ] }, sha)).toThrow("No successful staging deployment");
  });

  it("rejects a manually dispatched staging run as production provenance", () => {
    expect(() => findVerifiedStagingRun({ workflow_runs: [{
      id: 42, head_sha: sha, head_branch: "main", event: "workflow_dispatch",
      status: "completed", conclusion: "success", html_url: "https://github.example/runs/42",
    }] }, sha)).toThrow("No successful staging deployment");
  });

  it("requires an immutable full commit SHA", () => {
    expect(() => findVerifiedStagingRun({ workflow_runs: [] }, "main")).toThrow("40-character");
  });
});
