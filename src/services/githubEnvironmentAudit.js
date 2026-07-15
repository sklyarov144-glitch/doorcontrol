import { environmentRequirements } from "./deploymentEnvironment.js";

export function auditEnvironmentInventory(environment, inventory) {
  const requirements = environmentRequirements(environment);
  const secrets = new Set(inventory.secrets ?? []);
  const variables = new Set(inventory.variables ?? []);
  const missingSecrets = requirements.secrets.filter((name) => !secrets.has(name));
  const missingVariables = requirements.variables.filter((name) => !variables.has(name));
  const warnings = [];

  if (environment === "staging" && !secrets.has("VITE_SENTRY_DSN")) {
    warnings.push("VITE_SENTRY_DSN is not configured; staging frontend errors are not monitored in Sentry.");
  }

  return {
    environment,
    ready: missingSecrets.length === 0 && missingVariables.length === 0,
    missingSecrets,
    missingVariables,
    warnings,
  };
}
