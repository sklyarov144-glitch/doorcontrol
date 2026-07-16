import { spawnSync } from "node:child_process";
import { deploymentEnvironments } from "../src/services/deploymentEnvironment.js";
import { auditEnvironmentInventory } from "../src/services/githubEnvironmentAudit.js";

const repository = process.env.GITHUB_REPOSITORY?.trim() || "sklyarov144-glitch/doorcontrol";
const requested = process.argv.find((value) => deploymentEnvironments.includes(value));
const environments = requested ? [requested] : deploymentEnvironments;
const strict = process.argv.includes("--strict");

function listNames(kind, environment) {
  const result = spawnSync("gh", [kind, "list", "--repo", repository, "--env", environment, "--json", "name"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`Unable to inspect ${kind}s for ${environment}: ${result.stderr.trim()}`);
  }
  return JSON.parse(result.stdout).map((item) => item.name);
}

function environmentSettings(environment) {
  const result = spawnSync("gh", ["api", `repos/${repository}/environments/${environment}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    if (/HTTP 404|Not Found/i.test(result.stderr)) return { exists: false, protectionRules: [] };
    throw new Error(`Unable to inspect protection rules for ${environment}: ${result.stderr.trim()}`);
  }
  const settings = JSON.parse(result.stdout);
  const deploymentBranchPolicy = settings.deployment_branch_policy ?? null;
  let branchPolicies = [];
  if (deploymentBranchPolicy?.custom_branch_policies) {
    const policies = spawnSync("gh", [
      "api", `repos/${repository}/environments/${environment}/deployment-branch-policies`,
      "--paginate", "--slurp",
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (policies.status !== 0) {
      throw new Error(`Unable to inspect deployment branch policies for ${environment}: ${policies.stderr.trim()}`);
    }
    branchPolicies = JSON.parse(policies.stdout)
      .flatMap((page) => page.branch_policies ?? [])
      .map(({ name, type }) => ({ name, type }));
  }
  return {
    exists: true,
    protectionRules: settings.protection_rules ?? [],
    canAdminsBypass: settings.can_admins_bypass,
    deploymentBranchPolicy,
    branchPolicies,
  };
}

let failed = false;
for (const environment of environments) {
  const settings = environmentSettings(environment);
  const audit = auditEnvironmentInventory(environment, {
    secrets: settings.exists ? listNames("secret", environment) : [],
    variables: settings.exists ? listNames("variable", environment) : [],
    ...settings,
  });
  console.log(`${environment}: ${audit.ready ? "required inventory complete" : "not ready"}`);
  if (audit.missingSecrets.length) console.log(`  missing secrets: ${audit.missingSecrets.join(", ")}`);
  if (audit.missingVariables.length) console.log(`  missing variables: ${audit.missingVariables.join(", ")}`);
  if (audit.missingProtections.length) console.log(`  missing protections: ${audit.missingProtections.join(", ")}`);
  for (const warning of audit.warnings) console.log(`  warning: ${warning}`);
  failed ||= !audit.ready;
}

if (strict && failed) process.exitCode = 1;
