import fs from "node:fs";
import { createStagingReleaseEvidence } from "../src/services/stagingReleaseEvidence.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const outputPath = process.argv[2] ?? "staging-release-evidence.json";
const sentryPath = process.env.SENTRY_EVIDENCE_PATH ?? "sentry-smoke-evidence.json";
const repository = required("GITHUB_REPOSITORY");
const githubRunId = required("GITHUB_RUN_ID");
const sourceCiRunId = process.env.SOURCE_CI_RUN_ID?.trim() ?? "";
const serverUrl = required("GITHUB_SERVER_URL");
const evidence = createStagingReleaseEvidence({
  releaseSha: required("RELEASE_SHA"),
  supabaseProjectId: required("SUPABASE_PROJECT_ID"),
  deployUrl: required("DEPLOY_URL"),
  canonicalUrl: required("APP_PUBLIC_URL"),
  githubRunId,
  githubRunUrl: `${serverUrl}/${repository}/actions/runs/${githubRunId}`,
  sourceCiRunId,
  sourceCiRunUrl: sourceCiRunId ? `${serverUrl}/${repository}/actions/runs/${sourceCiRunId}` : "",
  deployedAt: new Date().toISOString(),
  deployedBy: required("GITHUB_ACTOR"),
  repository,
  sentryEvidence: JSON.parse(fs.readFileSync(sentryPath, "utf8")),
});

fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(`Staging release evidence written to ${outputPath}. Production eligible: ${evidence.productionEligible}.`);
