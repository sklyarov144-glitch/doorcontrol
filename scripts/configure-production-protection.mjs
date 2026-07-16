import { spawnSync } from "node:child_process";
import {
  buildProductionEnvironmentPayload,
  validateProductionProtectionInput,
  verifyProductionProtection,
} from "../src/services/productionProtection.js";

const apply = process.argv.includes("--apply");
const input = validateProductionProtectionInput(process.env, { apply });

function githubApi(path, options = {}) {
  const args = ["api", path, "-H", "X-GitHub-Api-Version: 2026-03-10", ...(options.args ?? [])];
  const result = spawnSync("gh", args, {
    input: options.input,
    encoding: "utf8",
    stdio: [options.input ? "pipe" : "ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error(`GitHub API request failed: ${result.stderr.trim()}`);
  return result.stdout ? JSON.parse(result.stdout) : null;
}

console.log(`Production protection target: ${input.repository}`);
console.log(`Required reviewers: ${input.reviewerList}`);
console.log("Self-review will be disabled. Existing wait timer and deployment branch policy will be preserved.");
if (!apply) {
  console.log(`Dry run only. To apply, set PRODUCTION_PROTECTION_CONFIRM=${input.expectedConfirmation} and add --apply.`);
  process.exit(0);
}

const auth = spawnSync("gh", ["auth", "status"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
if (auth.status !== 0) throw new Error("Authenticate GitHub CLI with gh auth login before --apply");

const path = `repos/${input.repository}/environments/production`;
const current = githubApi(path);
const payload = buildProductionEnvironmentPayload(current, input.reviewers);
githubApi(path, { args: ["--method", "PUT", "--input", "-"], input: JSON.stringify(payload) });

const updated = githubApi(path);
const verification = verifyProductionProtection(updated, input.reviewers);
if (!verification.apiConfigurationReady) {
  throw new Error(`GitHub did not persist the required API protection: ${verification.missing.join(", ")}`);
}

console.log("Required reviewers and self-review protection are configured and verified.");
if (!verification.ready) {
  console.error("Production is still fail-closed: disable administrator bypass in GitHub Settings > Environments > production, then run npm run deployment:audit -- production --strict.");
  process.exitCode = 2;
} else {
  console.log("Production approval gate is complete, including disabled administrator bypass.");
}
