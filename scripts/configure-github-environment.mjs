import { spawnSync } from "node:child_process";
import { environmentRequirements, validateEnvironmentValues } from "../src/services/deploymentEnvironment.js";

const environment = process.argv.find((value) => ["staging", "production"].includes(value));
const apply = process.argv.includes("--apply");
const repository = process.env.GITHUB_REPOSITORY?.trim() || "sklyarov144-glitch/doorcontrol";
if (!environment) throw new Error("Pass staging or production");
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("GITHUB_REPOSITORY is invalid");

const result = validateEnvironmentValues(environment, process.env);
if (!result.valid) {
  if (result.missing.length) throw new Error(`Missing environment values: ${result.missing.join(", ")}`);
  throw new Error(result.errors.join("; "));
}
console.log(`Configuration preflight passed for GitHub Environment ${environment}.`);
console.log(`${result.requirements.secrets.length} secrets and ${result.requirements.variables.length} variables are ready.`);
if (!apply) {
  console.log("Dry run only. Add --apply to update GitHub without printing secret values.");
  process.exit(0);
}

const auth = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
if (auth.status !== 0) throw new Error("Authenticate GitHub CLI with gh auth login before --apply");
for (const name of result.requirements.secrets) {
  const command = spawnSync("gh", ["secret", "set", name, "--repo", repository, "--env", environment], {
    input: process.env[name], encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
  if (command.status !== 0) throw new Error(`Unable to set secret ${name}: ${command.stderr.trim()}`);
}
for (const name of result.requirements.variables) {
  const command = spawnSync("gh", ["variable", "set", name, "--repo", repository, "--env", environment, "--body", process.env[name]], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  if (command.status !== 0) throw new Error(`Unable to set variable ${name}: ${command.stderr.trim()}`);
}
console.log(`GitHub Environment ${environment} configured for ${repository}. Secret values were not printed.`);
