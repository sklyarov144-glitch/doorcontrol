import { spawnSync } from "node:child_process";
import {
  auditMainProtection,
  buildMainProtectionPayload,
  validateApprovalCapacity,
  validateMainProtectionInput,
  validateObservedChecks,
} from "../src/services/branchProtection.js";

const apply = process.argv.includes("--apply");
const input = validateMainProtectionInput(process.env, { apply });

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

const repository = githubApi(`repos/${input.repository}`);
if (repository.default_branch !== input.branch) {
  throw new Error(`${input.branch} is not the repository default branch`);
}

const checksResponse = githubApi(`repos/${input.repository}/commits/${input.branch}/check-runs`);
const observedChecks = (checksResponse.check_runs ?? []).map((check) => check.name);
validateObservedChecks(input.checks, observedChecks);

const actor = githubApi("user").login;
const collaborators = githubApi(`repos/${input.repository}/collaborators?affiliation=direct&per_page=100`);
validateApprovalCapacity(input.approvalCount, collaborators, actor);

console.log(`Protection target: ${input.repository} / ${input.branch}`);
console.log(`Required checks: ${input.checks.join(", ")}`);
console.log(`Required independent approvals: ${input.approvalCount}`);
console.log("Pull requests, current branch, linear history and resolved conversations will be required.");
console.log("The policy applies to administrators; force pushes and branch deletion will be disabled.");

if (!apply) {
  console.log(`Dry run only. To apply, set BRANCH_PROTECTION_CONFIRM=${input.expectedConfirmation} and add --apply.`);
  process.exit(0);
}

const payload = buildMainProtectionPayload(input);
githubApi(`repos/${input.repository}/branches/${input.branch}/protection`, {
  args: ["--method", "PUT", "--input", "-"],
  input: JSON.stringify(payload),
});

const updated = githubApi(`repos/${input.repository}/branches/${input.branch}/protection`);
const audit = auditMainProtection(updated, input);
if (!audit.ready) {
  throw new Error(`GitHub did not persist the required branch protection: ${audit.missing.join(", ")}`);
}
console.log(`${input.branch} branch protection is configured and verified.`);
