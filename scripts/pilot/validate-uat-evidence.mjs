import fs from "node:fs";
import { validateUatEvidence } from "../../src/services/pilot/uatEvidence.js";

const inputPath = process.argv.find((value) => value.endsWith(".json"));
if (!inputPath) throw new Error("Pass the UAT evidence JSON path");
const evidence = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const expectedReleaseSha = process.env.EXPECTED_RELEASE_SHA?.trim().toLowerCase();
const result = validateUatEvidence(evidence, expectedReleaseSha);
if (!result.valid) {
  result.errors.forEach((error) => console.error(`UAT ${error}`));
  process.exit(1);
}
console.log(`UAT evidence is valid: ${result.passed} required scenarios passed and both sign-offs are present.`);
