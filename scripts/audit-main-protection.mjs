import { spawnSync } from "node:child_process";
import {
  auditMainProtection,
  validateMainProtectionInput,
} from "../src/services/branchProtection.js";

const strict = process.argv.includes("--strict");
const input = validateMainProtectionInput(process.env);

const result = spawnSync("gh", [
  "api",
  `repos/${input.repository}/branches/${input.branch}/protection`,
  "-H",
  "X-GitHub-Api-Version: 2026-03-10",
], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

let protection = null;
if (result.status === 0) {
  protection = JSON.parse(result.stdout);
} else if (!/HTTP 404|Branch not protected|Not Found/i.test(result.stderr)) {
  throw new Error(`Unable to inspect main branch protection: ${result.stderr.trim()}`);
}

const audit = auditMainProtection(protection, {
  approvalCount: input.approvalCount,
  checks: input.checks,
});

console.log(`${input.repository}/${input.branch}: ${audit.ready ? "protected" : "not production-ready"}`);
if (audit.missing.length) console.log(`  missing protections: ${audit.missing.join(", ")}`);
if (strict && !audit.ready) process.exitCode = 1;
