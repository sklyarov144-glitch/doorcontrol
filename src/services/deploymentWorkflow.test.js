import fs from "node:fs";
import { describe, expect, it } from "vitest";

const stagingWorkflow = fs.readFileSync(".github/workflows/deploy-staging.yml", "utf8");
const workflowSources = fs.readdirSync(".github/workflows")
  .filter((name) => name.endsWith(".yml"))
  .map((name) => fs.readFileSync(`.github/workflows/${name}`, "utf8"))
  .join("\n");

describe("staging deployment workflow", () => {
  it("runs only after successful CI and deploys the verified commit", () => {
    expect(stagingWorkflow).toContain("workflow_run:");
    expect(stagingWorkflow).toContain("workflows: [CI]");
    expect(stagingWorkflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(stagingWorkflow).toContain("ref: ${{ env.RELEASE_SHA }}");
  });

  it("fails instead of silently skipping missing infrastructure or role smoke", () => {
    expect(stagingWorkflow).not.toContain("deployment skipped");
    expect(stagingWorkflow).not.toContain("Auth role smoke skipped");
    expect(stagingWorkflow).toContain("Auth role smoke is required for staging");
    expect(stagingWorkflow).toMatch(/Auth role smoke is required[\s\S]+exit 1/);
  });
});

describe("GitHub Actions runtime", () => {
  it("uses the current Node 24 action runtime", () => {
    expect(workflowSources).not.toMatch(/actions\/(checkout|setup-node)@v4/);
    expect(workflowSources).toContain("actions/checkout@v7");
    expect(workflowSources).toContain("actions/setup-node@v7");
  });
});
