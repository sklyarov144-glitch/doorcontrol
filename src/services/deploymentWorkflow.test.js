import fs from "node:fs";
import { describe, expect, it } from "vitest";

const stagingWorkflow = fs.readFileSync(".github/workflows/deploy-staging.yml", "utf8");
const productionWorkflow = fs.readFileSync(".github/workflows/deploy-production.yml", "utf8");
const backupWorkflow = fs.readFileSync(".github/workflows/backup-production.yml", "utf8");
const restoreWorkflow = fs.readFileSync(".github/workflows/restore-drill.yml", "utf8");
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

  it("applies and verifies hosted Auth before running role smoke", () => {
    expect(stagingWorkflow).toContain("npm run supabase:auth:configure");
    expect(stagingWorkflow.indexOf("npm run supabase:auth:configure"))
      .toBeLessThan(stagingWorkflow.indexOf("npm run auth:smoke"));
  });

  it("bundles Edge Functions through the Supabase API without Docker registry dependency", () => {
    expect(stagingWorkflow).toContain("supabase functions deploy --use-api");
  });

  it("smokes the canonical staging origin and pins it to the release SHA", () => {
    expect(stagingWorkflow).toContain('SMOKE_URL="$APP_PUBLIC_URL"');
    expect(stagingWorkflow).toContain('SMOKE_EXPECT_RELEASE="$RELEASE_SHA"');
    expect(stagingWorkflow).not.toContain('SMOKE_URL="$DEPLOY_URL"');
    expect(stagingWorkflow).toContain("vercel pull --yes --environment=production");
    expect(stagingWorkflow).toContain("vercel build --prod");
    expect(stagingWorkflow).toContain("vercel deploy --prebuilt --prod");
  });

  it("resolves CI provenance when staging is dispatched manually", () => {
    expect(stagingWorkflow).toContain("actions: read");
    expect(stagingWorkflow).toContain("Resolve source CI run for manual dispatch");
    expect(stagingWorkflow).toContain('echo "SOURCE_CI_RUN_ID=$source_ci_run_id" >> "$GITHUB_ENV"');
    expect(stagingWorkflow).toContain("No successful CI run found for $RELEASE_SHA");
  });
});

describe("GitHub Actions runtime", () => {
  it("uses the current Node 24 action runtime", () => {
    expect(workflowSources).not.toMatch(/actions\/(checkout|setup-node)@v4/);
    expect(workflowSources).toContain("actions/checkout@v7");
    expect(workflowSources).toContain("actions/setup-node@v7");
  });
});

describe("production deployment workflow", () => {
  it("deploys only a full SHA that has a successful staging release", () => {
    expect(productionWorkflow).toContain("release_sha:");
    expect(productionWorkflow).toContain("actions: read");
    expect(productionWorkflow).toContain("node scripts/verify-release-provenance.mjs");
    expect(productionWorkflow).toContain('git checkout --detach "$RELEASE_SHA"');
    expect(productionWorkflow).toContain("VITE_APP_RELEASE: ${{ env.RELEASE_SHA }}");
    expect(productionWorkflow).toContain('SMOKE_URL="$APP_PUBLIC_URL"');
    expect(productionWorkflow).toContain('SMOKE_EXPECT_RELEASE="$RELEASE_SHA"');
    expect(productionWorkflow).toContain("node scripts/create-release-evidence.mjs");
    expect(productionWorkflow).toContain("production-release-${{ env.RELEASE_SHA }}");
    expect(productionWorkflow).toContain("Smoke test four authenticated production roles");
    expect(productionWorkflow).toContain("Load smoke authenticated production ITR domain");
    expect(productionWorkflow).toContain("Verify production readiness evidence");
    expect(productionWorkflow).toContain("EXPECTED_RELEASE_SHA: ${{ env.RELEASE_SHA }}");
    expect(productionWorkflow).toContain("UAT_EVIDENCE_JSON: ${{ secrets.UAT_EVIDENCE_JSON }}");
    expect(productionWorkflow).toContain("PILOT_RECONCILIATION_EVIDENCE_JSON: ${{ secrets.PILOT_RECONCILIATION_EVIDENCE_JSON }}");
    expect(productionWorkflow).toContain("RESTORE_EVIDENCE_JSON: ${{ secrets.RESTORE_EVIDENCE_JSON }}");
    expect(productionWorkflow).toContain("npm run pilot:production-readiness");
    expect(productionWorkflow).toContain("npm run supabase:auth:configure");
    expect(productionWorkflow).toContain("supabase functions deploy --use-api");
  });
});

describe("production backup isolation", () => {
  it("does not let release approval block scheduled backup and isolates restore approval", () => {
    expect(backupWorkflow).toContain("environment: production-backup");
    expect(backupWorkflow).not.toContain("environment: production\n");
    expect(restoreWorkflow).toContain("environment: production-restore");
    expect(restoreWorkflow).not.toContain("environment: production\n");
  });
});
