import fs from "node:fs";
import { createReleaseEvidence } from "../src/services/releaseEvidence.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const outputPath = process.argv[2] ?? "release-evidence.json";
const evidence = createReleaseEvidence({
  releaseSha: required("RELEASE_SHA"),
  supabaseProjectId: required("SUPABASE_PROJECT_ID"),
  deployUrl: required("DEPLOY_URL"),
  canonicalUrl: required("APP_PUBLIC_URL"),
  stagingRunUrl: required("STAGING_RUN_URL"),
  stagingRunId: required("STAGING_RUN_ID"),
  githubRunId: required("GITHUB_RUN_ID"),
  deployedAt: new Date().toISOString(),
  deployedBy: required("GITHUB_ACTOR"),
  repository: required("GITHUB_REPOSITORY"),
});
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(`Release evidence written to ${outputPath}.`);
