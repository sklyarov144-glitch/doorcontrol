import { spawnSync } from "node:child_process";
import { auditEnvironmentInventory } from "../src/services/githubEnvironmentAudit.js";

const repository = process.env.GITHUB_REPOSITORY?.trim() || "sklyarov144-glitch/doorcontrol";
const requested = process.argv.find((value) => ["staging", "production"].includes(value));
const environments = requested ? [requested] : ["staging", "production"];
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

let failed = false;
for (const environment of environments) {
  const audit = auditEnvironmentInventory(environment, {
    secrets: listNames("secret", environment),
    variables: listNames("variable", environment),
  });
  console.log(`${environment}: ${audit.ready ? "required inventory complete" : "not ready"}`);
  if (audit.missingSecrets.length) console.log(`  missing secrets: ${audit.missingSecrets.join(", ")}`);
  if (audit.missingVariables.length) console.log(`  missing variables: ${audit.missingVariables.join(", ")}`);
  for (const warning of audit.warnings) console.log(`  warning: ${warning}`);
  failed ||= !audit.ready;
}

if (strict && failed) process.exitCode = 1;
