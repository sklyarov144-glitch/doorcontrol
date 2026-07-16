import { readFileSync } from "node:fs";
import { validateProductionReadinessEvidence } from "../../src/services/pilot/productionReadiness.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function readJson(name) {
  return JSON.parse(readFileSync(required(name), "utf8"));
}

const releaseSha = required("EXPECTED_RELEASE_SHA");
const result = validateProductionReadinessEvidence({
  uat: readJson("UAT_EVIDENCE_PATH"),
  reconciliation: readJson("PILOT_RECONCILIATION_EVIDENCE_PATH"),
  restore: readJson("RESTORE_EVIDENCE_PATH"),
}, releaseSha);

if (!result.valid) {
  result.errors.forEach((error) => console.error(`NOT READY ${error}`));
  throw new Error(`Production readiness failed with ${result.errors.length} error(s)`);
}
console.log(`Production readiness evidence passed for release ${releaseSha}.`);
console.log("Checks passed: signed UAT, exact pilot reconciliation, fresh restore drill.");
