import fs from "node:fs";
import { validateStagingReleaseEvidence } from "../src/services/stagingReleaseEvidence.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const inputPath = process.argv.find((value) => value.endsWith(".json"));
if (!inputPath) throw new Error("Pass the staging release evidence JSON path");
const evidence = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const result = validateStagingReleaseEvidence(evidence, {
  releaseSha: required("RELEASE_SHA"),
  githubRunId: required("STAGING_RUN_ID"),
  githubRunUrl: required("STAGING_RUN_URL"),
});

if (!result.valid) {
  result.errors.forEach((error) => console.error(`Staging evidence: ${error}`));
  process.exit(1);
}
console.log(`Verified production-eligible staging evidence for ${evidence.releaseSha}.`);
